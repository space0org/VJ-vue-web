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

// Animation IDs
let waveformAnimationId = null
let frequencyAnimationId = null
let p5Instance = null

// Data arrays
let waveformDataArray = null
let frequencyDataArray = null

// Color animation variables
let colorHue = 0
let lastColorUpdateTime = 0
let rainbowSpeed = 0.5 // 虹色の変化速度（基本値）

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
    
    // Clear with solid black background (no trail effect)
    canvasCtx.fillStyle = 'rgb(0, 0, 0)'
    canvasCtx.fillRect(0, 0, width, height)
    
   // Draw waveform with increased line width
    canvasCtx.lineWidth = 5
    
    // Animate color based on time and audio intensity
    const now = performance.now()
    if (now - lastColorUpdateTime > 50) { // Update color every 50ms
      // Calculate average intensity from waveform data
      const sum = waveformDataArray.reduce((acc, val) => acc + Math.abs(val - 128), 0)
      const avgIntensity = sum / waveformDataArray.length
      
      // Adjust color change speed based on audio intensity
      const speedFactor = Math.max(1, avgIntensity / 20)
      
      // Update color hue - always increment for continuous rainbow effect
      colorHue = (colorHue + rainbowSpeed * speedFactor) % 360
      
      lastColorUpdateTime = now
    }
    
    // Use HSL color for the waveform with the animated hue
    // Adjust saturation and brightness based on audio intensity for more dynamic effect
    const saturation = 100
    const brightness = Math.min(100, 50 + avgIntensity / 2)
    canvasCtx.strokeStyle = `hsl(${colorHue}, ${saturation}%, ${brightness}%)`
    
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
    
    // Use the animated base hue for frequency visualization
    const baseHue = colorHue
    
    for (let i = 0; i < frequencyDataArray.length; i++) {
      const barHeight = (frequencyDataArray[i] / 255) * height
      
      // Create rainbow spectrum effect by distributing hues across bars
      // This creates a continuous rainbow that also moves with the global colorHue
      const hue = (baseHue + (i / frequencyDataArray.length * 360)) % 360
      const saturation = 100
      
      // Make brightness respond to audio intensity
      const brightness = Math.min(100, 50 + (frequencyDataArray[i] / 255) * 50)
      
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
      
      // Follow global colorHue with slight variation for visual interest
      // Smaller random range (-15, 15) for more consistent rainbow effect
      this.hue = (colorHue + this.p.random(-15, 15)) % 360
      
      if (this.x < 0 || this.x > this.p.width || 
          this.y < 0 || this.y > this.p.height) {
        this.reset()
      }
    }
    
    draw() {
      this.p.noStroke()
      
      // Make saturation and brightness respond to intensity
      // Higher base saturation (90) for more vibrant rainbow colors
      const saturation = 90 + this.p.random(-10, 10)
      const brightness = 85 + this.p.random(-10, 10)
      
      this.p.fill(this.hue, saturation, brightness, 0.7)
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
