<template>
  <div class="relative">
    <div 
      ref="canvasContainer" 
      :class="[
        'transition-all duration-300 ease-in-out bg-black',
        isFullscreen ? 'fixed inset-0 z-50' : 'w-full h-64 rounded-lg mt-4'
      ]"
    >
      <!-- p5.js canvas will be mounted here -->
    </div>
    <button 
      @click="toggleFullscreen" 
      class="absolute bottom-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
    >
      <svg v-if="!isFullscreen" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
      </svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
      </svg>
    </button>
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
  }
})

const canvasContainer = ref(null)
const isFullscreen = ref(false)
let p5Instance = null
let particles = []
const particleCount = 1000
let hueOffset = 0

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
    this.hue = this.p.random(360)
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

const sketch = (p) => {
  let canvas = null

  const initializeCanvas = () => {
    if (!canvasContainer.value) {
      console.error('Canvas container not available during p5 setup')
      return false
    }

    try {
      const width = canvasContainer.value.clientWidth
      const height = canvasContainer.value.clientHeight

      console.log('Creating canvas with dimensions:', { width, height })
      canvas = p.createCanvas(width, height)
      canvas.parent(canvasContainer.value)
      
      return true
    } catch (error) {
      console.error('Failed to create canvas:', error)
      return false
    }
  }

  p.setup = () => {
    if (!initializeCanvas()) return

    try {
      p.colorMode(p.HSB, 360, 100, 100, 1)
      p.background(0)

      particles = Array.from({ length: particleCount }, () => new Particle(p))
      console.log('P5 sketch setup completed successfully')
    } catch (error) {
      console.error('Failed to setup p5 sketch:', error)
    }
  }

  p.draw = () => {
    if (!props.audioAnalyser) {
      console.error('Audio analyser not available during draw')
      return
    }

    p.background(0, 0.1)
    
    try {
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
      
      hueOffset = (hueOffset + 0.5) % 360
    } catch (error) {
      console.error('Error in p5 draw loop:', error)
    }
  }

  p.windowResized = () => {
    if (!canvasContainer.value) {
      console.error('Canvas container not available during resize')
      return
    }

    try {
      const width = canvasContainer.value.clientWidth
      const height = canvasContainer.value.clientHeight
      
      console.log('Resizing canvas to:', { width, height })
      p.resizeCanvas(width, height)
    } catch (error) {
      console.error('Failed to resize canvas:', error)
    }
  }
}

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
  // Allow time for the container to resize before resizing the canvas
  setTimeout(() => {
    if (p5Instance) {
      p5Instance.resizeCanvas(
        canvasContainer.value.clientWidth,
        canvasContainer.value.clientHeight
      )
    }
  }, 300)
}

onMounted(() => {
  if (!canvasContainer.value) {
    console.error('Canvas container not found during mount')
    return
  }
  
  if (!props.audioAnalyser) {
    console.error('Audio analyser not provided during mount')
    return
  }

  try {
    p5Instance = new p5(sketch)
    console.log('P5 instance created successfully')
  } catch (error) {
    console.error('Failed to create P5 instance:', error)
  }
})

onUnmounted(() => {
  if (p5Instance) {
    p5Instance.remove()
  }
})

// Resize canvas when container size changes
watch(isFullscreen, () => {
  if (p5Instance) {
    setTimeout(() => {
      p5Instance.resizeCanvas(
        canvasContainer.value.clientWidth,
        canvasContainer.value.clientHeight
      )
    }, 300)
  }
})
</script>
