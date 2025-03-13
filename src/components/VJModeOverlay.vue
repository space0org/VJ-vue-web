<template>
  <div class="relative">
   <div 
      ref="vjContainer" 
     :class="[
        'vj-overlay fixed inset-0 transition-all duration-300 ease-in-out bg-black',
        isActive ? 'z-[9999] opacity-100 vj-active' : 'z-[-1] opacity-0 pointer-events-none'
      ]"
    >
      <!-- Overlay container for all visualizations -->
      <div class="absolute inset-0 opacity-80">
        <!-- Waveform visualization layer -->
        <canvas 
          ref="waveformCanvas" 
          class="absolute inset-0 w-full h-full"
        ></canvas>
      </div>
      
      <!-- Particle visualization layer -->
      <div 
        ref="particleContainer" 
        class="absolute inset-0 w-full h-full"
      ></div>
      
      <!-- Frequency visualization layer -->
      <canvas 
        ref="frequencyCanvas" 
        class="absolute inset-0 w-full h-full"
      ></canvas>
      
      <!-- Controls overlay - only visible when mouse moves -->
      <div 
        v-if="showControls"
        class="absolute bottom-0 left-0 right-0 p-4 bg-black/50 transition-opacity duration-300"
        :class="controlsVisible ? 'opacity-100' : 'opacity-0'"
      >
        <div class="flex flex-col gap-4">
          <!-- Layer toggles -->
          <div class="flex justify-between items-center">
            <div class="flex gap-2">
              <button 
                v-for="layer in layers" 
                :key="layer.id"
                @click="toggleLayer(layer.id)"
                :class="[
                  'px-3 py-1 rounded-lg text-sm font-medium transition-colors',
                  layer.active ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                ]"
              >
                {{ layer.name }}
              </button>
            </div>
            
            <div class="flex gap-2">
              <button 
                @click="$emit('close')"
                class="p-2 bg-red-500/30 hover:bg-red-500/50 rounded-full transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
          
          <!-- Style selection -->
          <div class="flex flex-wrap gap-2 justify-center">
            <button 
              v-for="style in visualizationStyles" 
              :key="style.id"
              @click="setActiveStyle(style.id)"
              :class="[
                'px-3 py-1 rounded-lg text-sm font-medium transition-colors',
                activeStyle === style.id ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              ]"
            >
              {{ style.name }}
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- VJ Mode Button -->
    <button 
      v-if="!isActive && showButton"
      @click="activate"
      class="fixed bottom-4 left-4 z-40 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg shadow-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="23 7 16 12 23 17 23 7"></polygon>
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
      </svg>
      VJモード
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import p5 from 'p5'

const props = defineProps({
  audioAnalyser: {
    type: Object,
    required: false,
    default: null,
    validator: (value) => {
      console.log('VJModeOverlay: Validating audioAnalyser:', value)
      if (!value) return true // Allow null value
      return typeof value.getByteFrequencyData === 'function' && 
             typeof value.frequencyBinCount === 'number'
    }
  },
  theme: {
    type: String,
    default: 'default'
  },
  showButton: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const vjContainer = ref(null)
const waveformCanvas = ref(null)
const frequencyCanvas = ref(null)
const particleContainer = ref(null)
// Use local isActive state that syncs with props
const isActive = ref(props.isActive)
const showControls = ref(true)
const controlsVisible = ref(true)
let controlsTimeout = null

// Visualization layers
const layers = ref([
  { id: 'waveform', name: '波形', active: true },
  { id: 'particles', name: 'パーティクル', active: true },
  { id: 'frequency', name: '周波数', active: true }
])

// Visualization styles
const visualizationStyles = ref([
  { id: 'default', name: 'デフォルト', active: true },
  { id: 'rainbow', name: '虹色グラデーション', active: false },
  { id: 'circular', name: '円形波形', active: false },
  { id: 'geometric', name: '幾何学パターン', active: false },
  { id: 'particles3d', name: 'パーティクルシステム', active: false },
  { id: 'wireframe3d', name: '3Dワイヤーフレーム', active: false }
])

// Current active style
const activeStyle = ref('default')

// Animation IDs
let waveformAnimationId = null
let frequencyAnimationId = null
let p5Instance = null

// Data arrays
let waveformDataArray = null
let frequencyDataArray = null

// Theme colors with time-based transitions
const getThemeColors = (theme) => {
  // Get time-based offset for color cycling
  const timeOffset = Date.now() * 0.0001 % 360
  
  let colors
  switch (theme) {
    case 'cool':
      colors = { hueStart: 180, hueEnd: 240 }
      break
    case 'warm':
      colors = { hueStart: 0, hueEnd: 60 }
      break
    case 'forest':
      colors = { hueStart: 90, hueEnd: 150 }
      break
    case 'sunset':
      colors = { hueStart: 0, hueEnd: 60, saturation: 100, brightness: 100 }
      break
    default:
      colors = { hueStart: 0, hueEnd: 360 }
  }
  
  // Apply time-based offset to colors
  colors.hueStart = (colors.hueStart + timeOffset) % 360
  colors.hueEnd = (colors.hueEnd + timeOffset) % 360
  
  return colors
}

// Activate VJ mode
const activate = () => {
  console.log('VJModeOverlay: Activating VJ mode')
  isActive.value = true
  console.log('VJModeOverlay: isActive set to', isActive.value)
  console.log('VJModeOverlay: Audio analyser received:', props.audioAnalyser)
  
  // Force the overlay to be visible by adding a class to the body
  document.body.classList.add('vj-mode-active')
  
  // Force the overlay element to be visible
  const overlay = document.querySelector('.vj-overlay')
  if (overlay) {
    overlay.classList.add('vj-active')
    overlay.style.zIndex = '9999'
    overlay.style.opacity = '1'
    overlay.style.pointerEvents = 'auto'
    console.log('VJModeOverlay: Forced overlay visibility')
  }
  
  // Initialize visualizations after DOM update
  setTimeout(() => {
    console.log('VJModeOverlay: Initializing visualizations')
    
    // Set canvas dimensions immediately
    if (waveformCanvas.value) {
      waveformCanvas.value.width = window.innerWidth
      waveformCanvas.value.height = window.innerHeight
      console.log('VJModeOverlay: Set waveform canvas dimensions:', 
                 waveformCanvas.value.width, 'x', waveformCanvas.value.height)
    } else {
      console.warn('VJModeOverlay: waveformCanvas ref not available')
    }
    
    if (frequencyCanvas.value) {
      frequencyCanvas.value.width = window.innerWidth
      frequencyCanvas.value.height = window.innerHeight
      console.log('VJModeOverlay: Set frequency canvas dimensions:', 
                 frequencyCanvas.value.width, 'x', frequencyCanvas.value.height)
    } else {
      console.warn('VJModeOverlay: frequencyCanvas ref not available')
    }
    
    initWaveformVisualization()
    initFrequencyVisualization()
    initParticleVisualization()
    
    // Show controls briefly, then hide
    controlsVisible.value = true
    startControlsTimeout()
    console.log('VJModeOverlay: Visualizations initialized')
  }, 100)
  
  // Add mouse movement listener to show controls
  document.addEventListener('mousemove', handleMouseMove)
  
  // Add keyboard listener for escape key
  document.addEventListener('keydown', handleKeyDown)
  console.log('VJModeOverlay: Event listeners added')
}

// Handle mouse movement to show controls
const handleMouseMove = () => {
  controlsVisible.value = true
  clearTimeout(controlsTimeout)
  startControlsTimeout()
}

// Start timeout to hide controls
const startControlsTimeout = () => {
  controlsTimeout = setTimeout(() => {
    controlsVisible.value = false
  }, 3000)
}

// Handle keyboard events
const handleKeyDown = (event) => {
  if (event.key === 'Escape' && isActive.value) {
    deactivate()
  } else if (event.key === 'h') {
    // Toggle controls visibility with 'h' key
    showControls.value = !showControls.value
  } else if (event.key >= '1' && event.key <= '3') {
    // Toggle layers with number keys
    const index = parseInt(event.key) - 1
    if (index >= 0 && index < layers.value.length) {
      toggleLayer(layers.value[index].id)
    }
  }
}

// Toggle visualization layer
const toggleLayer = (layerId) => {
  const layer = layers.value.find(l => l.id === layerId)
  if (layer) {
    layer.active = !layer.active
  }
}

// Set active visualization style
const setActiveStyle = (styleId) => {
  activeStyle.value = styleId
  
  // Re-initialize visualizations with the new style
  initWaveformVisualization()
  initFrequencyVisualization()
  initParticleVisualization()
}

// Deactivate VJ mode
const deactivate = () => {
  console.log('VJModeOverlay: Deactivating VJ mode')
  isActive.value = false
  
  // Remove the class from the body
  document.body.classList.remove('vj-mode-active')
  
  // Get the overlay element and remove the active class
  const overlay = document.querySelector('.vj-overlay')
  if (overlay) {
    overlay.classList.remove('vj-active')
    overlay.style.zIndex = '-1'
    overlay.style.opacity = '0'
    overlay.style.pointerEvents = 'none'
    console.log('VJModeOverlay: Removed visibility from overlay')
  }
  
  // Clean up animations
  if (waveformAnimationId) {
    cancelAnimationFrame(waveformAnimationId)
  }
  
  if (frequencyAnimationId) {
    cancelAnimationFrame(frequencyAnimationId)
  }
  
  if (p5Instance) {
    p5Instance.remove()
  }
  
  // Remove event listeners
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('keydown', handleKeyDown)
  
  emit('close')
}

// Initialize waveform visualization
const initWaveformVisualization = () => {
  if (!waveformCanvas.value) return
  console.log('VJModeOverlay: Initializing waveform visualization with analyser:', props.audioAnalyser)
  if (!props.audioAnalyser) {
    console.warn('VJModeOverlay: No audio analyser available for waveform visualization')
    return
  }
  
  const canvas = waveformCanvas.value
  const canvasCtx = canvas.getContext('2d')
  
  // Set canvas dimensions
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  
  // Create data array
  waveformDataArray = new Uint8Array(props.audioAnalyser.frequencyBinCount)
  
  // Draw function
  const drawWaveform = () => {
    if (!isActive.value) return
    if (!layers.value.find(l => l.id === 'waveform').active) {
      // Skip drawing if layer is inactive
      waveformAnimationId = requestAnimationFrame(drawWaveform)
      return
    }
    
    const width = canvas.width
    const height = canvas.height
    
    props.audioAnalyser.getByteTimeDomainData(waveformDataArray)
    
    // Clear with transparency to create trail effect
    canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.1)'
    canvasCtx.fillRect(0, 0, width, height)
    
    // Draw waveform
    canvasCtx.lineWidth = 3
    
    // Get audio intensity for rainbow style
    let audioIntensity = 0
    if (activeStyle.value === 'rainbow') {
      const frequencyData = new Uint8Array(props.audioAnalyser.frequencyBinCount)
      props.audioAnalyser.getByteFrequencyData(frequencyData)
      audioIntensity = frequencyData.reduce((sum, value) => sum + value, 0) / frequencyData.length
    }
    
    // Use theme colors
    const colors = getThemeColors(props.theme)
    
    if (activeStyle.value === 'default') {
      // Default style - single color
      const hue = colors.hueStart
      canvasCtx.strokeStyle = `hsl(${hue}, 100%, 70%)`
      
      canvasCtx.beginPath()
      
      const sliceWidth = width / waveformDataArray.length
      let x = 0
      
      for (let i = 0; i < waveformDataArray.length; i++) {
        const v = waveformDataArray[i] / 128.0
        const y = v * height / 2
        
        if (i === 0) {
          canvasCtx.moveTo(x, y)
        } else {
          canvasCtx.lineTo(x, y)
        }
        
        x += sliceWidth
      }
      
      canvasCtx.lineTo(width, height / 2)
      canvasCtx.stroke()
    } 
    else if (activeStyle.value === 'rainbow') {
      // Rainbow gradient style - color changes with sound intensity and time
      const sliceWidth = width / waveformDataArray.length
      
      // Time-based color shift
      const time = Date.now() * 0.001
      const timeHueShift = (time * 10) % 360
      
      for (let i = 0; i < waveformDataArray.length - 1; i++) {
        const v1 = waveformDataArray[i] / 128.0
        const v2 = waveformDataArray[i + 1] / 128.0
        
        const x1 = i * sliceWidth
        const y1 = v1 * height / 2
        const x2 = (i + 1) * sliceWidth
        const y2 = v2 * height / 2
        
        // Map audio intensity to hue with time-based shift
        const hueOffset = (audioIntensity / 255) * 360
        const hue = (colors.hueStart + timeHueShift + hueOffset + i * 0.1) % 360
        
        canvasCtx.beginPath()
        canvasCtx.moveTo(x1, y1)
        canvasCtx.lineTo(x2, y2)
        canvasCtx.strokeStyle = `hsl(${hue}, 100%, 70%)`
        canvasCtx.stroke()
      }
    }
    else if (activeStyle.value === 'circular') {
      // Circular waveform style - ripples from center
      const centerX = width / 2
      const centerY = height / 2
      
      // Get average waveform value for radius calculation
      let sum = 0
      for (let i = 0; i < waveformDataArray.length; i++) {
        sum += waveformDataArray[i]
      }
      const avgValue = sum / waveformDataArray.length / 128.0
      
      // Draw multiple circles with varying radii
      const maxRadius = Math.min(width, height) / 2
      const numCircles = 20
      
      // Time-based color rotation
      const time = Date.now() * 0.001
      const timeHueShift = (time * 15) % 360
      
      for (let i = 0; i < numCircles; i++) {
        const ratio = i / numCircles
        const radius = ratio * maxRadius * (0.5 + avgValue * 0.5)
        
        // Use theme colors with time-based shift and varying opacity
        const colors = getThemeColors(props.theme)
        const hue = (colors.hueStart + timeHueShift + (i * 10)) % 360
        const opacity = 1 - ratio
        
        canvasCtx.beginPath()
        canvasCtx.arc(centerX, centerY, radius, 0, Math.PI * 2)
        canvasCtx.strokeStyle = `hsla(${hue}, 100%, 70%, ${opacity})`
        canvasCtx.stroke()
      }
      
      // Draw waveform as circular path
      canvasCtx.beginPath()
      const samples = 100
      const angleStep = (Math.PI * 2) / samples
      
      for (let i = 0; i < samples; i++) {
        const angle = i * angleStep
        const index = Math.floor((i / samples) * waveformDataArray.length)
        const value = waveformDataArray[index] / 128.0
        const radius = maxRadius * 0.3 * value
        
        const x = centerX + Math.cos(angle) * radius
        const y = centerY + Math.sin(angle) * radius
        
        if (i === 0) {
          canvasCtx.moveTo(x, y)
        } else {
          canvasCtx.lineTo(x, y)
        }
      }
      
      canvasCtx.closePath()
      const hue = colors.hueStart
      canvasCtx.strokeStyle = `hsl(${hue}, 100%, 70%)`
      canvasCtx.stroke()
    }
    else if (activeStyle.value === 'geometric') {
      // Geometric pattern style - hexagonal grid
      const hexSize = 30
      const rows = Math.ceil(height / (hexSize * 1.5))
      const cols = Math.ceil(width / (hexSize * Math.sqrt(3)))
      
      // Get audio intensity for size modulation
      const frequencyData = new Uint8Array(props.audioAnalyser.frequencyBinCount)
      props.audioAnalyser.getByteFrequencyData(frequencyData)
      const audioIntensity = frequencyData.reduce((sum, value) => sum + value, 0) / frequencyData.length
      const sizeModifier = 0.5 + (audioIntensity / 255) * 1.5
      
      // Draw hexagonal grid
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const offsetX = (row % 2) * (hexSize * Math.sqrt(3) / 2)
          const x = col * hexSize * Math.sqrt(3) + offsetX
          const y = row * hexSize * 1.5
          
          // Sample waveform data for this position
          const sampleIndex = Math.floor((col / cols) * waveformDataArray.length)
          const value = waveformDataArray[sampleIndex] / 128.0
          
          // Calculate hexagon points
          const points = []
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i
            const hx = x + Math.cos(angle) * hexSize * sizeModifier * value
            const hy = y + Math.sin(angle) * hexSize * sizeModifier * value
            points.push({ x: hx, y: hy })
          }
          
          // Draw hexagon
          canvasCtx.beginPath()
          canvasCtx.moveTo(points[0].x, points[0].y)
          for (let i = 1; i < 6; i++) {
            canvasCtx.lineTo(points[i].x, points[i].y)
          }
          canvasCtx.closePath()
          
          // Use theme colors with time-based shift
          const colors = getThemeColors(props.theme)
          const time = Date.now() * 0.001
          const timeHueShift = (time * 20) % 360
          const hue = (colors.hueStart + timeHueShift + (row * col) % 60) % 360
          canvasCtx.strokeStyle = `hsl(${hue}, 100%, 70%)`
          canvasCtx.stroke()
        }
      }
    }
    else if (activeStyle.value === 'wireframe3d') {
      // 3D wireframe visualization
      const centerX = width / 2
      const centerY = height / 2
      
      // Get audio data for 3D surface
      const frequencyData = new Uint8Array(props.audioAnalyser.frequencyBinCount)
      props.audioAnalyser.getByteFrequencyData(frequencyData)
      
      // Grid parameters
      const gridSize = 20
      const gridWidth = Math.min(width, height) * 0.8
      const gridHeight = gridWidth
      const cellSize = gridWidth / gridSize
      
      // Rotation based on time
      const time = Date.now() * 0.001
      const rotationX = Math.sin(time * 0.3) * 0.3
      const rotationY = time * 0.2
      
      // Helper function for 3D to 2D projection
      const project3Dto2D = (x, y, z, rotX, rotY) => {
        // Apply rotation around X axis
        const cosX = Math.cos(rotX)
        const sinX = Math.sin(rotX)
        const y1 = y * cosX - z * sinX
        const z1 = y * sinX + z * cosX
        
        // Apply rotation around Y axis
        const cosY = Math.cos(rotY)
        const sinY = Math.sin(rotY)
        const x2 = x * cosY - z1 * sinY
        const z2 = x * sinY + z1 * cosY
        
        // Apply perspective
        const scale = 1000 / (1000 + z2)
        const px = x2 * scale
        const py = y1 * scale
        
        return [px, py]
      }
      
      // Draw 3D grid
      for (let i = 0; i <= gridSize; i++) {
        // Draw horizontal lines
        for (let j = 0; j <= gridSize; j++) {
          if (j < gridSize) {
            const x1 = i - gridSize / 2
            const z1 = j - gridSize / 2
            const x2 = i - gridSize / 2
            const z2 = j + 1 - gridSize / 2
            
            // Get height from frequency data
            const index1 = Math.floor((i * gridSize + j) / (gridSize * gridSize) * frequencyData.length)
            const index2 = Math.floor((i * gridSize + j + 1) / (gridSize * gridSize) * frequencyData.length)
            
            const y1 = -(frequencyData[index1] / 255.0) * gridHeight * 0.3
            const y2 = -(frequencyData[index2] / 255.0) * gridHeight * 0.3
            
            // 3D to 2D projection with rotation
            const [px1, py1] = project3Dto2D(x1 * cellSize, y1, z1 * cellSize, rotationX, rotationY)
            const [px2, py2] = project3Dto2D(x2 * cellSize, y2, z2 * cellSize, rotationX, rotationY)
            
            // Draw line
            canvasCtx.beginPath()
            canvasCtx.moveTo(centerX + px1, centerY + py1)
            canvasCtx.lineTo(centerX + px2, centerY + py2)
            
            // Use theme colors with time-based shift
            const colors = getThemeColors(props.theme)
            const time = Date.now() * 0.001
            const timeHueShift = (time * 25) % 360
            const hue = (colors.hueStart + timeHueShift + (i * 5)) % 360
            const brightness = 70 + (frequencyData[index1] / 255.0) * 30
            
            canvasCtx.strokeStyle = `hsl(${hue}, 100%, ${brightness}%)`
            canvasCtx.stroke()
          }
          
          // Draw vertical lines
          if (i < gridSize) {
            const x1 = i - gridSize / 2
            const z1 = j - gridSize / 2
            const x2 = i + 1 - gridSize / 2
            const z2 = j - gridSize / 2
            
            // Get height from frequency data
            const index1 = Math.floor((i * gridSize + j) / (gridSize * gridSize) * frequencyData.length)
            const index2 = Math.floor(((i + 1) * gridSize + j) / (gridSize * gridSize) * frequencyData.length)
            
            const y1 = -(frequencyData[index1] / 255.0) * gridHeight * 0.3
            const y2 = -(frequencyData[index2] / 255.0) * gridHeight * 0.3
            
            // 3D to 2D projection with rotation
            const [px1, py1] = project3Dto2D(x1 * cellSize, y1, z1 * cellSize, rotationX, rotationY)
            const [px2, py2] = project3Dto2D(x2 * cellSize, y2, z2 * cellSize, rotationX, rotationY)
            
            // Draw line
            canvasCtx.beginPath()
            canvasCtx.moveTo(centerX + px1, centerY + py1)
            canvasCtx.lineTo(centerX + px2, centerY + py2)
            
            // Use theme colors with time-based shift and varying hue
            const colors = getThemeColors(props.theme)
            const time = Date.now() * 0.001
            const timeHueShift = (time * 25) % 360
            const hue = (colors.hueStart + timeHueShift + (j * 5)) % 360
            const brightness = 70 + (frequencyData[index1] / 255.0) * 30
            
            canvasCtx.strokeStyle = `hsl(${hue}, 100%, ${brightness}%)`
            canvasCtx.stroke()
          }
        }
      }
    }
    else {
      // Default fallback for other styles not yet implemented
      const hue = colors.hueStart
      canvasCtx.strokeStyle = `hsl(${hue}, 100%, 70%)`
      
      canvasCtx.beginPath()
      
      const sliceWidth = width / waveformDataArray.length
      let x = 0
      
      for (let i = 0; i < waveformDataArray.length; i++) {
        const v = waveformDataArray[i] / 128.0
        const y = v * height / 2
        
        if (i === 0) {
          canvasCtx.moveTo(x, y)
        } else {
          canvasCtx.lineTo(x, y)
        }
        
        x += sliceWidth
      }
      
      canvasCtx.lineTo(width, height / 2)
      canvasCtx.stroke()
    }
    
    waveformAnimationId = requestAnimationFrame(drawWaveform)
  }
  
  // Start animation
  waveformAnimationId = requestAnimationFrame(drawWaveform)
}

// Initialize frequency visualization
const initFrequencyVisualization = () => {
  if (!frequencyCanvas.value) return
  console.log('VJModeOverlay: Initializing frequency visualization with analyser:', props.audioAnalyser)
  if (!props.audioAnalyser) {
    console.warn('VJModeOverlay: No audio analyser available for frequency visualization')
    return
  }
  
  const canvas = frequencyCanvas.value
  const canvasCtx = canvas.getContext('2d')
  
  // Set canvas dimensions
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  
  // Create data array
  frequencyDataArray = new Uint8Array(props.audioAnalyser.frequencyBinCount)
  
  // Draw function
  const drawFrequency = () => {
    if (!isActive.value) return
    if (!layers.value.find(l => l.id === 'frequency').active) {
      // Skip drawing if layer is inactive
      frequencyAnimationId = requestAnimationFrame(drawFrequency)
      return
    }
    
    const width = canvas.width
    const height = canvas.height
    
    props.audioAnalyser.getByteFrequencyData(frequencyDataArray)
    
    // Clear with transparency
    canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.2)'
    canvasCtx.fillRect(0, 0, width, height)
    
    // Draw frequency bars
    const barWidth = (width / frequencyDataArray.length) * 2.5
    let x = 0
    
    for (let i = 0; i < frequencyDataArray.length; i++) {
      const barHeight = (frequencyDataArray[i] / 255) * height
      
      // Use gradient colors based on frequency and theme
      const colors = getThemeColors(props.theme)
      const hueRange = colors.hueEnd - colors.hueStart
      const hue = colors.hueStart + (i / frequencyDataArray.length * hueRange)
      const saturation = colors.saturation || 100
      const brightness = colors.brightness || 50
      
      canvasCtx.fillStyle = `hsla(${hue}, ${saturation}%, ${brightness}%, 0.7)`
      canvasCtx.fillRect(x, height - barHeight, barWidth, barHeight)
      
      x += barWidth + 1
      
      // Only draw a portion of the frequencies to fit in the canvas
      if (x > width) break
    }
    
    frequencyAnimationId = requestAnimationFrame(drawFrequency)
  }
  
  // Start animation
  frequencyAnimationId = requestAnimationFrame(drawFrequency)
}

// Initialize particle visualization with p5.js
const initParticleVisualization = () => {
  if (!particleContainer.value) return
  console.log('VJModeOverlay: Initializing particle visualization with analyser:', props.audioAnalyser)
  if (!props.audioAnalyser) {
    console.warn('VJModeOverlay: No audio analyser available for particle visualization')
    return
  }
  
  // Basic Particle class
  class Particle {
    constructor(p) {
      this.p = p
      this.reset()
    }
    
    reset() {
      this.x = this.p.random(this.p.width)
      this.y = this.p.random(this.p.height)
      this.size = this.p.random(2, 4)
      this.speedX = this.p.random(-1, 1)
      this.speedY = this.p.random(-1, 1)
      
      const colors = getThemeColors(props.theme)
      this.hue = this.p.random(colors.hueStart, colors.hueEnd)
    }
    
    update(intensity) {
      this.x += this.speedX * intensity
      this.y += this.speedY * intensity
      
      // Time-based color shift
      const time = Date.now() * 0.001
      const timeHueShift = (time * 5) % 360
      this.hue = (this.hue + timeHueShift * 0.01 + 0.5) % 360
      
      if (this.x < 0 || this.x > this.p.width || 
          this.y < 0 || this.y > this.p.height) {
        this.reset()
      }
    }
    
    draw() {
      this.p.noStroke()
      this.p.fill(this.hue, 80, 100, 0.7)
      this.p.circle(this.x, this.y, this.size)
    }
  }
  
  // Enhanced Particle class for 3D particle system
  class EnhancedParticle extends Particle {
    constructor(p) {
      super(p)
      this.z = this.p.random(-100, 100)
      this.speedZ = this.p.random(-0.5, 0.5)
      this.originalSize = this.size
      this.brightness = this.p.random(70, 100)
      this.glowSize = this.p.random(1, 3)
    }
    
    reset() {
      super.reset()
      this.z = this.p.random(-100, 100)
      this.speedZ = this.p.random(-0.5, 0.5)
      this.originalSize = this.size
      this.brightness = this.p.random(70, 100)
      this.glowSize = this.p.random(1, 3)
    }
    
    update(intensity, frequencyBin) {
      // Update position with 3D movement
      this.x += this.speedX * intensity
      this.y += this.speedY * intensity
      this.z += this.speedZ * intensity
      
      // Time-based color shift with frequency-specific changes
      const time = Date.now() * 0.001
      const timeHueShift = (time * 10) % 360
      this.hue = (this.hue + timeHueShift * 0.01 + 0.5) % 360
      this.size = this.originalSize + (frequencyBin / 255) * 5
      this.brightness = 70 + (frequencyBin / 255) * 30
      
      // Reset if out of bounds
      if (this.x < 0 || this.x > this.p.width || 
          this.y < 0 || this.y > this.p.height ||
          this.z < -200 || this.z > 200) {
        this.reset()
      }
    }
    
    draw() {
      // Calculate perspective scaling
      const scale = this.p.map(this.z, -100, 100, 0.5, 1.5)
      const scaledSize = this.size * scale
      
      // Draw glow effect
      this.p.noStroke()
      for (let i = 0; i < 3; i++) {
        const alpha = this.p.map(i, 0, 3, 0.7, 0.1)
        const glowSize = scaledSize + (i * this.glowSize * scale)
        this.p.fill(this.hue, 80, this.brightness, alpha)
        this.p.circle(this.x, this.y, glowSize)
      }
      
      // Draw main particle
      this.p.fill(this.hue, 80, this.brightness, 0.9)
      this.p.circle(this.x, this.y, scaledSize)
    }
  }
  
  // p5.js sketch
  const sketch = (p) => {
    let particles = []
    const particleCount = activeStyle.value === 'particles3d' ? 500 : 1000
    
    p.setup = () => {
      p.createCanvas(window.innerWidth, window.innerHeight)
      p.colorMode(p.HSB, 360, 100, 100, 1)
      p.background(0)
      
      // Create particles based on active style
      createParticles()
    }
    
    // Function to create particles based on active style
    const createParticles = () => {
      if (activeStyle.value === 'particles3d') {
        particles = Array.from({ length: particleCount }, () => new EnhancedParticle(p))
      } else {
        particles = Array.from({ length: particleCount }, () => new Particle(p))
      }
    }
    
    p.draw = () => {
      if (!isActive.value) return
      if (!layers.value.find(l => l.id === 'particles').active) {
        // Skip drawing if layer is inactive
        p.background(0, 0.1)
        return
      }
      
      p.background(0, 0.1)
      
      // Get audio data
      const dataArray = new Uint8Array(props.audioAnalyser.frequencyBinCount)
      props.audioAnalyser.getByteFrequencyData(dataArray)
      
      // Calculate average intensity
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
      const intensity = p.map(average, 0, 255, 1, 3)
      
      // Update and draw particles
      if (activeStyle.value === 'particles3d') {
        // Enhanced particles with frequency bin data
        particles.forEach((particle, index) => {
          // Get frequency bin for this particle
          const binIndex = Math.floor((index / particles.length) * dataArray.length)
          const frequencyValue = dataArray[binIndex]
          
          particle.update(intensity, frequencyValue)
          particle.draw()
        })
      } else {
        // Regular particles
        particles.forEach(particle => {
          particle.update(intensity)
          particle.draw()
        })
      }
    }
    
    p.windowResized = () => {
      p.resizeCanvas(window.innerWidth, window.innerHeight)
    }
    
    // Watch for style changes and recreate particles
    watch(() => activeStyle.value, (newStyle) => {
      console.log('Particle visualization style changed to:', newStyle)
      createParticles()
    })
  }
  
  // Create p5 instance
  p5Instance = new p5(sketch, particleContainer.value)
}

// Handle window resize
const handleResize = () => {
  if (isActive.value) {
    if (waveformCanvas.value) {
      waveformCanvas.value.width = window.innerWidth
      waveformCanvas.value.height = window.innerHeight
    }
    
    if (frequencyCanvas.value) {
      frequencyCanvas.value.width = window.innerWidth
      frequencyCanvas.value.height = window.innerHeight
    }
    
    if (p5Instance) {
      p5Instance.resizeCanvas(window.innerWidth, window.innerHeight)
    }
  }
}

// Watch for changes in props.isActive and sync with local state
watch(() => props.isActive, (newValue) => {
  console.log('VJModeOverlay: props.isActive changed to', newValue)
  isActive.value = newValue
  
  if (newValue) {
    // Force initialization on next tick
    setTimeout(() => {
      console.log('VJModeOverlay: Forcing initialization after isActive change')
      initWaveformVisualization()
      initFrequencyVisualization()
      initParticleVisualization()
    }, 50)
  }
})

// Also watch local isActive for internal changes
watch(() => isActive.value, (newValue) => {
  console.log('VJModeOverlay: local isActive changed to', newValue)
  if (newValue) {
    // Force initialization on next tick
    setTimeout(() => {
      console.log('VJModeOverlay: Forcing initialization after local isActive change')
      initWaveformVisualization()
      initFrequencyVisualization()
      initParticleVisualization()
    }, 50)
  }
})

// Watch for changes in audioAnalyser prop
watch(() => props.audioAnalyser, (newValue) => {
  console.log('VJModeOverlay: audioAnalyser prop changed:', newValue ? 'present' : 'null')
  if (newValue && isActive.value) {
    // Re-initialize visualizations with new audio analyser
    setTimeout(() => {
      console.log('VJModeOverlay: Re-initializing visualizations with new audio analyser')
      initWaveformVisualization()
      initFrequencyVisualization()
      initParticleVisualization()
    }, 50)
  }
})

// Listen for custom event to force re-initialization
onMounted(() => {
  window.addEventListener('vj-mode-activated', (event) => {
    console.log('VJModeOverlay: Received vj-mode-activated event')
    if (event.detail && event.detail.audioAnalyser) {
      console.log('VJModeOverlay: Received audio analyser from event')
      // Force re-initialization with the new audio analyser
      setTimeout(() => {
        console.log('VJModeOverlay: Re-initializing visualizations with new audio analyser')
        initWaveformVisualization()
        initFrequencyVisualization()
        initParticleVisualization()
      }, 50)
    }
  })
})

// Lifecycle hooks
onMounted(() => {
  window.addEventListener('resize', handleResize)
  console.log('VJModeOverlay: Component mounted')
  
 // Only auto-activate if showButton is false AND we have an audio analyzer
  if (!props.showButton && props.audioAnalyser) {
    console.log('VJModeOverlay: Auto-activating (showButton is false and audioAnalyser is available)')
    setTimeout(() => {
      activate()
    }, 100)
  }
  
  // Log component state for debugging
  console.log('VJModeOverlay mounted with props:', {
    audioAnalyser: props.audioAnalyser ? 'present' : 'null',
    theme: props.theme,
    showButton: props.showButton
  })
  
  // Check if refs are available
  setTimeout(() => {
    console.log('VJModeOverlay refs check:', {
      vjContainer: vjContainer.value ? 'available' : 'null',
      waveformCanvas: waveformCanvas.value ? 'available' : 'null',
      frequencyCanvas: frequencyCanvas.value ? 'available' : 'null',
      particleContainer: particleContainer.value ? 'available' : 'null'
    })
  }, 200)
})

onUnmounted(() => {
  if (waveformAnimationId) {
    cancelAnimationFrame(waveformAnimationId)
  }
  
  if (frequencyAnimationId) {
    cancelAnimationFrame(frequencyAnimationId)
  }
  
  if (p5Instance) {
    p5Instance.remove()
  }
  
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('keydown', handleKeyDown)
  
  clearTimeout(controlsTimeout)
})
</script>

<style scoped>
/* Hide scrollbars when in VJ mode */
:deep(.fixed) {
  overflow: hidden;
}
</style>
