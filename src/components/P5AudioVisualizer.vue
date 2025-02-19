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
      <div class="absolute top-4 right-4 flex items-center gap-2">
        <button 
          @click="localAudioMode = 'microphone'" 
          :class="['px-4 py-2 rounded-lg font-medium transition-colors', 
                  localAudioMode === 'microphone' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700']"
        >
          マイク入力
        </button>
        <button 
          @click="localAudioMode = 'simulation'" 
          :class="['px-4 py-2 rounded-lg font-medium transition-colors', 
                  localAudioMode === 'simulation' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700']"
        >
          シミュレーション
        </button>
        <button
          @click="toggleRecording"
          class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
        >
          {{ isRecording ? '停止' : '開始' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import p5 from 'p5'

const props = defineProps({
  audioMode: {
    type: String,
    default: 'simulation'
  },
  audioContext: {
    type: Object,
    default: null
  },
  analyser: {
    type: Object,
    default: null
  }
})

const localAudioMode = ref(props.audioMode)

watch(() => props.audioMode, (newMode) => {
  localAudioMode.value = newMode
})

const canvasContainer = ref(null)
const error = ref(null)
const isRecording = ref(false)
let p5Instance = null

const sketch = (p) => {
  const particles = []
  const particleCount = 150
  const connectionDistance = 100
  let hueOffset = 0
  let dataArray = null
  let bufferLength = null

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
    if (!props.analyser || !isRecording.value) return
    
    p.background(0, 0.1)
    
    if (!dataArray || !bufferLength) {
      bufferLength = props.analyser.frequencyBinCount
      dataArray = new Uint8Array(bufferLength)
    }
    
    props.analyser.getByteFrequencyData(dataArray)
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

const audioMode = ref('simulation')

const setupAudioSource = async () => {
  if (localAudioMode.value === 'simulation') {
    // Create oscillator for testing
    const oscillator = props.audioContext.createOscillator()
    const gainNode = props.audioContext.createGain()
    const lfo = props.audioContext.createOscillator()
    const lfoGain = props.audioContext.createGain()
    
    // Set up oscillator and LFO
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(440, props.audioContext.currentTime)
    gainNode.gain.setValueAtTime(0.5, props.audioContext.currentTime)
    lfo.frequency.value = 0.5
    lfoGain.gain.value = 0.3
    
    // Connect nodes
    oscillator.connect(gainNode)
    gainNode.connect(props.analyser)
    lfo.connect(lfoGain)
    lfoGain.connect(gainNode.gain)
    
    // Start oscillators
    oscillator.start()
    lfo.start()
  } else {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log('Microphone access granted')
      mediaStream = stream
      source = props.audioContext.createMediaStreamSource(stream)
      source.connect(props.analyser)
    } catch (err) {
      console.log('Falling back to simulated microphone input')
      localAudioMode.value = 'simulation'
      await setupAudioSource()
    }
  }
}

const toggleRecording = () => {
  try {
    if (isRecording.value) {
      isRecording.value = false
      error.value = null
      return
    }

    if (!props.audioContext || !props.analyser) {
      error.value = 'オーディオの初期化が必要です'
      return
    }

    isRecording.value = true
    error.value = null

    console.log('Geometric visualizer started in', localAudioMode.value, 'mode')
  } catch (err) {
    console.error('Error initializing audio:', err)
    error.value = 'オーディオの初期化エラー'
    isRecording.value = false
  }
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
