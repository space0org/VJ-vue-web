<template>
  <div class="relative">
    <div 
      ref="canvasContainer" 
      class="w-full bg-black rounded-lg"
      style="height: 50vh; min-height: 300px;"
    >
      <div v-if="error" class="absolute inset-0 flex items-center justify-center text-red-500">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import p5 from 'p5'

const props = defineProps({
  audioContext: {
    type: Object,
    default: null
  },
  analyser: {
    type: Object,
    default: null
  }
})

const canvasContainer = ref(null)
const error = ref(null)
let p5Instance = null

const sketch = (p) => {
  const particles = []
  const particleCount = 150
  let dataArray = null
  let bufferLength = null

  class Particle {
    constructor() {
      this.reset()
    }

    reset() {
      this.x = p.random(p.width)
      this.y = p.random(p.height)
      this.size = p.random(2, 6)
      this.speedX = p.random(-1, 1)
      this.speedY = p.random(-1, 1)
      this.hue = p.random(360)
    }

    update(intensity) {
      this.x += this.speedX * intensity
      this.y += this.speedY * intensity
      this.hue = (this.hue + 0.5) % 360

      if (this.x < 0 || this.x > p.width || 
          this.y < 0 || this.y > p.height) {
        this.reset()
      }
    }

    draw(intensity) {
      p.noStroke()
      const alpha = p.map(intensity, 1, 3, 0.3, 0.8)
      p.fill(this.hue, 80, 100, alpha)
      p.circle(this.x, this.y, this.size * intensity)
    }
  }

  p.setup = () => {
    if (!canvasContainer.value) return

    const canvas = p.createCanvas(
      canvasContainer.value.clientWidth,
      canvasContainer.value.clientHeight
    )
    canvas.parent(canvasContainer.value)
    p.colorMode(p.HSB, 360, 100, 100, 1)
    p.background(0)

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle())
    }
  }

  p.draw = () => {
    if (!props.analyser) return
    
    p.background(0, 0.1)
    
    if (!dataArray || !bufferLength) {
      bufferLength = props.analyser.frequencyBinCount
      dataArray = new Uint8Array(bufferLength)
    }
    
    props.analyser.getByteFrequencyData(dataArray)
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
    const intensity = p.map(average, 0, 255, 1, 3)
    
    // Draw frequency spectrum visualization
    const barWidth = p.width / bufferLength
    p.noStroke()
    
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = p.map(dataArray[i], 0, 255, 0, p.height / 2)
      const hue = p.map(i, 0, bufferLength, 0, 360)
      p.fill(hue, 80, 100, 0.5)
      p.rect(i * barWidth, p.height - barHeight, barWidth, barHeight)
    }
    
    // Update and draw particles
    particles.forEach(particle => {
      particle.update(intensity)
      particle.draw(intensity)
    })
  }

  p.windowResized = () => {
    if (!canvasContainer.value) return
    p.resizeCanvas(
      canvasContainer.value.clientWidth,
      canvasContainer.value.clientHeight
    )
  }
}

const initializeP5 = () => {
  if (!canvasContainer.value) return
  p5Instance = new p5(sketch, canvasContainer.value)
}

onMounted(() => {
  setTimeout(initializeP5, 100)
})

onUnmounted(() => {
  if (p5Instance) {
    p5Instance.remove()
  }
})
</script>
