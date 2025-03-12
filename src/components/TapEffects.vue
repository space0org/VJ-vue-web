<template>
  <div class="relative">
    <div 
      ref="canvasContainer" 
      @click="handleTap"
      @touchstart="handleTap"
      class="w-full bg-black rounded-lg cursor-pointer select-none"
      style="height: 50vh; min-height: 300px;"
    >
      <div class="absolute inset-0 flex items-center justify-center text-white/50 pointer-events-none">
        タップしてエフェクトを作成
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import p5 from 'p5'

const props = defineProps({
  theme: {
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
let p5Instance = null
let effects = []

// Wait for DOM to be ready before initializing p5
const initializeP5 = () => {
  if (!canvasContainer.value) return
  console.log('Initializing p5.js with container:', {
    width: canvasContainer.value.clientWidth,
    height: canvasContainer.value.clientHeight
  })
  p5Instance = new p5(sketch)
}

class Effect {
  constructor(p, x, y) {
    this.p = p
    this.x = x
    this.y = y
    this.size = 0
    this.maxSize = p.random(100, 200)
    
    const colors = getThemeColors(props.theme)
    this.hue = p.random(colors.hueStart, colors.hueEnd)
    
    this.alpha = 1
    this.speed = p.random(2, 5)
    this.particles = Array.from({ length: 8 }, () => ({
      angle: p.random(p.TWO_PI),
      speed: p.random(1, 3),
      size: p.random(3, 8),
      distance: 0
    }))
  }

  update() {
    this.size += this.speed
    this.alpha = this.p.map(this.size, 0, this.maxSize, 1, 0)
    
    this.particles.forEach(particle => {
      particle.distance += particle.speed
    })
    
    return this.size < this.maxSize
  }

  draw() {
    const p = this.p
    
    // Draw main ripple
    p.noFill()
    p.stroke(this.hue, 80, 100, this.alpha)
    p.strokeWeight(2)
    p.circle(this.x, this.y, this.size)
    
    // Draw particles
    p.noStroke()
    this.particles.forEach(particle => {
      const x = this.x + Math.cos(particle.angle) * particle.distance
      const y = this.y + Math.sin(particle.angle) * particle.distance
      p.fill(this.hue, 80, 100, this.alpha)
      p.circle(x, y, particle.size * this.alpha)
    })
  }
}

const handleTap = (event) => {
  if (!p5Instance) return
  
  const rect = canvasContainer.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  effects.push(new Effect(p5Instance, x, y))
}

const sketch = (p) => {
  p.setup = () => {
    if (!canvasContainer.value) {
      console.error('Canvas container not available during p5 setup')
      return
    }

    try {
      const canvas = p.createCanvas(
        canvasContainer.value.clientWidth,
        canvasContainer.value.clientHeight
      )
      canvas.parent(canvasContainer.value)
      p.colorMode(p.HSB, 360, 100, 100, 1)
      p.background(0)
      console.log('Tap effects canvas initialized')
    } catch (error) {
      console.error('Failed to setup tap effects canvas:', error)
    }
  }

  p.draw = () => {
    p.background(0, 0.1)
    
    effects = effects.filter(effect => {
      const alive = effect.update()
      if (alive) {
        effect.draw()
      }
      return alive
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

onMounted(() => {
  // Use nextTick to ensure DOM is ready
  setTimeout(initializeP5, 100)
})

onUnmounted(() => {
  if (p5Instance) {
    p5Instance.remove()
  }
})
</script>
