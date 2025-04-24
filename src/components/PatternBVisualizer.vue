<template>
  <div class="relative">
    <div 
      ref="canvasContainer" 
      :class="[
        'transition-all duration-300 ease-in-out bg-black',
        isFullscreen ? 'fixed inset-0 z-50' : 'w-full h-64 rounded-lg mt-4'
      ]"
      style="mix-blend-mode: screen; z-index: 40;"
    >
      <!-- p5.js canvas will be mounted here -->
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import p5 from 'p5'

const props = defineProps({
  audioAnalyser: {
    type: Object,
    required: true,
    validator: (value) => {
      return value && typeof value.getByteFrequencyData === 'function' && 
             typeof value.frequencyBinCount === 'number'
    }
  },
  theme: {
    type: String,
    default: 'default'
  },
  version: {
    type: Object,
    default: () => ({
      id: 'pattern-b-v1',
      type: 'pattern-b',
      config: {
        particleCount: 200,
        particleSize: { min: 2, max: 8 },
        speed: { min: 0.5, max: 2.0 },
        colorShift: 0.5,
        opacity: 0.8,
        blendMode: 'screen',
        frequencyResponse: { bass: 1.2, mid: 1.0, high: 0.8 }
      }
    })
  }
})

const emit = defineEmits(['version-changed'])
const canvasContainer = ref(null)
const isFullscreen = ref(false)
let p5Instance = null

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

// Pattern B visualization implementation
class PatternBSystem {
  constructor(p, config) {
    this.p = p
    this.particles = []
    this.centerX = p.width / 2
    this.centerY = p.height / 2
    this.config = config || {}
    this.particleCount = this.config.particleCount || 200
    this.colorShift = this.config.colorShift || 0.5
    this.blendMode = this.config.blendMode || 'screen'
    this.colors = getThemeColors(props.theme)
    
    // Initialize particles
    this.initParticles()
    
    console.log('PatternBSystem initialized with config:', this.config)
  }
  
  initParticles() {
    this.particles = []
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push(this.createParticle())
    }
  }
  
  createParticle() {
    const sizeConfig = this.config.particleSize || { min: 2, max: 8 }
    const speedConfig = this.config.speed || { min: 0.5, max: 2.0 }
    
    return {
      x: this.p.random(this.p.width),
      y: this.p.random(this.p.height),
      size: this.p.random(sizeConfig.min, sizeConfig.max),
      speedX: this.p.random(-speedConfig.min, speedConfig.max),
      speedY: this.p.random(-speedConfig.min, speedConfig.max),
      hue: this.p.random(this.colors.hueStart, this.colors.hueEnd),
      opacity: this.config.opacity || 0.8,
      life: this.p.random(50, 200),
      maxLife: this.p.random(50, 200)
    }
  }
  
  update(audioIntensity, bassIntensity, midIntensity, highIntensity) {
    // Apply frequency response modifiers
    const freqResponse = this.config.frequencyResponse || { bass: 1.0, mid: 1.0, high: 1.0 }
    const bassEffect = bassIntensity * freqResponse.bass
    const midEffect = midIntensity * freqResponse.mid
    const highEffect = highIntensity * freqResponse.high
    
    // Update particles based on audio data
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      
      // Apply audio-reactive movement
      p.x += p.speedX * (1 + bassEffect * 2)
      p.y += p.speedY * (1 + midEffect * 2)
      
      // Size pulsation based on mid frequencies
      p.displaySize = p.size * (1 + midEffect * 3)
      
      // Color shifting based on high frequencies
      p.hue = (p.hue + this.colorShift * highEffect) % 360
      
      // Decrease life
      p.life -= 1
      
      // Opacity based on life and high frequencies
      p.opacity = (p.life / p.maxLife) * (this.config.opacity || 0.8) * (1 + highEffect * 0.5)
      
      // Replace dead particles
      if (p.life <= 0 || 
          p.x < -p.size || p.x > this.p.width + p.size || 
          p.y < -p.size || p.y > this.p.height + p.size) {
        this.particles[i] = this.createParticle()
      }
    }
    
    // Add new particles based on bass intensity
    if (this.p.random() < bassEffect * 0.3 && this.particles.length < this.particleCount * 1.5) {
      this.particles.push(this.createParticle())
    }
    
    // Remove excess particles if needed
    if (this.particles.length > this.particleCount * 1.5) {
      this.particles.splice(0, this.particles.length - this.particleCount)
    }
  }
  
  draw() {
    // Set blend mode for interesting visual effects
    if (this.blendMode === 'screen') {
      this.p.blendMode(this.p.SCREEN)
    } else if (this.blendMode === 'lighten') {
      this.p.blendMode(this.p.LIGHTEN)
    } else if (this.blendMode === 'add') {
      this.p.blendMode(this.p.ADD)
    } else {
      this.p.blendMode(this.p.BLEND)
    }
    
    // Draw all particles
    for (const particle of this.particles) {
      this.p.noStroke()
      
      // Draw main particle
      this.p.fill(particle.hue, 100, 100, particle.opacity)
      this.p.circle(particle.x, particle.y, particle.displaySize)
      
      // Draw glow effect
      this.p.fill(particle.hue, 100, 100, particle.opacity * 0.5)
      this.p.circle(particle.x, particle.y, particle.displaySize * 2)
      
      this.p.fill(particle.hue, 100, 100, particle.opacity * 0.2)
      this.p.circle(particle.x, particle.y, particle.displaySize * 4)
    }
    
    // Reset blend mode
    this.p.blendMode(this.p.BLEND)
  }
  
  // Handle window resize
  resize(width, height) {
    this.centerX = width / 2
    this.centerY = height / 2
  }
}

// Helper function to calculate average value in a frequency range
const calculateBandAverage = (dataArray, startIdx, endIdx) => {
  let sum = 0
  let count = 0
  
  const start = Math.max(0, Math.min(startIdx, dataArray.length - 1))
  const end = Math.max(0, Math.min(endIdx, dataArray.length - 1))
  
  for (let i = start; i <= end; i++) {
    sum += dataArray[i]
    count++
  }
  
  return count > 0 ? (sum / count) / 255 : 0
}

// Create p5 instance and setup visualization
const createVisualization = () => {
  if (p5Instance) {
    p5Instance.remove()
  }
  
  if (!canvasContainer.value) {
    console.error('Canvas container not available')
    return
  }
  
  const sketch = (p) => {
    let patternBSystem = null
    
    p.setup = () => {
      try {
        const width = canvasContainer.value.clientWidth
        const height = canvasContainer.value.clientHeight
        
        const canvas = p.createCanvas(width, height)
        canvas.parent(canvasContainer.value)
        
        p.colorMode(p.HSB, 360, 100, 100, 1)
        p.background(0)
        
        // Initialize Pattern B system with current version config
        patternBSystem = new PatternBSystem(p, props.version.config)
        
        console.log('Pattern B visualizer setup completed successfully')
      } catch (error) {
        console.error('Failed to setup Pattern B visualizer:', error)
      }
    }
    
    p.draw = () => {
      if (!props.audioAnalyser) {
        return
      }
      
      p.clear()
      p.background(0, 0.1) // Slight trail effect
      
      try {
        // Get audio data
        const dataArray = new Uint8Array(props.audioAnalyser.frequencyBinCount)
        props.audioAnalyser.getByteFrequencyData(dataArray)
        
        // Calculate average intensity
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
        const intensity = p.map(average, 0, 255, 1, 3)
        
        // Calculate frequency bands for more detailed audio analysis
        const bassAvg = calculateBandAverage(dataArray, 0, 10)
        const midAvg = calculateBandAverage(dataArray, 10, 100)
        const highAvg = calculateBandAverage(dataArray, 100, 255)
        
        // Update and draw Pattern B system
        patternBSystem.update(intensity, bassAvg, midAvg, highAvg)
        patternBSystem.draw()
      } catch (error) {
        console.error('Error in Pattern B visualizer draw loop:', error)
      }
    }
    
    p.windowResized = () => {
      if (!canvasContainer.value) return
      
      try {
        const width = canvasContainer.value.clientWidth
        const height = canvasContainer.value.clientHeight
        
        p.resizeCanvas(width, height)
        
        // Update center position
        if (patternBSystem) {
          patternBSystem.resize(width, height)
        }
      } catch (error) {
        console.error('Failed to resize Pattern B visualizer canvas:', error)
      }
    }
  }
  
  p5Instance = new p5(sketch)
}

// Initialize visualization on mount
onMounted(() => {
  console.log('PatternBVisualizer mounted')
  if (canvasContainer.value && props.audioAnalyser) {
    createVisualization()
  } else {
    console.warn('Canvas container or audio analyser not available during mount')
  }
})

// Clean up on unmount
onUnmounted(() => {
  console.log('PatternBVisualizer unmounting')
  if (p5Instance) {
    p5Instance.remove()
    p5Instance = null
  }
})

// Watch for changes in the version prop
watch(() => props.version, (newVersion) => {
  console.log('PatternBVisualizer: Version changed to', newVersion.id)
  if (p5Instance) {
    createVisualization()
  }
}, { deep: true })

// Watch for changes in the audio analyser
watch(() => props.audioAnalyser, (newAnalyser) => {
  console.log('PatternBVisualizer: Audio analyser changed')
  if (newAnalyser && canvasContainer.value) {
    createVisualization()
  }
})

// Listen for version change events
const handleVersionChange = (event) => {
  if (event.detail && event.detail.version && 
      event.detail.version.type === 'pattern-b') {
    console.log('PatternBVisualizer: Received version change event:', event.detail.version.name)
    createVisualization()
  }
}

onMounted(() => {
  window.addEventListener('version-changed', handleVersionChange)
})

onUnmounted(() => {
  window.removeEventListener('version-changed', handleVersionChange)
})
</script>
