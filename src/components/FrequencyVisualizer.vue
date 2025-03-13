<template>
  <div class="w-full bg-white rounded-lg shadow-sm p-6 mt-4">
    <div class="text-gray-600 text-sm mb-2">周波数スペクトル表示</div>
    <canvas 
      ref="canvas" 
      width="800" 
      height="200" 
      class="w-full h-48 border border-gray-200 rounded-lg bg-black"
    ></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

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

const canvas = ref(null)
let animationId = null
let dataArray = null

const draw = () => {
  if (!canvas.value || !props.audioAnalyser) return
  
  const canvasCtx = canvas.value.getContext('2d')
  const width = canvas.value.width
  const height = canvas.value.height
  
  // Get frequency data
  if (!dataArray) {
    dataArray = new Uint8Array(props.audioAnalyser.frequencyBinCount)
  }
  props.audioAnalyser.getByteFrequencyData(dataArray)
  
  // Clear canvas
  canvasCtx.fillStyle = 'rgb(0, 0, 0)'
  canvasCtx.fillRect(0, 0, width, height)
  
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
  
  animationId = requestAnimationFrame(draw)
}

watch(() => props.audioAnalyser, (newVal) => {
  if (newVal) {
    requestAnimationFrame(draw)
  }
})

onMounted(() => {
  if (props.audioAnalyser) {
    requestAnimationFrame(draw)
  }
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})
</script>
