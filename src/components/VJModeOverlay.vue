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
  },
  style: {
    type: String,
    default: 'default'
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

// Draw circular waveform
const drawCircularWaveform = (canvasCtx, dataArray, width, height, colors) => {
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.min(width, height) / 3
  
  // 背景の円環を描画
  canvasCtx.beginPath()
  canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  canvasCtx.lineWidth = 1
  canvasCtx.arc(centerX, centerY, radius * 0.7, 0, Math.PI * 2)
  canvasCtx.stroke()
  
  canvasCtx.beginPath()
  canvasCtx.arc(centerX, centerY, radius * 1.3, 0, Math.PI * 2)
  canvasCtx.stroke()
  
  canvasCtx.beginPath()
  canvasCtx.lineWidth = 3
  
  // 円環波形を描画
  for (let i = 0; i < dataArray.length; i += 8) {
    const v = dataArray[i] / 128.0
    const angle = (i / dataArray.length) * Math.PI * 2
    
    // 半径を変動させて円環効果を作成
    const r = radius * (1 + (v - 1) * 0.3)
    const x = centerX + Math.cos(angle) * r
    const y = centerY + Math.sin(angle) * r
    
    // 位置に基づいて色を計算
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

// Draw circular frequency visualization
const drawCircularFrequency = (canvasCtx, dataArray, width, height, colors) => {
  const centerX = width / 2
  const centerY = height / 2
  const maxRadius = Math.min(width, height) / 2
  
  // 背景の円環を描画
  canvasCtx.beginPath()
  canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  canvasCtx.lineWidth = 1
  canvasCtx.arc(centerX, centerY, maxRadius * 0.6, 0, Math.PI * 2)
  canvasCtx.stroke()
  
  canvasCtx.beginPath()
  canvasCtx.arc(centerX, centerY, maxRadius * 0.8, 0, Math.PI * 2)
  canvasCtx.stroke()
  
  canvasCtx.lineWidth = 2
  
  // 円環状の周波数バーを描画
  for (let i = 0; i < dataArray.length; i += 8) {
    const amplitude = dataArray[i] / 255
    const innerRadius = maxRadius * 0.6
    const outerRadius = innerRadius + (amplitude * maxRadius * 0.4)
    const angle = (i / dataArray.length) * Math.PI * 2
    
    // 周波数とテーマに基づいてグラデーション色を使用
    const hueRange = colors.hueEnd - colors.hueStart
    const hue = colors.hueStart + (i / dataArray.length * hueRange)
    const saturation = colors.saturation || 100
    const brightness = colors.brightness || 50
    
    canvasCtx.strokeStyle = `hsl(${hue}, ${saturation}%, ${brightness}%)`
    canvasCtx.beginPath()
    canvasCtx.moveTo(
      centerX + Math.cos(angle) * innerRadius,
      centerY + Math.sin(angle) * innerRadius
    )
    canvasCtx.lineTo(
      centerX + Math.cos(angle) * outerRadius,
      centerY + Math.sin(angle) * outerRadius
    )
    canvasCtx.stroke()
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
    
    // スタイルに基づいて異なる描画方法を使用
    if (props.style === 'circular') {
      // 円環波形を描画
      const colors = getThemeColors(props.theme)
      drawCircularWaveform(canvasCtx, waveformDataArray, width, height, colors)
    } else {
      // 通常の波形を描画
      canvasCtx.lineWidth = 5
      canvasCtx.strokeStyle = 'rgb(255, 0, 0)'
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
    
    // スタイルに基づいて異なる描画方法を使用
    if (props.style === 'circular') {
      // 円環周波数を描画
      const colors = getThemeColors(props.theme)
      drawCircularFrequency(canvasCtx, frequencyDataArray, width, height, colors)
    } else {
      // 通常の周波数バーを描画
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
      
      // 円環スタイル用のプロパティを追加
      this.angle = this.p.random(this.p.TWO_PI)
      this.radius = this.p.random(100, 300)
      this.rotationSpeed = this.p.random(0.01, 0.05)
    }
    
    update(intensity) {
      // スタイルに基づいて異なる更新方法を使用
      if (props.style === 'circular') {
        this.updateCircular(intensity)
      } else {
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
    
    updateCircular(intensity) {
      // 円環に沿って移動
      this.angle += this.rotationSpeed * intensity
      this.radius += this.p.sin(this.angle * 0.1) * 0.5
      
      this.x = this.p.width/2 + Math.cos(this.angle) * this.radius
      this.y = this.p.height/2 + Math.sin(this.angle) * this.radius
      
      this.hue = (this.hue + 0.5) % 360
      
      // 円環の範囲外に出たらリセット
      if (this.radius < 50 || this.radius > Math.max(this.p.width, this.p.height) / 2) {
        this.reset()
      }
    }
    
    draw() {
      // スタイルに基づいて異なる描画方法を使用
      if (props.style === 'circular') {
        this.drawCircular()
      } else {
        this.drawDefault()
      }
    }
    
    drawDefault() {
      this.p.noStroke()
      this.p.fill(this.hue, 80, 100, 0.7)
      this.p.circle(this.x, this.y, this.size)
    }
    
    drawCircular() {
      this.p.noStroke()
      this.p.fill(this.hue, 80, 100, 0.7)
      this.p.circle(this.x, this.y, this.size)
      
      // 中心に向かって細い線を描画
      this.p.stroke(this.hue, 80, 100, 0.3)
      this.p.strokeWeight(0.5)
      const centerX = this.p.width / 2
      const centerY = this.p.height / 2
      const angle = Math.atan2(this.y - centerY, this.x - centerX)
      this.p.line(
        this.x,
        this.y,
        this.x - Math.cos(angle) * this.size,
        this.y - Math.sin(angle) * this.size
      )
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
</script>
