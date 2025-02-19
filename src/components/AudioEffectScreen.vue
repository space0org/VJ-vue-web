<template>
  <div class="relative">
    <div 
      ref="canvasContainer" 
      class="w-full bg-black rounded-lg cursor-pointer select-none"
      style="height: 50vh; min-height: 300px;"
    >
      <div class="absolute inset-0 flex items-center justify-center text-white/50 pointer-events-none">
        音に反応するエフェクト
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
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
let p5Instance = null

const sketch = function(p) {
  let effects = []
  let lastTriggerTime = 0
  const AUDIO_THRESHOLD = 50
  const MIN_TRIGGER_INTERVAL = 100

  function Effect(x, y) {
    this.x = x
    this.y = y
    this.size = 0
    this.maxSize = p.random(100, 200)
    this.hue = p.random(360)
    this.alpha = 1
    this.speed = p.random(2, 5)
    this.particles = Array.from({ length: 12 }, () => ({
      angle: p.random(p.TWO_PI),
      speed: p.random(1, 3),
      size: p.random(3, 8),
      distance: 0
    }))

    this.update = function() {
      this.size += this.speed
      this.alpha = p.map(this.size, 0, this.maxSize, 1, 0)
      
      this.particles.forEach(particle => {
        particle.distance += particle.speed
      })
      
      return this.size < this.maxSize
    }

    this.draw = function() {
      p.noFill()
      p.stroke(this.hue, 80, 100, this.alpha)
      p.strokeWeight(2)
      p.circle(this.x, this.y, this.size)
      
      p.noStroke()
      this.particles.forEach(particle => {
        const x = this.x + Math.cos(particle.angle) * particle.distance
        const y = this.y + Math.sin(particle.angle) * particle.distance
        p.fill(this.hue, 80, 100, this.alpha)
        p.circle(x, y, particle.size * this.alpha)
      })
    }
  }

  p.setup = function() {
    try {
      if (!canvasContainer.value) {
        throw new Error('Canvas container not available during p5 setup')
      }

      const canvas = p.createCanvas(
        canvasContainer.value.clientWidth,
        canvasContainer.value.clientHeight
      )
      canvas.parent(canvasContainer.value)
      p.colorMode(p.HSB, 360, 100, 100, 1)
      p.background(0)
      console.log('Audio effect screen initialized')
    } catch (error) {
      console.error('Failed to setup audio effect screen:', error)
    }
  }

  p.draw = function() {
    if (!props.audioAnalyser) return
    
    p.background(0, 0.1)
    
    try {
      const dataArray = new Uint8Array(props.audioAnalyser.frequencyBinCount)
      props.audioAnalyser.getByteFrequencyData(dataArray)
      
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
      
      if (average > AUDIO_THRESHOLD && p.millis() - lastTriggerTime > MIN_TRIGGER_INTERVAL) {
        const effect = new Effect(p.width / 2, p.height / 2)
        effects.push(effect)
        lastTriggerTime = p.millis()
      }
      
      for (let i = effects.length - 1; i >= 0; i--) {
        const effect = effects[i]
        const alive = effect.update()
        if (alive) {
          effect.draw()
        } else {
          effects.splice(i, 1)
        }
      }
    } catch (error) {
      console.error('Error in p5 draw loop:', error)
    }
  }

  p.windowResized = function() {
    if (!canvasContainer.value) return
    p.resizeCanvas(
      canvasContainer.value.clientWidth,
      canvasContainer.value.clientHeight
    )
  }
}

onMounted(() => {
  setTimeout(() => {
    if (canvasContainer.value) {
      p5Instance = new p5(sketch, canvasContainer.value)
      console.log('AudioEffectScreen: p5.js instance created')
    } else {
      console.error('AudioEffectScreen: Canvas container not available')
    }
  }, 100)
})

onUnmounted(() => {
  if (p5Instance) {
    p5Instance.remove()
  }
})
</script>
