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
  },
  theme: {
    type: String,
    default: 'default'
  },
  style: {
    type: String,
    default: 'default'
  }
})

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
      case 'circular':
        this.updateCircular(intensity)
        break
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
  
  updateCircular(intensity) {
    // 円環の半径を計算
    const centerX = this.p.width / 2
    const centerY = this.p.height / 2
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY)
    
    // 現在の位置から中心までの距離を計算
    const dx = this.x - centerX
    const dy = this.y - centerY
    const dist = Math.sqrt(dx * dx + dy * dy)
    
    // 円環の内側と外側の境界を定義
    const innerRadius = maxDist * 0.3
    const outerRadius = maxDist * 0.5
    
    // 円環内に粒子を保持
    if (dist < innerRadius || dist > outerRadius) {
      // 円環内のランダムな位置にリセット
      const angle = this.p.random(this.p.TWO_PI)
      const r = this.p.random(innerRadius, outerRadius)
      this.x = centerX + Math.cos(angle) * r
      this.y = centerY + Math.sin(angle) * r
    } else {
      // 円環に沿って移動
      const angle = Math.atan2(dy, dx)
      const newAngle = angle + (0.01 * intensity)
      this.x = centerX + Math.cos(newAngle) * dist
      this.y = centerY + Math.sin(newAngle) * dist
    }
    
    this.hue = (this.hue + 0.5) % 360
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
      case 'circular':
        this.drawCircular()
        break
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
  
  drawCircular() {
    const centerX = this.p.width / 2
    const centerY = this.p.height / 2
    const dx = this.x - centerX
    const dy = this.y - centerY
    const angle = Math.atan2(dy, dx)
    
    this.p.noStroke()
    this.p.fill(this.hue, 80, 100, 0.7)
    
    // 円環に沿った小さな円を描画
    this.p.circle(this.x, this.y, this.size)
    
    // 中心に向かって細い線を描画
    this.p.stroke(this.hue, 80, 100, 0.3)
    this.p.strokeWeight(0.5)
    this.p.line(
      this.x,
      this.y,
      this.x - Math.cos(angle) * this.size,
      this.y - Math.sin(angle) * this.size
    )
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
      
      // Draw background elements based on style
      if (props.style === 'circular') {
        drawCircularBackground(p, dataArray, intensity)
      }
    
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
  
  // Draw circular background elements
  const drawCircularBackground = (p, dataArray, intensity) => {
    const centerX = p.width / 2
    const centerY = p.height / 2
    const maxRadius = Math.min(p.width, p.height) / 3
    
    // Get theme colors
    const colors = getThemeColors(props.theme)
    const hueStart = colors.hueStart || 0
    const hueEnd = colors.hueEnd || 360
    
    // Draw background circles
    p.noFill()
    p.strokeWeight(1)
    
    // Inner circle
    p.stroke(hueStart, 30, 80, 0.2)
    p.circle(centerX, centerY, maxRadius * 1.4)
    
    // Outer circle
    p.stroke(hueEnd, 30, 80, 0.2)
    p.circle(centerX, centerY, maxRadius * 2)
    
    // Draw audio-reactive circle
    const avgAmplitude = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length
    const radiusVariation = p.map(avgAmplitude, 0, 255, 0, maxRadius * 0.2)
    
    p.strokeWeight(2)
    p.stroke(hueOffset, 80, 100, 0.5)
    p.circle(centerX, centerY, maxRadius * 1.7 + radiusVariation)
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
