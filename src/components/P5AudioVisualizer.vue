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
      <button
        @click="toggleRecording"
        class="absolute top-4 right-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
      >
        {{ isRecording ? '停止' : '開始' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import p5 from 'p5'

const canvasContainer = ref(null)
const error = ref(null)
const isRecording = ref(false)
let p5Instance = null
let audioContext = null
let analyser = null
let mediaStream = null

const sketch = (p) => {
  const particles = []
  const particleCount = 150
  const connectionDistance = 100
  let hueOffset = 0

  class GeometricParticle {
    constructor() {
      this.reset()
    }

    reset() {
      this.x = p.random(p.width)
      this.y = p.random(p.height)
      this.size = p.random(2, 6)
      this.angle = p.random(p.TWO_PI)
      this.speed = p.random(0.5, 2)
      this.hue = p.random(360)
    }

    update(intensity) {
      this.angle += 0.02 * intensity
      this.x += Math.cos(this.angle) * this.speed * intensity
      this.y += Math.sin(this.angle) * this.speed * intensity
      this.hue = (this.hue + 0.5) % 360

      if (this.x < 0 || this.x > p.width || 
          this.y < 0 || this.y > p.height) {
        this.reset()
      }
    }

    draw(intensity, frequencyData) {
      p.noStroke()
      const alpha = p.map(intensity, 1, 3, 0.3, 0.8)
      p.fill(this.hue, 80, 100, alpha)
      
      // Draw geometric shape
      p.push()
      p.translate(this.x, this.y)
      p.rotate(this.angle)
      
      const sides = 3 + Math.floor(intensity * 2)
      p.beginShape()
      for (let i = 0; i < sides; i++) {
        const angle = (p.TWO_PI / sides) * i
        const r = this.size * intensity
        const x = Math.cos(angle) * r
        const y = Math.sin(angle) * r
        p.vertex(x, y)
      }
      p.endShape(p.CLOSE)
      p.pop()
    }

    connect(other, intensity) {
      const d = p.dist(this.x, this.y, other.x, other.y)
      if (d < connectionDistance * intensity) {
        const alpha = p.map(d, 0, connectionDistance * intensity, 0.5, 0)
        p.stroke(this.hue, 80, 100, alpha)
        p.line(this.x, this.y, other.x, other.y)
      }
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
      particles.push(new GeometricParticle())
    }
    console.log('Geometric audio visualizer initialized with', particleCount, 'particles')
  }

  p.draw = () => {
    if (!analyser) return
    
    p.background(0, 0.1)
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(dataArray)
    
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
    const intensity = p.map(average, 0, 255, 1, 3)
    
    // Draw connections first
    p.strokeWeight(1)
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        particles[i].connect(particles[j], intensity)
      }
    }
    
    // Then update and draw particles
    particles.forEach(particle => {
      particle.update(intensity)
      particle.draw(intensity, dataArray)
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

const toggleRecording = async () => {
  try {
    if (isRecording.value) {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop())
      }
      isRecording.value = false
      error.value = null
      return
    }

    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048

    const source = audioContext.createMediaStreamSource(mediaStream)
    source.connect(analyser)
    
    isRecording.value = true
    error.value = null
  } catch (err) {
    console.error('Error accessing microphone:', err)
    error.value = 'マイクへのアクセスエラー'
    isRecording.value = false
  }
}

onMounted(() => {
  setTimeout(initializeP5, 100)
})

onUnmounted(() => {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop())
  }
  if (audioContext) {
    audioContext.close()
  }
  if (p5Instance) {
    p5Instance.remove()
  }
})
</script>
