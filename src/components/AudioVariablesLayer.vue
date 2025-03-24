<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import p5 from 'p5'

const props = defineProps({
  audioAnalyser: {
    type: Object,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
})

const containerRef = ref(null)
let p5Instance = null

// Audio data
const bassIntensity = ref(0)
const midIntensity = ref(0)
const highIntensity = ref(0)

// Create p5 instance
const createP5Instance = () => {
  if (p5Instance) {
    p5Instance.remove()
  }

  p5Instance = new p5((p) => {
    // Canvas setup
    p.setup = () => {
      const container = containerRef.value
      if (!container) return
      
      const canvas = p.createCanvas(container.offsetWidth, container.offsetHeight)
      canvas.parent(container)
      p.colorMode(p.HSB, 360, 100, 100, 100)
      p.textAlign(p.CENTER, p.CENTER)
      p.textSize(32) // Increased text size from 16 to 32
      p.strokeWeight(3) // Increased stroke weight from 2 to 3
      p.noFill()
    }

    // Draw function
    p.draw = () => {
      if (!props.isActive || !props.audioAnalyser) return
      
      p.clear()
      
      // Update audio data
      updateAudioData()
      
      // Draw the visualization
      const centerX = p.width / 2
      const centerY = p.height / 2
      
      // Draw all circles at the center with different hues
      // Draw bass visualization (red)
      drawVariableCircle(centerX, centerY, bassIntensity.value, 0)
      
      // Draw mid visualization (yellow)
      drawVariableCircle(centerX, centerY, midIntensity.value, 60)
      
      // Draw high visualization (blue)
      drawVariableCircle(centerX, centerY, highIntensity.value, 240)
    }
    
    // Draw a variable circle without text
    const drawVariableCircle = (x, y, intensity, hue) => {
      // Map intensity to circle size
      const maxRadius = 200 // Increased max radius from 100 to 200
      const minRadius = 40  // Increased min radius from 20 to 40
      const numCircles = 5
      
      // Draw concentric circles with reduced opacity (33%)
      for (let i = 1; i <= numCircles; i++) {
        const radius = p.map(i, 1, numCircles, minRadius, maxRadius) * intensity * 2
        p.stroke(hue, 100, 100, 33) // Reduced opacity to 33%
        p.circle(x, y, radius)
      }
    }
  }, containerRef.value)
}

// Update audio data from analyser
const updateAudioData = () => {
  if (!props.audioAnalyser) return
  
  const analyser = props.audioAnalyser
  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)
  
  // Get frequency data
  analyser.getByteFrequencyData(dataArray)
  
  // Calculate average values for different frequency ranges
  const bassRange = Math.floor(bufferLength * 0.2) // First 20% for bass
  const midRange = Math.floor(bufferLength * 0.5)  // Next 30% for mid
  const highRange = bufferLength                   // Remaining 50% for high
  
  let bassSum = 0
  let midSum = 0
  let highSum = 0
  
  // Calculate bass average (0-20%)
  for (let i = 0; i < bassRange; i++) {
    bassSum += dataArray[i]
  }
  
  // Calculate mid average (20-50%)
  for (let i = bassRange; i < midRange; i++) {
    midSum += dataArray[i]
  }
  
  // Calculate high average (50-100%)
  for (let i = midRange; i < highRange; i++) {
    highSum += dataArray[i]
  }
  
  // Normalize values between 0 and 1
  bassIntensity.value = bassSum / (bassRange * 255)
  midIntensity.value = midSum / ((midRange - bassRange) * 255)
  highIntensity.value = highSum / ((highRange - midRange) * 255)
}

// Initialize p5 instance when component is mounted
onMounted(() => {
  if (containerRef.value) {
    createP5Instance()
  }
})

// Clean up p5 instance when component is unmounted
onUnmounted(() => {
  if (p5Instance) {
    p5Instance.remove()
    p5Instance = null
  }
})

// Recreate p5 instance when container is resized
const handleResize = () => {
  if (containerRef.value && p5Instance) {
    createP5Instance()
  }
}

// Add resize event listener
onMounted(() => {
  window.addEventListener('resize', handleResize)
})

// Remove resize event listener
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

// Watch for changes in isActive prop
watch(() => props.isActive, (newValue) => {
  if (newValue && containerRef.value && !p5Instance) {
    createP5Instance()
  }
})
</script>

<template>
  <div 
    ref="containerRef" 
    class="audio-variables-layer"
    :class="{ 'active': isActive }"
  ></div>
</template>

<style scoped>
.audio-variables-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 30;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.audio-variables-layer.active {
  opacity: 1;
}
</style>
