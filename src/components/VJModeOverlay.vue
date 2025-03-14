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

const emit = defineEmits(['close', 'themeChange'])

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

// Visualization styles with club-oriented options
const visualizationStyles = ref([
  { id: 'default', name: 'デフォルト', active: true },
  { id: 'rainbow', name: '虹色グラデーション', active: false },
  { id: 'circular', name: '円形波形', active: false },
  { id: 'geometric', name: '幾何学パターン', active: false },
  { id: 'kaleidoscope', name: '万華鏡', active: false },
  { id: 'particles3d', name: 'パーティクルシステム', active: false },
  { id: 'wireframe3d', name: '3Dワイヤーフレーム', active: false }
])

// Current active style
const activeStyle = ref('default')

// Available themes for color variations
const themes = [
  { id: 'default', name: 'デフォルト' },
  { id: 'cool', name: 'クール' },
  { id: 'warm', name: '暖色' },
  { id: 'forest', name: '森林' },
  { id: 'sunset', name: '夕焼け' },
  { id: 'club', name: 'クラブ' },
  { id: 'neon', name: 'ネオン' }
]

// Current theme with auto-rotation for club environment
let currentThemeIndex = 0
const autoRotateThemes = () => {
  if (isActive.value) {
    currentThemeIndex = (currentThemeIndex + 1) % themes.length
    // Emit theme change event that parent can listen to
    emit('themeChange', themes[currentThemeIndex].id)
    // Schedule next rotation
    setTimeout(autoRotateThemes, 10000) // Change theme every 10 seconds
  }
}

// Animation IDs
let waveformAnimationId = null
let frequencyAnimationId = null
let p5Instance = null

// Data arrays
let waveformDataArray = null
let frequencyDataArray = null

// Enhanced club-style theme colors with dynamic time-based transitions
const getThemeColors = (theme) => {
  // Get time-based offset for color cycling - faster for club environment
  const timeOffset = Date.now() * 0.0002 % 360
  const pulseEffect = Math.sin(Date.now() * 0.001) * 0.5 + 0.5 // Pulsing effect between 0-1
  
  let colors
  switch (theme) {
    case 'cool':
      colors = { 
        hueStart: 180, 
        hueEnd: 300, // Wider range for more variety
        saturation: 90 + pulseEffect * 10, 
        brightness: 80 + pulseEffect * 20 
      }
      break
    case 'warm':
      colors = { 
        hueStart: 0, 
        hueEnd: 90, // Extended range
        saturation: 100, 
        brightness: 85 + pulseEffect * 15 
      }
      break
    case 'forest':
      colors = { 
        hueStart: 90, 
        hueEnd: 180, 
        saturation: 85 + pulseEffect * 15, 
        brightness: 75 + pulseEffect * 25 
      }
      break
    case 'sunset':
      colors = { 
        hueStart: 0, 
        hueEnd: 90, 
        saturation: 100, 
        brightness: 90 + pulseEffect * 10 
      }
      break
    case 'club': // New club theme with vibrant neon colors
      colors = { 
        hueStart: 270, 
        hueEnd: 330, 
        saturation: 100, 
        brightness: 100 
      }
      break
    case 'neon': // New neon theme
      colors = { 
        hueStart: 120, 
        hueEnd: 200, 
        saturation: 100, 
        brightness: 100 
      }
      break
    default:
      // Full spectrum with high saturation and brightness for club environment
      colors = { 
        hueStart: 0, 
        hueEnd: 360, 
        saturation: 100, 
        brightness: 90 + pulseEffect * 10 
      }
  }
  
  // Apply time-based offset to colors with wider range
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
  
  // Start auto theme rotation for club environment
  autoRotateThemes()
  
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
      // Enhanced rainbow gradient style for club environment - more vibrant colors
      const sliceWidth = width / waveformDataArray.length
      
      // Time-based color shift with faster cycling for club environment
      const time = Date.now() * 0.001
      const timeHueShift = (time * 15) % 360 // Faster color cycling
      const pulseEffect = Math.sin(time * 2) * 0.5 + 0.5 // Pulsing effect
      
      // Line width based on audio intensity for more dynamic visuals
      canvasCtx.lineWidth = 3 + (audioIntensity / 255) * 5
      
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
        
        // More vibrant colors with higher saturation and brightness
        const saturation = colors.saturation || (90 + pulseEffect * 10)
        const brightness = colors.brightness || (80 + pulseEffect * 20)
        
        canvasCtx.beginPath()
        canvasCtx.moveTo(x1, y1)
        canvasCtx.lineTo(x2, y2)
        canvasCtx.strokeStyle = `hsl(${hue}, ${saturation}%, ${brightness}%)`
        canvasCtx.stroke()
      }
    }
    else if (activeStyle.value === 'circular') {
      // Enhanced circular waveform style - ripples from center with frequency response
      const centerX = width / 2
      const centerY = height / 2
      
      // Get average waveform value for radius calculation
      let sum = 0
      for (let i = 0; i < waveformDataArray.length; i++) {
        sum += waveformDataArray[i]
      }
      const avgValue = sum / waveformDataArray.length / 128.0
      
      // Get frequency data for more dynamic modulation
      const frequencyData = new Uint8Array(props.audioAnalyser.frequencyBinCount)
      props.audioAnalyser.getByteFrequencyData(frequencyData)
      const audioIntensity = frequencyData.reduce((sum, value) => sum + value, 0) / frequencyData.length / 255.0
      
      // Draw multiple circles with varying radii
      const maxRadius = Math.min(width, height) / 2
      const numCircles = 25 // Increased from 20 for more detail
      
      // Time-based color rotation with pulsing effect
      const time = Date.now() * 0.001
      const timeHueShift = (time * 15) % 360
      const pulseEffect = Math.sin(time * 2) * 0.5 + 0.5 // Pulsing effect between 0-1
      
      // Add glow effect based on audio intensity
      canvasCtx.shadowBlur = 15 * audioIntensity
      canvasCtx.shadowColor = `hsla(${timeHueShift}, 100%, 70%, 0.8)`
      
      for (let i = 0; i < numCircles; i++) {
        const ratio = i / numCircles
        // More dynamic radius calculation with audio intensity
        const radius = ratio * maxRadius * (0.4 + avgValue * 0.6 + audioIntensity * 0.2)
        
        // Use theme colors with time-based shift and varying opacity
        const colors = getThemeColors(props.theme)
        const hue = (colors.hueStart + timeHueShift + (i * 10)) % 360
        const saturation = colors.saturation || (90 + pulseEffect * 10)
        const brightness = colors.brightness || (70 + pulseEffect * 30)
        const opacity = (1 - ratio) * (0.7 + audioIntensity * 0.3)
        
        canvasCtx.beginPath()
        canvasCtx.arc(centerX, centerY, radius, 0, Math.PI * 2)
        canvasCtx.strokeStyle = `hsla(${hue}, ${saturation}%, ${brightness}%, ${opacity})`
        canvasCtx.lineWidth = 2 + audioIntensity * 3 // Dynamic line width
        canvasCtx.stroke()
      }
      
      // Draw waveform as circular path with increased samples
      canvasCtx.beginPath()
      const samples = 200 // Increased from 100 for smoother rendering
      const angleStep = (Math.PI * 2) / samples
      
      for (let i = 0; i < samples; i++) {
        const angle = i * angleStep
        const index = Math.floor((i / samples) * waveformDataArray.length)
        const value = waveformDataArray[index] / 128.0
        
        // More dynamic radius calculation with frequency data
        const freqIndex = Math.floor((i / samples) * frequencyData.length)
        const freqValue = frequencyData[freqIndex] / 255.0
        const radius = maxRadius * (0.3 * value + 0.1 * freqValue)
        
        const x = centerX + Math.cos(angle) * radius
        const y = centerY + Math.sin(angle) * radius
        
        if (i === 0) {
          canvasCtx.moveTo(x, y)
        } else {
          canvasCtx.lineTo(x, y)
        }
      }
      
      canvasCtx.closePath()
      const colors = getThemeColors(props.theme)
      const hue = (colors.hueStart + timeHueShift) % 360
      const saturation = colors.saturation || 100
      const brightness = colors.brightness || (80 + pulseEffect * 20)
      canvasCtx.strokeStyle = `hsla(${hue}, ${saturation}%, ${brightness}%, 0.9)`
      canvasCtx.lineWidth = 3 + audioIntensity * 5 // Dynamic line width
      canvasCtx.stroke()
      
      // Add a second circular layer with frequency-based dots
      const dotSamples = 36 // One dot every 10 degrees
      const dotAngleStep = (Math.PI * 2) / dotSamples
      
      for (let i = 0; i < dotSamples; i++) {
        const angle = i * dotAngleStep
        const freqIndex = Math.floor((i / dotSamples) * frequencyData.length)
        const freqValue = frequencyData[freqIndex] / 255.0
        
        // Radius based on frequency value
        const dotRadius = maxRadius * (0.6 + freqValue * 0.3)
        const dotSize = 3 + freqValue * 10 // Dynamic dot size
        
        const x = centerX + Math.cos(angle) * dotRadius
        const y = centerY + Math.sin(angle) * dotRadius
        
        // Draw dot
        canvasCtx.beginPath()
        canvasCtx.arc(x, y, dotSize, 0, Math.PI * 2)
        
        // Use complementary color
        const dotHue = (hue + 180) % 360
        canvasCtx.fillStyle = `hsla(${dotHue}, ${saturation}%, ${brightness}%, ${0.7 + freqValue * 0.3})`
        canvasCtx.fill()
      }
      
      // Reset shadow for other drawings
      canvasCtx.shadowBlur = 0
    }
    else if (activeStyle.value === 'kaleidoscope') {
      // 万華鏡パターンの実装
      const centerX = width / 2
      const centerY = height / 2
      
      // オーディオデータを取得
      const frequencyData = new Uint8Array(props.audioAnalyser.frequencyBinCount)
      props.audioAnalyser.getByteFrequencyData(frequencyData)
      const audioIntensity = frequencyData.reduce((sum, value) => sum + value, 0) / frequencyData.length / 255.0
      
      // 時間ベースの効果
      const time = Date.now() * 0.001
      const rotationSpeed = 0.1 + audioIntensity * 0.2
      const rotation = time * rotationSpeed
      const pulseEffect = Math.sin(time * 2) * 0.5 + 0.5
      
      // 万華鏡の設定
      const numReflections = 12 // 反射の数
      const numLayers = 5 // レイヤーの数
      const maxRadius = Math.min(width, height) * 0.45
      
      // グローエフェクト
      canvasCtx.shadowBlur = 15 * audioIntensity
      canvasCtx.shadowColor = `hsla(${(time * 20) % 360}, 100%, 70%, 0.8)`
      
      // 各レイヤーを描画
      for (let layer = 0; layer < numLayers; layer++) {
        const layerRadius = maxRadius * (0.3 + (layer / numLayers) * 0.7)
        const layerRotation = rotation + (layer * Math.PI / numLayers)
        const layerSegments = 6 + layer * 2 // レイヤーごとにセグメント数を増やす
        
        // 各反射セクションを描画
        for (let r = 0; r < numReflections; r++) {
          const angle = (r / numReflections) * Math.PI * 2 + layerRotation
          
          // 各セグメントを描画
          for (let s = 0; s < layerSegments; s++) {
            // 周波数データからセグメントの大きさを計算
            const freqIndex = Math.floor((r * layerSegments + s) % frequencyData.length)
            const freqValue = frequencyData[freqIndex] / 255.0
            
            // セグメントの頂点を計算
            const segmentAngle = (s / layerSegments) * Math.PI * 2 / numReflections
            const nextSegmentAngle = ((s + 1) / layerSegments) * Math.PI * 2 / numReflections
            
            const innerRadius = layerRadius * (0.5 + freqValue * 0.2)
            const outerRadius = layerRadius * (0.7 + freqValue * 0.3)
            
            const x1 = centerX + Math.cos(angle + segmentAngle) * innerRadius
            const y1 = centerY + Math.sin(angle + segmentAngle) * innerRadius
            const x2 = centerX + Math.cos(angle + nextSegmentAngle) * innerRadius
            const y2 = centerY + Math.sin(angle + nextSegmentAngle) * innerRadius
            const x3 = centerX + Math.cos(angle + nextSegmentAngle) * outerRadius
            const y3 = centerY + Math.sin(angle + nextSegmentAngle) * outerRadius
            const x4 = centerX + Math.cos(angle + segmentAngle) * outerRadius
            const y4 = centerY + Math.sin(angle + segmentAngle) * outerRadius
            
            // セグメントを描画
            canvasCtx.beginPath()
            canvasCtx.moveTo(x1, y1)
            canvasCtx.lineTo(x2, y2)
            canvasCtx.lineTo(x3, y3)
            canvasCtx.lineTo(x4, y4)
            canvasCtx.closePath()
            
            // 色を設定
            const colors = getThemeColors(props.theme)
            const hueOffset = (r / numReflections) * 360
            const hue = (colors.hueStart + (time * 15) % 360 + hueOffset + layer * 30) % 360
            const saturation = colors.saturation || (90 + pulseEffect * 10)
            const brightness = colors.brightness || (70 + freqValue * 30)
            const opacity = 0.7 + freqValue * 0.3
            
            canvasCtx.fillStyle = `hsla(${hue}, ${saturation}%, ${brightness}%, ${opacity})`
            canvasCtx.fill()
            
            // 輪郭を描画
            canvasCtx.strokeStyle = `hsla(${(hue + 180) % 360}, ${saturation}%, ${brightness + 10}%, ${opacity})`
            canvasCtx.lineWidth = 1 + audioIntensity * 2
            canvasCtx.stroke()
          }
        }
      }
      
      // 中央の円を描画
      canvasCtx.beginPath()
      canvasCtx.arc(centerX, centerY, maxRadius * 0.2 * (0.8 + audioIntensity * 0.4), 0, Math.PI * 2)
      
      // 中央の円のグラデーション
      const gradient = canvasCtx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, maxRadius * 0.2 * (0.8 + audioIntensity * 0.4)
      )
      
      const centerHue = (time * 30) % 360
      gradient.addColorStop(0, `hsla(${centerHue}, 100%, 80%, 0.9)`)
      gradient.addColorStop(0.5, `hsla(${(centerHue + 60) % 360}, 100%, 70%, 0.7)`)
      gradient.addColorStop(1, `hsla(${(centerHue + 120) % 360}, 100%, 60%, 0.5)`)
      
      canvasCtx.fillStyle = gradient
      canvasCtx.fill()
      
      // 放射状の線を描画
      for (let i = 0; i < numReflections * 2; i++) {
        const lineAngle = (i / (numReflections * 2)) * Math.PI * 2 + rotation
        const lineLength = maxRadius * (0.3 + audioIntensity * 0.7)
        
        canvasCtx.beginPath()
        canvasCtx.moveTo(centerX, centerY)
        canvasCtx.lineTo(
          centerX + Math.cos(lineAngle) * lineLength,
          centerY + Math.sin(lineAngle) * lineLength
        )
        
        const lineHue = (centerHue + i * (360 / (numReflections * 2))) % 360
        canvasCtx.strokeStyle = `hsla(${lineHue}, 100%, 80%, ${0.3 + audioIntensity * 0.4})`
        canvasCtx.lineWidth = 2 + audioIntensity * 3
        canvasCtx.stroke()
      }
      
      // 影の効果をリセット
      canvasCtx.shadowBlur = 0
      
      // 装飾的な円形パターンを追加
      const numCircles = 8
      for (let c = 0; c < numCircles; c++) {
        const circleRadius = maxRadius * (0.3 + (c / numCircles) * 0.6)
        const circleRotation = rotation * (c % 2 === 0 ? 1 : -1) // 交互に回転方向を変える
        
        canvasCtx.beginPath()
        
        // 波線の円を描画
        const circleSegments = 60
        const waveAmplitude = maxRadius * 0.05 * (0.5 + audioIntensity * 0.5)
        const waveFrequency = 8 + c * 2
        
        for (let i = 0; i <= circleSegments; i++) {
          const angle = (i / circleSegments) * Math.PI * 2 + circleRotation
          const freqIndex = Math.floor((i / circleSegments) * frequencyData.length)
          const freqValue = frequencyData[freqIndex] / 255.0
          
          const waveOffset = Math.sin(angle * waveFrequency) * waveAmplitude * (0.5 + freqValue * 0.5)
          const radius = circleRadius + waveOffset
          
          const x = centerX + Math.cos(angle) * radius
          const y = centerY + Math.sin(angle) * radius
          
          if (i === 0) {
            canvasCtx.moveTo(x, y)
          } else {
            canvasCtx.lineTo(x, y)
          }
        }
        
        canvasCtx.closePath()
        
        // 色を設定
        const circleHue = (centerHue + c * 30) % 360
        canvasCtx.strokeStyle = `hsla(${circleHue}, 100%, 80%, ${0.4 + (c / numCircles) * 0.4})`
        canvasCtx.lineWidth = 1 + (numCircles - c) * 0.5
        canvasCtx.stroke()
      }
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
    
    // Draw enhanced frequency bars for club environment
    const barWidth = (width / frequencyDataArray.length) * 2.5
    let x = 0
    
    // Time-based effects
    const time = Date.now() * 0.001
    const pulseEffect = Math.sin(time * 2) * 0.5 + 0.5 // Pulsing effect
    const timeHueShift = (time * 20) % 360 // Fast color cycling
    
    for (let i = 0; i < frequencyDataArray.length; i++) {
      const barHeight = (frequencyDataArray[i] / 255) * height
      
      // Use gradient colors based on frequency and theme with time-based shifts
      const colors = getThemeColors(props.theme)
      const hueRange = colors.hueEnd - colors.hueStart
      const hue = (colors.hueStart + timeHueShift + (i / frequencyDataArray.length * hueRange)) % 360
      const saturation = colors.saturation || 100
      const brightness = colors.brightness || (70 + pulseEffect * 30) // Pulsing brightness
      
      // Add glow effect for club environment
      canvasCtx.shadowColor = `hsl(${hue}, 100%, 70%)`
      canvasCtx.shadowBlur = 10 * pulseEffect
      
      // More vibrant colors with higher opacity
      canvasCtx.fillStyle = `hsla(${hue}, ${saturation}%, ${brightness}%, 0.8)`
      canvasCtx.fillRect(x, height - barHeight, barWidth, barHeight)
      
      x += barWidth + 1
      
      // Only draw a portion of the frequencies to fit in the canvas
      if (x > width) break
    }
    
    // Reset shadow for other drawings
    canvasCtx.shadowBlur = 0
    
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
      
      // Time-based effects for club environment
      const time = this.p.millis() * 0.001
      const pulseEffect = Math.sin(time * 3) * 0.5 + 0.5 // Faster pulsing
      
      // Enhanced glow effect with more layers for club environment
      this.p.noStroke()
      for (let i = 0; i < 5; i++) { // More glow layers
        const alpha = this.p.map(i, 0, 5, 0.9, 0.1) // Higher initial opacity
        const glowSize = scaledSize + (i * (this.glowSize + pulseEffect * 2) * scale) // Pulsing glow
        this.p.fill(this.hue, 100, this.brightness, alpha) // Full saturation
        this.p.circle(this.x, this.y, glowSize)
      }
      
      // Draw main particle with higher brightness
      this.p.fill(this.hue, 100, this.brightness + pulseEffect * 10, 1.0) // Full opacity
      this.p.circle(this.x, this.y, scaledSize)
    }
  }
  
  // Kaleidoscope Fragment class for enhanced kaleidoscope visualization
  class KaleidoscopeFragment {
    constructor(p, index, total, radius) {
      this.p = p
      this.index = index
      this.total = total
      this.baseRadius = radius
      this.angle = (index / total) * this.p.TWO_PI
      this.vertices = []
      this.colors = []
      this.generateVertices(5 + Math.floor(Math.random() * 5))
      this.rotationSpeed = this.p.random(0.001, 0.005) * (Math.random() > 0.5 ? 1 : -1)
      this.pulseSpeed = this.p.random(1, 3)
      this.colorSpeed = this.p.random(0.5, 2)
      this.baseHue = this.p.random(360)
      this.lastUpdate = Date.now()
      this.rotation = 0
      
      // Add more properties for enhanced effects
      this.shapeType = Math.floor(this.p.random(4)) // 0: polygon, 1: star, 2: spiral, 3: wave
      this.layerDepth = Math.floor(this.p.random(2, 5)) // Multiple layers per fragment
      this.glowIntensity = this.p.random(0.5, 2)
      this.frequencyBand = Math.floor(this.p.random(4)) // Bass, mid-low, mid-high, high
    }
    
    generateVertices(count) {
      this.vertices = []
      this.colors = []
      
      // Create more complex shapes based on shapeType
      if (this.shapeType === 0) { // Regular polygon
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * this.p.TWO_PI
          const radiusVariation = this.p.random(0.7, 1.3)
          const radius = this.baseRadius * radiusVariation
          
          this.vertices.push({
            angle: angle,
            radius: radius,
            originalRadius: radius,
            pulsePhase: this.p.random(this.p.TWO_PI)
          })
          
          // Assign a color to each vertex for gradient effect
          this.colors.push({
            hue: this.p.random(360),
            saturation: this.p.random(80, 100),
            brightness: this.p.random(70, 100),
            alpha: this.p.random(0.7, 1.0)
          })
        }
      } else if (this.shapeType === 1) { // Star shape
        for (let i = 0; i < count * 2; i++) {
          const angle = (i / (count * 2)) * this.p.TWO_PI
          const isOuter = i % 2 === 0
          const radiusVariation = isOuter ? this.p.random(1.0, 1.5) : this.p.random(0.3, 0.6)
          const radius = this.baseRadius * radiusVariation
          
          this.vertices.push({
            angle: angle,
            radius: radius,
            originalRadius: radius,
            pulsePhase: this.p.random(this.p.TWO_PI)
          })
          
          this.colors.push({
            hue: this.p.random(360),
            saturation: this.p.random(80, 100),
            brightness: this.p.random(70, 100),
            alpha: this.p.random(0.7, 1.0)
          })
        }
      } else if (this.shapeType === 2) { // Spiral
        const spiralTurns = 2 + Math.floor(this.p.random(3))
        for (let i = 0; i < count * spiralTurns; i++) {
          const angle = (i / (count * spiralTurns)) * this.p.TWO_PI * spiralTurns
          const radiusRatio = i / (count * spiralTurns)
          const radius = this.baseRadius * (0.2 + radiusRatio * 0.8)
          
          this.vertices.push({
            angle: angle,
            radius: radius,
            originalRadius: radius,
            pulsePhase: this.p.random(this.p.TWO_PI)
          })
          
          this.colors.push({
            hue: this.p.random(360),
            saturation: this.p.random(80, 100),
            brightness: this.p.random(70, 100),
            alpha: this.p.random(0.7, 1.0)
          })
        }
      } else { // Wave pattern
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * this.p.TWO_PI
          const waveFreq = 3 + Math.floor(this.p.random(5))
          const waveAmp = this.p.random(0.1, 0.3)
          const radiusVariation = 1 + Math.sin(angle * waveFreq) * waveAmp
          const radius = this.baseRadius * radiusVariation
          
          this.vertices.push({
            angle: angle,
            radius: radius,
            originalRadius: radius,
            pulsePhase: this.p.random(this.p.TWO_PI),
            waveFreq: waveFreq,
            waveAmp: waveAmp
          })
          
          this.colors.push({
            hue: this.p.random(360),
            saturation: this.p.random(80, 100),
            brightness: this.p.random(70, 100),
            alpha: this.p.random(0.7, 1.0)
          })
        }
      }
    }
    
    update(audioData, time) {
      const now = Date.now()
      const deltaTime = (now - this.lastUpdate) / 1000
      this.lastUpdate = now
      
      // Get frequency band data for more targeted audio response
      const freqBandSize = Math.floor(audioData.length / 4)
      const bandStart = this.frequencyBand * freqBandSize
      const bandEnd = bandStart + freqBandSize
      
      // Calculate average value for this frequency band
      let bandSum = 0
      for (let i = bandStart; i < bandEnd; i++) {
        bandSum += audioData[i]
      }
      const bandAvg = bandSum / freqBandSize / 255.0
      
      // Enhanced audio-reactive rotation
      const rotationMultiplier = 1 + bandAvg * 3
      this.rotation += this.rotationSpeed * rotationMultiplier * deltaTime * 60
      
      // Update vertices with more complex transformations
      for (let i = 0; i < this.vertices.length; i++) {
        const vertex = this.vertices[i]
        
        // Apply more complex pulsing effect based on audio and time
        const timePulse = Math.sin(time * this.pulseSpeed + vertex.pulsePhase) * 0.3 + 0.7
        const audioPulse = 1 + bandAvg * (0.5 + this.frequencyBand * 0.2)
        
        // Add harmonic motion for more dynamic effect
        let radiusMultiplier = timePulse * audioPulse
        
        // Add wave deformation if applicable
        if (this.shapeType === 3 && vertex.waveFreq) {
          const waveOffset = Math.sin(time * 2 + vertex.angle * vertex.waveFreq) * vertex.waveAmp
          radiusMultiplier *= (1 + waveOffset * bandAvg)
        }
        
        vertex.radius = vertex.originalRadius * radiusMultiplier
        
        // Update color with more complex transitions
        const color = this.colors[i]
        color.hue = (this.baseHue + time * 20 * this.colorSpeed + i * 30 + bandAvg * 60) % 360
        color.saturation = 80 + bandAvg * 20
        color.brightness = 70 + bandAvg * 30
        color.alpha = 0.7 + bandAvg * 0.3
      }
      
      // Occasionally regenerate vertices for more dynamic effect
      // Higher chance with higher audio intensity
      if (Math.random() < 0.001 + bandAvg * 0.01) {
        this.generateVertices(5 + Math.floor(Math.random() * 5))
      }
      
      // Update base hue with audio-reactive speed
      this.baseHue = (this.baseHue + deltaTime * 10 * this.colorSpeed * (1 + bandAvg)) % 360
    }
    
    draw(p, centerX, centerY) {
      p.push()
      p.translate(centerX, centerY)
      p.rotate(this.angle + this.rotation)
      
      // Draw multiple layers for depth effect
      for (let layer = 0; layer < this.layerDepth; layer++) {
        const layerScale = 1 - (layer * 0.15)
        
        // Draw fragment with gradient fill
        p.beginShape()
        
        // Add center point with glow
        const centerColor = this.colors[0]
        p.fill(centerColor.hue, centerColor.saturation, centerColor.brightness, centerColor.alpha * 0.7)
        p.vertex(0, 0)
        
        // Add all vertices
        for (let i = 0; i < this.vertices.length; i++) {
          const vertex = this.vertices[i]
          const x = Math.cos(vertex.angle) * vertex.radius * layerScale
          const y = Math.sin(vertex.angle) * vertex.radius * layerScale
          
          // Set fill color for this vertex
          const color = this.colors[i]
          p.fill(color.hue, color.saturation, color.brightness, color.alpha * (1 - layer * 0.2))
          
          p.vertex(x, y)
        }
        
        // Close shape
        const firstVertex = this.vertices[0]
        const x = Math.cos(firstVertex.angle) * firstVertex.radius * layerScale
        const y = Math.sin(firstVertex.angle) * firstVertex.radius * layerScale
        p.vertex(x, y)
        
        p.endShape(p.CLOSE)
      }
      
      // Add glow effect
      if (this.glowIntensity > 0.8) {
        p.noFill()
        
        // Draw multiple glow layers
        const glowLayers = 5
        for (let g = 0; g < glowLayers; g++) {
          const glowScale = 1 + (g * 0.05)
          const glowAlpha = p.map(g, 0, glowLayers, 0.3, 0) * this.glowIntensity
          
          p.beginShape()
          for (let i = 0; i < this.vertices.length; i++) {
            const vertex = this.vertices[i]
            const x = Math.cos(vertex.angle) * vertex.radius * glowScale
            const y = Math.sin(vertex.angle) * vertex.radius * glowScale
            
            const color = this.colors[i]
            p.stroke(color.hue, color.saturation, color.brightness, glowAlpha)
            p.strokeWeight(3 + g)
            
            if (i === 0) {
              p.vertex(x, y)
            } else {
              p.vertex(x, y)
            }
          }
          
          // Close shape
          const firstVertex = this.vertices[0]
          const x = Math.cos(firstVertex.angle) * firstVertex.radius * glowScale
          const y = Math.sin(firstVertex.angle) * firstVertex.radius * glowScale
          p.vertex(x, y)
          
          p.endShape(p.CLOSE)
        }
      }
      
      p.pop()
    }
  }
  
  // KaleidoscopeParticle class for enhanced particle effects
  class KaleidoscopeParticle {
    constructor(p, centerX, centerY) {
      this.p = p
      this.centerX = centerX
      this.centerY = centerY
      this.reset()
    }
    
    reset() {
      // Position particles in a circular pattern around the center
      const angle = this.p.random(this.p.TWO_PI)
      const distance = this.p.random(50, 300)
      this.x = this.centerX + Math.cos(angle) * distance
      this.y = this.centerY + Math.sin(angle) * distance
      
      // Random size, speed, and color
      this.size = this.p.random(2, 8)
      this.speedX = this.p.random(-1, 1)
      this.speedY = this.p.random(-1, 1)
      this.hue = this.p.random(360)
      this.saturation = this.p.random(80, 100)
      this.brightness = this.p.random(70, 100)
      
      // Particle lifecycle
      this.life = this.p.random(0.5, 1)
      this.maxLife = this.life
      
      // Glow effect properties
      this.glowSize = this.p.random(1.5, 3)
      this.glowIntensity = this.p.random(0.3, 0.7)
      
      // Audio reactivity
      this.frequencyBand = Math.floor(this.p.random(4))
      this.pulsePhase = this.p.random(this.p.TWO_PI)
    }
    
    update(audioData, time, intensity) {
      // Get frequency band data for targeted audio response
      const freqBandSize = Math.floor(audioData.length / 4)
      const bandStart = this.frequencyBand * freqBandSize
      const bandEnd = bandStart + freqBandSize
      
      // Calculate average value for this frequency band
      let bandSum = 0
      for (let i = bandStart; i < bandEnd; i++) {
        bandSum += audioData[i]
      }
      const bandAvg = bandSum / freqBandSize / 255.0
      
      // Update position with audio-reactive speed
      const speedMultiplier = 1 + intensity * 0.5 + bandAvg
      this.x += this.speedX * speedMultiplier
      this.y += this.speedY * speedMultiplier
      
      // Add slight attraction to center
      const dx = this.centerX - this.x
      const dy = this.centerY - this.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance > 50) {
        this.x += dx * 0.001 * intensity
        this.y += dy * 0.001 * intensity
      }
      
      // Update color with time and audio
      this.hue = (this.hue + time * 10 + bandAvg * 20) % 360
      this.brightness = 70 + bandAvg * 30
      
      // Apply pulsing effect based on audio and time
      const pulse = Math.sin(time * 2 + this.pulsePhase) * 0.3 + 0.7
      this.size = this.p.random(2, 8) * pulse * (1 + bandAvg)
      
      // Decrease life
      this.life -= 0.01
      
      // Reset particle if it's dead or out of bounds
      if (this.life <= 0 || 
          this.x < 0 || this.x > this.p.width || 
          this.y < 0 || this.y > this.p.height) {
        this.reset()
      }
    }
    
    draw() {
      // Calculate opacity based on life
      const alpha = (this.life / this.maxLife) * 0.8
      
      // Draw particle with glow effect
      this.p.noStroke()
      
      // Draw multiple glow layers
      const glowLayers = 3
      for (let i = 0; i < glowLayers; i++) {
        const layerAlpha = alpha * this.glowIntensity * (1 - i / glowLayers)
        const layerSize = this.size * this.glowSize * (1 + i)
        
        this.p.fill(this.hue, this.saturation, this.brightness, layerAlpha)
        this.p.circle(this.x, this.y, layerSize)
      }
      
      // Draw main particle
      this.p.fill(this.hue, this.saturation, this.brightness, alpha)
      this.p.circle(this.x, this.y, this.size)
    }
  }
  
  // p5.js sketch
  const sketch = (p) => {
    let particles = []
    const particleCount = activeStyle.value === 'particles3d' ? 500 : 1000
    
    // Kaleidoscope fragments
    let kaleidoscopeFragments = []
    const fragmentCount = 24 // More fragments for more complex pattern
    
    // Kaleidoscope particles for enhanced effects
    let kaleidoscopeParticles = []
    const kaleidoscopeParticleCount = 150
    
    // Shader for post-processing effects
    let shaderEffect
    let shaderCanvas
    let hasShader = false
    
    p.preload = () => {
      // Try to load shader if supported
      try {
        shaderEffect = p.loadShader(
          'https://cdn.jsdelivr.net/gh/aferriss/p5jsShaderExamples@main/4_image-effects/4-2_bloom/effect.vert',
          'https://cdn.jsdelivr.net/gh/aferriss/p5jsShaderExamples@main/4_image-effects/4-2_bloom/effect.frag'
        )
        hasShader = true
      } catch (e) {
        console.warn('Shader not supported or failed to load:', e)
        hasShader = false
      }
    }
    
    p.setup = () => {
      p.createCanvas(window.innerWidth, window.innerHeight)
      p.colorMode(p.HSB, 360, 100, 100, 1)
      p.background(0)
      
      // Try to create shader graphics if supported
      if (hasShader) {
        try {
          shaderCanvas = p.createGraphics(p.width, p.height, p.WEBGL)
          shaderCanvas.noStroke()
        } catch (e) {
          console.warn('Failed to create shader graphics:', e)
          hasShader = false
        }
      }
      
      // Create particles based on active style
      createParticles()
      
      // Create kaleidoscope fragments
      createKaleidoscopeFragments()
    }
    
    // Function to create particles based on active style
    const createParticles = () => {
      if (activeStyle.value === 'particles3d') {
        particles = Array.from({ length: particleCount }, () => new EnhancedParticle(p))
      } else {
        particles = Array.from({ length: particleCount }, () => new Particle(p))
      }
    }
    
    // Function to create kaleidoscope fragments
    const createKaleidoscopeFragments = () => {
      kaleidoscopeFragments = []
      const maxRadius = Math.min(p.width, p.height) * 0.4
      
      for (let i = 0; i < fragmentCount; i++) {
        kaleidoscopeFragments.push(new KaleidoscopeFragment(p, i, fragmentCount, maxRadius))
      }
      
      // Initialize kaleidoscope particles
      kaleidoscopeParticles = []
      const centerX = p.width / 2
      const centerY = p.height / 2
      
      for (let i = 0; i < kaleidoscopeParticleCount; i++) {
        kaleidoscopeParticles.push(new KaleidoscopeParticle(p, centerX, centerY))
      }
    }
    
    p.draw = () => {
      if (!isActive.value) return
      
      // Get audio data
      const dataArray = new Uint8Array(props.audioAnalyser.frequencyBinCount)
      props.audioAnalyser.getByteFrequencyData(dataArray)
      
      // Calculate average intensity
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
      const intensity = p.map(average, 0, 255, 1, 3)
      
      // Current time for animations
      const time = p.millis() * 0.001
      
      // Clear background with trail effect
      p.background(0, 0.1)
      
      // Draw based on active style and layers
      if (activeStyle.value === 'kaleidoscope' && layers.value.find(l => l.id === 'frequency').active) {
        // Draw enhanced kaleidoscope with P5.js
        drawKaleidoscope(dataArray, time, intensity)
      } else if (layers.value.find(l => l.id === 'particles').active) {
        // Draw particles
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
    }
    
    // Function to draw enhanced kaleidoscope with P5.js
    const drawKaleidoscope = (audioData, time, intensity) => {
      const centerX = p.width / 2
      const centerY = p.height / 2
      
      // Apply post-processing with shader if supported
      if (hasShader) {
        try {
          // Draw to shader canvas
          shaderCanvas.clear()
          
          // Update and draw all fragments
          kaleidoscopeFragments.forEach(fragment => {
            fragment.update(audioData, time)
            fragment.draw(shaderCanvas, 0, 0) // Center of WEBGL canvas is 0,0
          })
          
          // Apply enhanced shader effects
          shaderEffect.setUniform('tex0', shaderCanvas)
          shaderEffect.setUniform('time', time)
          shaderEffect.setUniform('intensity', intensity)
          shaderEffect.setUniform('resolution', [p.width, p.height])
          shaderEffect.setUniform('audioLevel', intensity / 3)
          
          // Draw shader result to main canvas
          p.shader(shaderEffect)
          p.rect(0, 0, p.width, p.height)
        } catch (e) {
          console.warn('Shader rendering failed:', e)
          hasShader = false
          
          // Fallback to regular rendering
          kaleidoscopeFragments.forEach(fragment => {
            fragment.update(audioData, time)
            fragment.draw(p, centerX, centerY)
          })
        }
      } else {
        // Regular rendering without shader
        kaleidoscopeFragments.forEach(fragment => {
          fragment.update(audioData, time)
          fragment.draw(p, centerX, centerY)
        })
      }
      
      // Enhanced central glow effect
      const glowSize = 100 + Math.sin(time * 2) * 20 + (intensity * 30)
      const glowLayers = 15 // Increased from 10
      
      for (let i = 0; i < glowLayers; i++) {
        const alpha = p.map(i, 0, glowLayers, 0.9, 0) // Increased from 0.8
        const size = glowSize * (1 - i / glowLayers)
        const hue = (time * 50) % 360
        
        p.noStroke()
        p.fill(hue, 100, 100, alpha)
        p.circle(centerX, centerY, size)
      }
      
      // Draw enhanced radiating lines
      const lineCount = 36 // Increased from 24
      const maxLineLength = Math.min(p.width, p.height) * 0.5
      
      // Draw multiple sets of lines for more complex patterns
      for (let set = 0; set < 3; set++) {
        const setOffset = set * (p.TWO_PI / 3)
        const setSpeed = 0.2 + set * 0.1
        
        for (let i = 0; i < lineCount; i++) {
          const angle = (i / lineCount) * p.TWO_PI + time * setSpeed + setOffset
          const audioIndex = Math.floor((i / lineCount) * audioData.length)
          const audioValue = audioData[audioIndex] / 255.0
          
          // More dynamic line length calculation
          const lineLength = maxLineLength * (0.3 + audioValue * 0.7) * (0.7 + set * 0.15)
          
          // Add wave pattern to lines
          const waveFreq = 5 + set * 3
          const waveAmp = 0.1 + audioValue * 0.1
          
          p.beginShape()
          for (let j = 0; j < 10; j++) {
            const segmentRatio = j / 9
            const segmentLength = lineLength * segmentRatio
            const waveOffset = Math.sin(segmentRatio * waveFreq + time * 3) * waveAmp * segmentLength
            
            const x = centerX + Math.cos(angle) * segmentLength + Math.cos(angle + p.HALF_PI) * waveOffset
            const y = centerY + Math.sin(angle) * segmentLength + Math.sin(angle + p.HALF_PI) * waveOffset
            
            if (j === 0) {
              p.vertex(centerX, centerY)
            } else {
              p.vertex(x, y)
            }
          }
          
          // Enhanced color with audio-reactive hue shift
          const hue = (time * 50 + i * (360 / lineCount) + audioValue * 60) % 360
          p.stroke(hue, 100, 100, 0.4 + audioValue * 0.3)
          p.strokeWeight(1 + audioValue * 4)
          p.noFill()
          p.endShape()
        }
      }
      
      // Update and draw kaleidoscope particles
      kaleidoscopeParticles.forEach(particle => {
        particle.update(audioData, time, intensity)
        particle.draw()
      })
      
      // Occasionally spawn new particles based on audio intensity
      if (Math.random() < 0.05 * intensity) {
        const burstCount = Math.floor(5 + intensity * 5)
        for (let i = 0; i < burstCount; i++) {
          const index = Math.floor(Math.random() * kaleidoscopeParticles.length)
          kaleidoscopeParticles[index].reset()
        }
      }
    
    p.windowResized = () => {
      p.resizeCanvas(window.innerWidth, window.innerHeight)
      
      // Resize shader canvas if it exists
      if (hasShader && shaderCanvas) {
        shaderCanvas.resizeCanvas(p.width, p.height)
      }
      
      // Recreate kaleidoscope fragments for new dimensions
      createKaleidoscopeFragments()
    }
    
    // Watch for style changes and recreate particles
    watch(() => activeStyle.value, (newStyle) => {
      console.log('Visualization style changed to:', newStyle)
      createParticles()
      createKaleidoscopeFragments()
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
