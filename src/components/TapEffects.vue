<template>
  <div class="relative">
    <div 
      ref="canvasContainer" 
      @click="handleTap"
      class="w-full h-64 bg-black rounded-lg cursor-pointer"
    >
      <!-- p5.js canvas will be mounted here -->
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import p5 from 'p5'

const canvasContainer = ref(null)
let p5Instance = null
let effects = []

class Effect {
  constructor(p, x, y) {
    this.p = p
    this.x = x
    this.y = y
    this.size = 0
    this.maxSize = p.random(100, 200)
    this.hue = p.random(360)
    this.alpha = 1
    this.speed = p.random(2, 5)
  }

  update() {
    this.size += this.speed
    this.alpha = this.p.map(this.size, 0, this.maxSize, 1, 0)
    return this.size < this.maxSize
  }

  draw() {
    this.p.noFill()
    this.p.stroke(this.hue, 80, 100, this.alpha)
    this.p.strokeWeight(2)
    this.p.circle(this.x, this.y, this.size)
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
  p5Instance = new p5(sketch)
})

onUnmounted(() => {
  if (p5Instance) {
    p5Instance.remove()
  }
})
</script>
