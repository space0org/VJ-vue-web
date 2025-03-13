<template>
  <div class="w-full bg-white rounded-lg shadow-sm p-6 mt-4">
    <div class="text-gray-600 text-sm mb-2">周波数スペクトル</div>
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
  },
  style: {
    type: String,
    default: 'default'
  }
})

const canvas = ref(null)
let animationId = null
let dataArray = null

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
  
  // Apply different visualization styles
  switch(props.style) {
    case 'circular':
      drawCircularFrequency(canvasCtx, dataArray, width, height)
      break
    case 'dots':
      drawDotsFrequency(canvasCtx, dataArray, width, height)
      break
    case 'wave':
      drawWaveFrequency(canvasCtx, dataArray, width, height)
      break
    case 'bars':
    default:
      drawBarsFrequency(canvasCtx, dataArray, width, height)
  }
  
  animationId = requestAnimationFrame(draw)
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

onMounted(() => {
  if (props.audioAnalyser) {
    console.log('FrequencyVisualizer: Starting visualization')
    requestAnimationFrame(draw)
  } else {
    console.warn('FrequencyVisualizer: No audio analyser provided')
  }
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})

// Watch for changes in the audio analyser
watch(() => props.audioAnalyser, (newAnalyser) => {
  if (newAnalyser) {
    console.log('FrequencyVisualizer: Audio analyser updated')
    if (!dataArray) {
      dataArray = new Uint8Array(newAnalyser.frequencyBinCount)
    }
    requestAnimationFrame(draw)
  }
})
</script>
