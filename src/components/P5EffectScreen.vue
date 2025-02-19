<template>
  <div class="relative">
    <div 
      ref="canvasContainer" 
      class="w-full bg-black rounded-lg overflow-hidden"
      style="height: 60vh; min-height: 400px;"
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
  let dataArray = null
  let bufferLength = null

  p.setup = () => {
    if (!canvasContainer.value) return

    const canvas = p.createCanvas(
      canvasContainer.value.clientWidth,
      canvasContainer.value.clientHeight
    )
    canvas.parent(canvasContainer.value)
    p.colorMode(p.HSB, 360, 100, 100, 1)
    p.background(0)
  }

  p.draw = () => {
    if (!props.analyser) return
    
    p.background(0, 0.1)
    
    if (!dataArray || !bufferLength) {
      bufferLength = props.analyser.frequencyBinCount
      dataArray = new Uint8Array(bufferLength)
    }
    
    props.analyser.getByteFrequencyData(dataArray)
    
    // Draw frequency spectrum visualization
    const barWidth = p.width / bufferLength
    p.noStroke()
    
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = p.map(dataArray[i], 0, 255, 0, p.height)
      const hue = p.map(i, 0, bufferLength, 0, 360)
      p.fill(hue, 80, 100, 0.7)
      p.rect(i * barWidth, p.height - barHeight, barWidth, barHeight)
    }
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
