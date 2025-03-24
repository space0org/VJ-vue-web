<template>
  <div class="relative">
   <div 
      ref="vjContainer" 
     :class="[
        'vj-overlay fixed inset-0 transition-all duration-300 ease-in-out bg-black',
        isActive ? 'z-[9999] opacity-100 vj-active' : 'z-[-1] opacity-0 pointer-events-none'
      ]"
    >
      <!-- Layer controls removed as requested -->
      
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
      
      <!-- Fractal visualization layer - moved to top for visibility -->
      <div 
        ref="fractalContainer" 
        class="absolute inset-0 w-full h-full z-50 pointer-events-none"
        style="mix-blend-mode: lighten; opacity: 1; position: absolute; top: 0; left: 0; right: 0; bottom: 0;"
      ></div>
      
      <!-- Audio Variables Layer - displays real-time audio variables -->
      <AudioVariablesLayer
        v-if="audioVariablesActive && props.audioAnalyser"
        :audioAnalyser="props.audioAnalyser"
        :isActive="isActive"
      />
      
      <!-- Controls overlay - only visible when mouse moves -->
      <div 
        v-if="showControls"
        class="absolute bottom-0 left-0 right-0 p-4 bg-black/50 transition-opacity duration-300"
        :class="controlsVisible ? 'opacity-100' : 'opacity-0'"
      >
        <div class="flex justify-between items-center">
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
import FractalVisualizer from './FractalVisualizer.vue'
import AudioVariablesLayer from './AudioVariablesLayer.vue'

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
  },
  version: {
    type: Object,
    default: () => ({
      id: 'v1',
      config: {
        maxDepth: 8,
        branchCount: 36,
        branchThickness: { min: 3, max: 10 },
        maxLength: { min: 150, max: 300 },
        angleVelocity: 0.01,
        colorOffset: 0.5,
        intensity: { min: 2.0, max: 5.0 }
      }
    })
  }
})

const emit = defineEmits(['close'])

const vjContainer = ref(null)
const waveformCanvas = ref(null)
const frequencyCanvas = ref(null)
const particleContainer = ref(null)
const fractalContainer = ref(null)
// Use local isActive state that syncs with props
const isActive = ref(props.isActive)
const showControls = ref(true)
const controlsVisible = ref(true)
let controlsTimeout = null

// Visualization layers
const layers = ref([
  { id: 'waveform', name: '波形', active: true },
  { id: 'particles', name: 'パーティクル', active: true },
  { id: 'frequency', name: '周波数', active: true },
  { id: 'fractal', name: 'フラクタル', active: true },
  { id: 'audioVariables', name: '音声変数', active: true }
])

// Audio variables layer state
const audioVariablesActive = ref(true)

// Debug log layers
console.log('VJModeOverlay: Layers configuration:', layers.value)

// Animation IDs
let waveformAnimationId = null
let frequencyAnimationId = null
let p5Instance = null

// Data arrays
let waveformDataArray = null
let frequencyDataArray = null

// Theme colors
const getThemeColors = (theme) => {
  switch (theme) {
    case 'cool':
      return { hueStart: 180, hueEnd: 240 }
    case 'warm':
      return { hueStart: 0, hueEnd: 60 }
    case 'forest':
      return { hueStart: 90, hueEnd: 150 }
    case 'sunset':
      return { hueStart: 0, hueEnd: 60, saturation: 100, brightness: 100 }
    default:
      return { hueStart: 0, hueEnd: 360 }
  }
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
    initFractalVisualization()
    
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
    
    // Update audio variables layer state
    if (layerId === 'audioVariables') {
      audioVariablesActive.value = layer.active
    }
  }
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
    
    // Use cool cyan blue color for waveform
    canvasCtx.strokeStyle = 'rgb(0, 191, 255)' // Changed to a cool cyan blue color
    
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
  
  // Particle class
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
      this.hue = (this.hue + 0.5) % 360
      
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
  
  // p5.js sketch
  const sketch = (p) => {
    let particles = []
    const particleCount = 1000
    
    p.setup = () => {
      p.createCanvas(window.innerWidth, window.innerHeight)
      p.colorMode(p.HSB, 360, 100, 100, 1)
      p.background(0)
      
      particles = Array.from({ length: particleCount }, () => new Particle(p))
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
      particles.forEach(particle => {
        particle.update(intensity)
        particle.draw()
      })
    }
    
    p.windowResized = () => {
      p.resizeCanvas(window.innerWidth, window.innerHeight)
    }
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
      initFractalVisualization()
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
      initFractalVisualization()
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
        initFractalVisualization()
      }, 50)
    }
  })
  
  // Listen for version change events
  window.addEventListener('version-changed', (event) => {
    if (event.detail && event.detail.version) {
      console.log('VJModeOverlay: Received version change event:', event.detail.version.name)
      
      // Reinitialize fractal visualization with new version
      if (isActive.value) {
        setTimeout(() => {
          initFractalVisualization()
        }, 50)
      }
    }
  })
})

// Initialize fractal visualization
const initFractalVisualization = () => {
  if (!fractalContainer.value) return
  console.log('VJModeOverlay: Initializing fractal visualization with analyser:', props.audioAnalyser)
  if (!props.audioAnalyser) {
    console.warn('VJModeOverlay: No audio analyser available for fractal visualization')
    return
  }
  
  const fractalLayer = layers.value.find(l => l.id === 'fractal')
  if (!fractalLayer || !fractalLayer.active) {
    console.log('VJModeOverlay: Fractal layer is inactive or not found, skipping initialization')
    return
  }
  
  // Clear previous content
  while (fractalContainer.value.firstChild) {
    fractalContainer.value.removeChild(fractalContainer.value.firstChild)
  }
  
  // Theme color helper function
  const getThemeColors = (theme) => {
    switch (theme) {
      case 'cool':
        return { hueStart: 180, hueEnd: 240 }
      case 'warm':
        return { hueStart: 0, hueEnd: 60 }
      case 'forest':
        return { hueStart: 90, hueEnd: 150 }
      case 'sunset':
        return { hueStart: 0, hueEnd: 60, saturation: 100, brightness: 100 }
      default:
        return { hueStart: 0, hueEnd: 360 }
    }
  }
  
  // Fractal class
  class FractalSystem {
   constructor(p, audioData) {
      this.p = p
      this.audioData = audioData
      this.branches = []
      this.maxDepth = props.version.config.maxDepth || 8
      this.angle = 0
      this.angleVelocity = props.version.config.angleVelocity || 0.01
      this.centerX = p.width / 2
      this.centerY = p.height / 2
      this.colors = getThemeColors(props.theme)
      this.colorOffset = props.version.config.colorOffset || 0
      // Store frequency-specific intensities for more detailed audio reactivity
      this.bassIntensity = 0
      this.midIntensity = 0
      this.highIntensity = 0
      this.initBranches()
      
      // Debug message
      console.log('FractalSystem initialized with dimensions:', p.width, 'x', p.height)
    }

    initBranches() {
      const branchCount = props.version.config.branchCount || 36
      for (let i = 0; i < branchCount; i++) {
        const angle = (i / branchCount) * this.p.TWO_PI
        const thicknessConfig = props.version.config.branchThickness || { min: 3, max: 10 }
        const lengthConfig = props.version.config.maxLength || { min: 150, max: 300 }
        
        this.branches.push({
          angle: angle,
          length: 0,
          maxLength: this.p.random(lengthConfig.min, lengthConfig.max),
          growing: true,
          children: [],
          depth: 0,
          hue: this.p.random(this.colors.hueStart, this.colors.hueEnd),
          thickness: this.p.random(thicknessConfig.min, thicknessConfig.max)
        })
      }
    }

    update(audioIntensity, bassIntensity, midIntensity, highIntensity) {
      // Store frequency-specific intensities for use in branch updates
      this.bassIntensity = bassIntensity || 0
      this.midIntensity = midIntensity || 0
      this.highIntensity = highIntensity || 0
      
      this.angle += this.angleVelocity * (audioIntensity + bassIntensity * 0.5) // More responsive rotation
      this.colorOffset = (this.colorOffset + 0.5) % 360 // Cycle through colors
      
      // Update existing branches
      this.updateBranch(this.branches, audioIntensity)
      
      // Add new branches occasionally based on audio intensity
      if (this.p.random() < 0.1 * audioIntensity && this.branches.length < 30) { // More branches
        const angle = this.p.random(this.p.TWO_PI)
        this.branches.push({
          angle: angle,
          length: 0,
          maxLength: this.p.random(200, 400), // Even longer branches
          growing: true,
          children: [],
          depth: 0,
          hue: (this.p.random(this.colors.hueStart, this.colors.hueEnd) + this.colorOffset) % 360,
          thickness: this.p.random(5, 12) // Even thicker branches
        })
      }
      
      // Debug message every 30 frames
      if (this.p.frameCount % 30 === 0) {
        console.log('FractalSystem update with branches:', this.branches.length, 'intensity:', audioIntensity)
      }
    }
    
    updateBranch(branches, audioIntensity) {
      for (let i = branches.length - 1; i >= 0; i--) {
        const branch = branches[i]
        
        if (branch.growing) {
          // For inward contraction effect, we start with full length and decrease
          if (branch.length === 0) {
            branch.length = branch.maxLength; // Start at full length
          } else {
            // Use frequency-specific intensity for more dynamic contraction
            const contractionSpeed = 1.0 * audioIntensity * (1.0 + (this.bassIntensity * 0.5));
            branch.length -= contractionSpeed; // Contract inward with variable speed
          }
          
          // Create child branches when parent contracts to certain length
          if (branch.length < branch.maxLength * (0.5 - this.midIntensity * 0.2) && // Dynamic threshold based on mid frequencies
              branch.children.length < Math.min(4, Math.floor(3 + this.highIntensity * 2)) && // Variable child count based on high frequencies
              branch.depth < this.maxDepth && 
              this.p.random() < (0.05 + this.bassIntensity * 0.1) * audioIntensity) {
            
            // Create multiple branches with varying angles for more complexity
            const baseAngleOffset = this.p.random(0.2, 0.5) // Reduced range for tighter patterns
            
            // First branch - slightly right
            branch.children.push({
              angle: branch.angle + baseAngleOffset,
              length: 0,
              maxLength: branch.maxLength * 0.65, // Adjusted for better proportions
              growing: true,
              children: [],
              depth: branch.depth + 1,
              hue: (branch.hue + 30 + this.colorOffset) % 360, // Added colorOffset for more variety
              thickness: branch.thickness * 0.7
            })
            
            // Second branch - slightly left
            branch.children.push({
              angle: branch.angle - baseAngleOffset,
              length: 0,
              maxLength: branch.maxLength * 0.65, // Adjusted for better proportions
              growing: true,
              children: [],
              depth: branch.depth + 1,
              hue: (branch.hue + 60 + this.colorOffset) % 360, // Added colorOffset for more variety
              thickness: branch.thickness * 0.7
            })
            
            // Third branch - random angle for more variety (only at lower depths)
            if (branch.depth < 3 && this.p.random() < 0.7) {
              const randomAngle = branch.angle + this.p.random(-0.3, 0.3)
              branch.children.push({
                angle: randomAngle,
                length: 0,
                maxLength: branch.maxLength * 0.5,
                growing: true,
                children: [],
                depth: branch.depth + 1,
                hue: (branch.hue + 90 + this.colorOffset) % 360, // Added colorOffset for more variety
                thickness: branch.thickness * 0.6
              })
            }
          }
          
          // Reset branch when it contracts to near zero
          if (branch.length <= 1) {
            // Reset branch to start the cycle again for infinite fractal effect
            branch.length = branch.maxLength;
            branch.children = []; // Clear children for new generation
            branch.hue = (branch.hue + 30 + this.colorOffset) % 360; // Shift hue for visual variety
          }
        } else {
          // For non-growing branches (should be rare with inward contraction)
          branch.thickness -= 0.01
          if (branch.thickness <= 0) {
            branches.splice(i, 1)
          }
        }
        
        // Update children recursively
        this.updateBranch(branch.children, audioIntensity)
      }
    }
    
    draw() {
      this.p.push()
      this.p.translate(this.centerX, this.centerY)
      this.p.rotate(this.angle)
      
      for (const branch of this.branches) {
        this.drawBranch(branch, 0, 0)
      }
      
      this.p.pop()
    }
    
    drawBranch(branch, startX, startY) {
      const endX = startX + Math.cos(branch.angle) * branch.length
      const endY = startY + Math.sin(branch.angle) * branch.length
      
      // Draw the branch with extreme brightness and thickness
      this.p.strokeWeight(branch.thickness * 3) // Reduced from 5 to 3 for finer lines
      this.p.stroke(branch.hue, 100, 100, 0.9) // Slightly reduced opacity for layering effect
      this.p.line(startX, startY, endX, endY)
      
      // Draw a much larger, brighter circle at the end
      this.p.noStroke()
      this.p.fill(branch.hue, 100, 100, 0.9) // Slightly reduced opacity
      this.p.circle(endX, endY, branch.thickness * 8) // Reduced from 12 for finer detail
      
      // Add multiple glow effects with varying sizes and opacities for more detailed appearance
      this.p.fill(branch.hue, 100, 100, 0.6)
      this.p.circle(endX, endY, branch.thickness * 15)
      
      this.p.fill(branch.hue, 100, 100, 0.4)
      this.p.circle(endX, endY, branch.thickness * 25)
      
      this.p.fill(branch.hue, 100, 100, 0.2)
      this.p.circle(endX, endY, branch.thickness * 35)
      
      this.p.fill(branch.hue, 100, 100, 0.1)
      this.p.circle(endX, endY, branch.thickness * 50)
      
      // Add small detail circles along the branch for more intricate patterns
      if (branch.length > 20) {
        const midX = startX + Math.cos(branch.angle) * (branch.length * 0.5)
        const midY = startY + Math.sin(branch.angle) * (branch.length * 0.5)
        
        this.p.fill((branch.hue + 30) % 360, 100, 100, 0.7)
        this.p.circle(midX, midY, branch.thickness * 4)
        
        // Add even more detail with smaller circles at quarter points
        if (branch.length > 40) {
          const quarterX = startX + Math.cos(branch.angle) * (branch.length * 0.25)
          const quarterY = startY + Math.sin(branch.angle) * (branch.length * 0.25)
          const threeQuarterX = startX + Math.cos(branch.angle) * (branch.length * 0.75)
          const threeQuarterY = startY + Math.sin(branch.angle) * (branch.length * 0.75)
          
          this.p.fill((branch.hue + 60) % 360, 100, 100, 0.5)
          this.p.circle(quarterX, quarterY, branch.thickness * 2)
          this.p.circle(threeQuarterX, threeQuarterY, branch.thickness * 2)
        }
      }
      
      // Draw children recursively
      for (const child of branch.children) {
        this.drawBranch(child, endX, endY)
      }
    }
  }
  
  // Helper function to calculate average value in a frequency range
  const calculateFrequencyBandAverage = (dataArray, startIndex, endIndex) => {
    let sum = 0;
    let count = 0;
    
    // Ensure indices are within bounds
    startIndex = Math.max(0, Math.min(startIndex, dataArray.length - 1));
    endIndex = Math.max(0, Math.min(endIndex, dataArray.length - 1));
    
    for (let i = startIndex; i <= endIndex; i++) {
      sum += dataArray[i];
      count++;
    }
    
    return count > 0 ? sum / (count * 255) : 0; // Normalize to 0-1 range
  };
  
  // p5.js sketch
  const sketch = (p) => {
    let canvas = null
    let fractalSystem = null
    
    p.setup = () => {
      canvas = p.createCanvas(window.innerWidth, window.innerHeight)
      canvas.parent(fractalContainer.value)
      
      p.colorMode(p.HSB, 360, 100, 100, 1)
      p.background(0)
      
      // Initialize fractal system
      fractalSystem = new FractalSystem(p, [])
      
      console.log('Fractal visualizer setup completed successfully')
    }
    
    p.draw = () => {
      if (!isActive.value) return
      if (!layers.value.find(l => l.id === 'fractal').active) {
        // Skip drawing if layer is inactive
        return
      }
      
      p.background(0, 0) // Completely transparent background
      
      try {
        // Get audio data
        const dataArray = new Uint8Array(props.audioAnalyser.frequencyBinCount)
        props.audioAnalyser.getByteFrequencyData(dataArray)
        
        // Calculate average intensity with more dynamic range for mock audio
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
        const intensityConfig = props.version.config.intensity || { min: 2.0, max: 5.0 }
        const intensity = p.map(average, 0, 255, intensityConfig.min, intensityConfig.max)
        
        // Calculate frequency band averages for more detailed audio reactivity
        const bassAvg = calculateFrequencyBandAverage(dataArray, 0, 10);
        const midAvg = calculateFrequencyBandAverage(dataArray, 10, 100);
        const highAvg = calculateFrequencyBandAverage(dataArray, 100, 255);
        
        // Update and draw fractal system with enhanced audio responsiveness
        fractalSystem.update(intensity, bassAvg, midAvg, highAvg)
        fractalSystem.draw()
        
        // Debug visualization
        p.fill(255, 0, 0)
        p.noStroke()
        p.circle(p.width/2, p.height/2, 10) // Red dot at center to confirm rendering
        
        console.log('Fractal drawing at frame:', p.frameCount, 'with intensity:', intensity)
      } catch (error) {
        console.error('Error in fractal visualizer draw loop:', error)
      }
    }
    
    p.windowResized = () => {
      p.resizeCanvas(window.innerWidth, window.innerHeight)
      
      // Update center position
      if (fractalSystem) {
        fractalSystem.centerX = p.width / 2
        fractalSystem.centerY = p.height / 2
      }
    }
  }
  
  // Create p5 instance
  new p5(sketch, fractalContainer.value)
  
  console.log('VJModeOverlay: Fractal visualization initialized')
}


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
