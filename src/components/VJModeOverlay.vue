<template>
  <div 
    :class="[
      'vj-overlay fixed inset-0 bg-black',
      isActive ? 'vj-active' : 'opacity-0 pointer-events-none'
    ]"
  >
    <!-- Waveform Layer -->
    <div v-if="showWaveformLayer" class="absolute inset-0">
      <canvas 
        ref="waveformCanvas" 
        class="w-full h-full"
      ></canvas>
    </div>
    
    <!-- Frequency Layer -->
    <div v-if="showFrequencyLayer" class="absolute inset-0">
      <canvas 
        ref="frequencyCanvas" 
        class="w-full h-full"
      ></canvas>
    </div>
    
    <!-- Particles Layer -->
    <div v-if="showParticlesLayer" class="absolute inset-0">
      <div 
        ref="particlesContainer" 
        class="w-full h-full"
      ></div>
    </div>
    
    <!-- Controls -->
    <div 
      v-if="showControls"
      class="vj-controls"
    >
      <button 
        @click="toggleLayer('waveform')" 
        :class="[
          'px-3 py-1 rounded-md text-white text-sm',
          showWaveformLayer ? 'bg-blue-600' : 'bg-gray-700'
        ]"
      >
        波形
      </button>
      <button 
        @click="toggleLayer('frequency')" 
        :class="[
          'px-3 py-1 rounded-md text-white text-sm',
          showFrequencyLayer ? 'bg-blue-600' : 'bg-gray-700'
        ]"
      >
        周波数
      </button>
      <button 
        @click="toggleLayer('particles')" 
        :class="[
          'px-3 py-1 rounded-md text-white text-sm',
          showParticlesLayer ? 'bg-blue-600' : 'bg-gray-700'
        ]"
      >
        パーティクル
      </button>
    </div>
    
    <!-- Close Button -->
    <button 
      v-if="showButton"
      @click="closeOverlay" 
      class="vj-close-button"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
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
  style: {
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

const waveformCanvas = ref(null)
const frequencyCanvas = ref(null)
const particlesContainer = ref(null)

const showControls = ref(false)
const showWaveformLayer = ref(true)
const showFrequencyLayer = ref(true)
const showParticlesLayer = ref(true)

let waveformAnimationId = null
let frequencyAnimationId = null
let p5Instance = null
let waveformDataArray = null
let frequencyDataArray = null
let mouseTimeout = null

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

const toggleLayer = (layer) => {
  switch (layer) {
    case 'waveform':
      showWaveformLayer.value = !showWaveformLayer.value
      break
    case 'frequency':
      showFrequencyLayer.value = !showFrequencyLayer.value
      break
    case 'particles':
      showParticlesLayer.value = !showParticlesLayer.value
      break
  }
}

const closeOverlay = () => {
  emit('close')
}

const handleMouseMove = () => {
  showControls.value = true
  
  if (mouseTimeout) {
    clearTimeout(mouseTimeout)
  }
  
  mouseTimeout = setTimeout(() => {
    showControls.value = false
  }, 3000)
}

const handleKeyDown = (event) => {
  if (event.key === 'Escape' && props.isActive) {
    closeOverlay()
  } else if (event.key === '1') {
    toggleLayer('waveform')
  } else if (event.key === '2') {
    toggleLayer('frequency')
  } else if (event.key === '3') {
    toggleLayer('particles')
  } else if (event.key === 'c') {
    showControls.value = !showControls.value
  }
}

const drawWaveform = () => {
  if (!waveformCanvas.value || !props.audioAnalyser || !props.isActive || !showWaveformLayer.value) {
    if (waveformAnimationId) {
      cancelAnimationFrame(waveformAnimationId)
      waveformAnimationId = null
    }
    return
  }
  
  const canvasCtx = waveformCanvas.value.getContext('2d')
  const width = waveformCanvas.value.width
  const height = waveformCanvas.value.height
  
  // Get waveform data
  if (!waveformDataArray) {
    waveformDataArray = new Uint8Array(props.audioAnalyser.frequencyBinCount)
  }
  props.audioAnalyser.getByteTimeDomainData(waveformDataArray)
  
  // Clear canvas with semi-transparent black for trail effect
  canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.1)'
  canvasCtx.fillRect(0, 0, width, height)
  
  // Draw waveform
  canvasCtx.lineWidth = 3
  
  // Use theme colors
  const colors = getThemeColors(props.theme)
  const hue = colors.hueStart
  canvasCtx.strokeStyle = `hsl(${hue}, 100%, 70%)`
  
  // Apply different visualization styles based on props.style
  switch(props.style) {
    case 'circular':
      drawCircularWaveform(canvasCtx, waveformDataArray, width, height, colors)
      break
    case 'dots':
      drawDotsWaveform(canvasCtx, waveformDataArray, width, height, colors)
      break
    case 'wave':
      drawWaveWaveform(canvasCtx, waveformDataArray, width, height, colors)
      break
    default:
      drawDefaultWaveform(canvasCtx, waveformDataArray, width, height, colors)
  }
  
  waveformAnimationId = requestAnimationFrame(drawWaveform)
}

const drawDefaultWaveform = (canvasCtx, dataArray, width, height, colors) => {
  canvasCtx.beginPath()
  
  const sliceWidth = width / dataArray.length
  let x = 0
  
  for (let i = 0; i < dataArray.length; i++) {
    const v = dataArray[i] / 128.0
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

const drawCircularWaveform = (canvasCtx, dataArray, width, height, colors) => {
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.min(width, height) / 3
  
  canvasCtx.beginPath()
  
  // Draw circular waveform
  for (let i = 0; i < dataArray.length; i += 8) {
    const v = dataArray[i] / 128.0
    const angle = (i / dataArray.length) * Math.PI * 2
    
    const x = centerX + Math.cos(angle) * radius * v
    const y = centerY + Math.sin(angle) * radius * v
    
    // Calculate color based on position in the circle
    const hue = colors.hueStart + ((i / dataArray.length) * (colors.hueEnd - colors.hueStart))
    canvasCtx.strokeStyle = `hsl(${hue}, 80%, 50%)`
    
    if (i === 0) {
      canvasCtx.moveTo(x, y)
    } else {
      canvasCtx.lineTo(x, y)
    }
  }
  
  canvasCtx.closePath()
  canvasCtx.stroke()
}

const drawDotsWaveform = (canvasCtx, dataArray, width, height, colors) => {
  const dotCount = 100
  const dotSpacing = width / dotCount
  
  for (let i = 0; i < dotCount; i++) {
    // Sample from dataArray at regular intervals
    const dataIndex = Math.floor(i * (dataArray.length / dotCount))
    const v = dataArray[dataIndex] / 128.0
    
    const x = i * dotSpacing
    const y = height / 2 + ((v - 1) * height / 2)
    
    // Calculate dot size based on amplitude
    const dotSize = 2 + (v * 8)
    
    // Calculate color based on position and amplitude
    const hue = colors.hueStart + ((i / dotCount) * (colors.hueEnd - colors.hueStart))
    const saturation = 70 + (v * 30)
    const lightness = 40 + (v * 20)
    
    canvasCtx.beginPath()
    canvasCtx.arc(x, y, dotSize, 0, Math.PI * 2)
    canvasCtx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`
    canvasCtx.fill()
  }
}

const drawWaveWaveform = (canvasCtx, dataArray, width, height, colors) => {
  // Draw multiple waves with offset
  const waveCount = 3
  const waveSpacing = height / (waveCount + 1)
  
  for (let wave = 0; wave < waveCount; wave++) {
    const yOffset = (wave + 1) * waveSpacing
    
    // Calculate color based on wave position
    const hue = colors.hueStart + ((wave / waveCount) * (colors.hueEnd - colors.hueStart))
    canvasCtx.strokeStyle = `hsl(${hue}, 80%, 50%)`
    
    canvasCtx.beginPath()
    
    const sliceWidth = width / dataArray.length
    let x = 0
    
    // Adjust amplitude based on wave position
    const amplitudeFactor = 1 - (wave * 0.15)
    
    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] / 128.0
      // Scale amplitude and center around the wave's yOffset
      const y = yOffset + ((v - 1) * height / 4 * amplitudeFactor)
      
      if (i === 0) {
        canvasCtx.moveTo(x, y)
      } else {
        canvasCtx.lineTo(x, y)
      }
      
      x += sliceWidth
    }
    
    canvasCtx.stroke()
  }
}

const drawFrequency = () => {
  if (!frequencyCanvas.value || !props.audioAnalyser || !props.isActive || !showFrequencyLayer.value) {
    if (frequencyAnimationId) {
      cancelAnimationFrame(frequencyAnimationId)
      frequencyAnimationId = null
    }
    return
  }
  
  const canvasCtx = frequencyCanvas.value.getContext('2d')
  const width = frequencyCanvas.value.width
  const height = frequencyCanvas.value.height
  
  // Get frequency data
  if (!frequencyDataArray) {
    frequencyDataArray = new Uint8Array(props.audioAnalyser.frequencyBinCount)
  }
  props.audioAnalyser.getByteFrequencyData(frequencyDataArray)
  
  // Clear canvas with semi-transparent black for trail effect
  canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.2)'
  canvasCtx.fillRect(0, 0, width, height)
  
  // Apply different visualization styles based on props.style
  switch(props.style) {
    case 'circular':
      drawCircularFrequency(canvasCtx, frequencyDataArray, width, height)
      break
    case 'dots':
      drawDotsFrequency(canvasCtx, frequencyDataArray, width, height)
      break
    case 'wave':
      drawWaveFrequency(canvasCtx, frequencyDataArray, width, height)
      break
    default:
      drawBarsFrequency(canvasCtx, frequencyDataArray, width, height)
  }
  
  frequencyAnimationId = requestAnimationFrame(drawFrequency)
}

const drawBarsFrequency = (canvasCtx, dataArray, width, height) => {
  // Draw frequency bars
  const barWidth = (width / dataArray.length) * 2.5
  let x = 0
  
  for (let i = 0; i < dataArray.length; i++) {
    const barHeight = (dataArray[i] / 255) * height
    
    // Use gradient colors based on frequency and theme
    const colors = getThemeColors(props.theme)
    const hueRange = colors.hueEnd - colors.hueStart
    const hue = colors.hueStart + (i / dataArray.length * hueRange)
    const saturation = colors.saturation || 100
    const brightness = colors.brightness || 50
    canvasCtx.fillStyle = `hsl(${hue}, ${saturation}%, ${brightness}%)`
    canvasCtx.fillRect(x, height - barHeight, barWidth, barHeight)
    
    x += barWidth + 1
    
    // Only draw a portion of the frequencies to fit in the canvas
    if (x > width) break
  }
}

const drawCircularFrequency = (canvasCtx, dataArray, width, height) => {
  const centerX = width / 2
  const centerY = height / 2
  const maxRadius = Math.min(width, height) / 2
  
  canvasCtx.lineWidth = 2
  
  // Draw circular frequency bars
  for (let i = 0; i < dataArray.length; i += 8) {
    const amplitude = dataArray[i] / 255
    const barHeight = amplitude * maxRadius
    const angle = (i / dataArray.length) * Math.PI * 2
    
    // Use gradient colors based on frequency and theme
    const colors = getThemeColors(props.theme)
    const hueRange = colors.hueEnd - colors.hueStart
    const hue = colors.hueStart + (i / dataArray.length * hueRange)
    const saturation = colors.saturation || 100
    const brightness = colors.brightness || 50
    
    canvasCtx.strokeStyle = `hsl(${hue}, ${saturation}%, ${brightness}%)`
    canvasCtx.beginPath()
    canvasCtx.moveTo(centerX, centerY)
    canvasCtx.lineTo(
      centerX + Math.cos(angle) * barHeight,
      centerY + Math.sin(angle) * barHeight
    )
    canvasCtx.stroke()
  }
}

const drawDotsFrequency = (canvasCtx, dataArray, width, height) => {
  const centerX = width / 2
  const centerY = height / 2
  
  // Draw frequency dots in a spiral pattern
  for (let i = 0; i < dataArray.length; i += 4) {
    const amplitude = dataArray[i] / 255
    const radius = (i / dataArray.length) * Math.min(width, height) / 2
    const angle = (i / dataArray.length) * Math.PI * 10
    
    const x = centerX + Math.cos(angle) * radius
    const y = centerY + Math.sin(angle) * radius
    const dotSize = amplitude * 10
    
    // Use gradient colors based on frequency and theme
    const colors = getThemeColors(props.theme)
    const hueRange = colors.hueEnd - colors.hueStart
    const hue = colors.hueStart + (i / dataArray.length * hueRange)
    const saturation = colors.saturation || 100
    const brightness = colors.brightness || 50
    
    canvasCtx.fillStyle = `hsl(${hue}, ${saturation}%, ${brightness}%)`
    canvasCtx.beginPath()
    canvasCtx.arc(x, y, dotSize, 0, Math.PI * 2)
    canvasCtx.fill()
  }
}

const drawWaveFrequency = (canvasCtx, dataArray, width, height) => {
  canvasCtx.lineWidth = 2
  
  // Draw frequency as a continuous wave
  canvasCtx.beginPath()
  
  for (let i = 0; i < dataArray.length; i += 2) {
    const x = (i / dataArray.length) * width
    const y = height - (dataArray[i] / 255) * height
    
    if (i === 0) {
      canvasCtx.moveTo(x, y)
    } else {
      canvasCtx.bezierCurveTo(
        x - 10, y,
        x - 5, y,
        x, y
      )
    }
  }
  
  // Use gradient colors based on theme
  const colors = getThemeColors(props.theme)
  const gradient = canvasCtx.createLinearGradient(0, 0, width, 0)
  gradient.addColorStop(0, `hsl(${colors.hueStart}, 100%, 50%)`)
  gradient.addColorStop(1, `hsl(${colors.hueEnd}, 100%, 50%)`)
  
  canvasCtx.strokeStyle = gradient
  canvasCtx.stroke()
}

const setupParticles = () => {
  if (!particlesContainer.value || !props.audioAnalyser || !props.isActive || !showParticlesLayer.value) {
    if (p5Instance) {
      p5Instance.remove()
      p5Instance = null
    }
    return
  }
  
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
      
      // Add properties for different styles
      this.angle = this.p.random(this.p.TWO_PI)
      this.radius = this.p.random(20, 100)
      this.rotationSpeed = this.p.random(0.01, 0.05)
      this.sides = Math.floor(this.p.random(3, 7)) // For geometric style
    }

    update(intensity) {
      // Different update behavior based on style
      switch(props.style) {
        case 'orbital':
          this.updateOrbital(intensity)
          break
        case 'geometric':
          this.updateGeometric(intensity)
          break
        case 'flow':
          this.updateFlow(intensity)
          break
        default:
          this.updateDefault(intensity)
      }
    }
    
    updateDefault(intensity) {
      this.x += this.speedX * intensity
      this.y += this.speedY * intensity
      this.hue = (this.hue + 0.5) % 360

      if (this.x < 0 || this.x > this.p.width || 
          this.y < 0 || this.y > this.p.height) {
        this.reset()
      }
    }
    
    updateOrbital(intensity) {
      this.angle += this.rotationSpeed * intensity
      this.radius += this.p.sin(this.angle * 0.1) * 0.5
      this.x = this.p.width/2 + Math.cos(this.angle) * this.radius
      this.y = this.p.height/2 + Math.sin(this.angle) * this.radius
      this.hue = (this.hue + 0.5) % 360
      
      if (this.radius < 0 || this.radius > Math.max(this.p.width, this.p.height)) {
        this.reset()
      }
    }
    
    updateGeometric(intensity) {
      this.x += this.speedX * intensity * Math.cos(this.angle)
      this.y += this.speedY * intensity * Math.sin(this.angle)
      this.angle += 0.1 * intensity
      this.hue = (this.hue + 0.5) % 360
      
      if (this.x < 0 || this.x > this.p.width || 
          this.y < 0 || this.y > this.p.height) {
        this.reset()
      }
    }
    
    updateFlow(intensity) {
      const noiseScale = 0.01
      const noiseVal = this.p.noise(this.x * noiseScale, this.y * noiseScale)
      const angle = noiseVal * this.p.TWO_PI * 4
      
      this.x += Math.cos(angle) * intensity
      this.y += Math.sin(angle) * intensity
      this.hue = (this.hue + 0.5) % 360
      
      if (this.x < 0 || this.x > this.p.width || 
          this.y < 0 || this.y > this.p.height) {
        this.reset()
      }
    }

    draw() {
      // Different drawing behavior based on style
      switch(props.style) {
        case 'orbital':
          this.drawOrbital()
          break
        case 'geometric':
          this.drawGeometric()
          break
        case 'flow':
          this.drawFlow()
          break
        default:
          this.drawDefault()
      }
    }
    
    drawDefault() {
      this.p.noStroke()
      this.p.fill(this.hue, 80, 100, 0.7)
      this.p.circle(this.x, this.y, this.size)
    }
    
    drawOrbital() {
      this.p.noStroke()
      this.p.fill(this.hue, 80, 100, 0.7)
      this.p.circle(this.x, this.y, this.size * 1.5)
    }
    
    drawGeometric() {
      this.p.noStroke()
      this.p.fill(this.hue, 80, 100, 0.7)
      this.p.push()
      this.p.translate(this.x, this.y)
      this.p.rotate(this.angle)
      this.p.beginShape()
      for (let i = 0; i < this.sides; i++) {
        const angle = this.p.map(i, 0, this.sides, 0, this.p.TWO_PI)
        const sx = Math.cos(angle) * this.size * 2
        const sy = Math.sin(angle) * this.size * 2
        this.p.vertex(sx, sy)
      }
      this.p.endShape(this.p.CLOSE)
      this.p.pop()
    }
    
    drawFlow() {
      this.p.noFill()
      this.p.stroke(this.hue, 80, 100, 0.7)
      this.p.strokeWeight(this.size * 0.5)
      this.p.line(this.x, this.y, this.x + this.speedX * 5, this.y + this.speedY * 5)
    }
  }
  
  const sketch = (p) => {
    let particles = []
    const particleCount = 500
    
    p.setup = () => {
      p.createCanvas(particlesContainer.value.clientWidth, particlesContainer.value.clientHeight)
      p.colorMode(p.HSB, 360, 100, 100, 1)
      p.background(0)
      
      particles = Array.from({ length: particleCount }, () => new Particle(p))
    }
    
    p.draw = () => {
      if (!props.audioAnalyser || !props.isActive || !showParticlesLayer.value) {
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
      if (particlesContainer.value) {
        p.resizeCanvas(particlesContainer.value.clientWidth, particlesContainer.value.clientHeight)
      }
    }
  }
  
  if (p5Instance) {
    p5Instance.remove()
  }
  
  p5Instance = new p5(sketch, particlesContainer.value)
}

const initializeCanvases = () => {
  if (waveformCanvas.value) {
    waveformCanvas.value.width = window.innerWidth
    waveformCanvas.value.height = window.innerHeight
  }
  
  if (frequencyCanvas.value) {
    frequencyCanvas.value.width = window.innerWidth
    frequencyCanvas.value.height = window.innerHeight
  }
}

const handleResize = () => {
  initializeCanvases()
}

const startVisualizations = () => {
  if (props.isActive && props.audioAnalyser) {
    console.log('VJModeOverlay: Starting visualizations')
    initializeCanvases()
    drawWaveform()
    drawFrequency()
    setupParticles()
  }
}

const stopVisualizations = () => {
  console.log('VJModeOverlay: Stopping visualizations')
  
  if (waveformAnimationId) {
    cancelAnimationFrame(waveformAnimationId)
    waveformAnimationId = null
  }
  
  if (frequencyAnimationId) {
    cancelAnimationFrame(frequencyAnimationId)
    frequencyAnimationId = null
  }
  
  if (p5Instance) {
    p5Instance.remove()
    p5Instance = null
  }
}

// Handle custom event for VJ mode activation
const handleVJModeActivated = (event) => {
  console.log('VJModeOverlay: Received vj-mode-activated event')
  if (event.detail && event.detail.audioAnalyser) {
    console.log('VJModeOverlay: Using audio analyser from event')
    startVisualizations()
  }
}

onMounted(() => {
  console.log('VJModeOverlay: Component mounted')
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('resize', handleResize)
  window.addEventListener('vj-mode-activated', handleVJModeActivated)
  
  if (props.isActive && props.audioAnalyser) {
    console.log('VJModeOverlay: Auto-activating on mount')
    startVisualizations()
  }
})

onUnmounted(() => {
  console.log('VJModeOverlay: Component unmounting')
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('vj-mode-activated', handleVJModeActivated)
  
  stopVisualizations()
})

// Watch for changes in isActive prop
watch(() => props.isActive, (newValue) => {
  console.log('VJModeOverlay: isActive changed to', newValue)
  if (newValue) {
    startVisualizations()
  } else {
    stopVisualizations()
  }
})

// Watch for changes in audioAnalyser prop
watch(() => props.audioAnalyser, (newValue) => {
  console.log('VJModeOverlay: audioAnalyser changed')
  if (newValue && props.isActive) {
    startVisualizations()
  }
})

// Watch for changes in style prop
watch(() => props.style, () => {
  console.log('VJModeOverlay: style changed')
  // No need to restart visualizations, they will pick up the new style on the next frame
})

// Watch for changes in theme prop
watch(() => props.theme, () => {
  console.log('VJModeOverlay: theme changed')
  // No need to restart visualizations, they will pick up the new theme on the next frame
})
</script>
