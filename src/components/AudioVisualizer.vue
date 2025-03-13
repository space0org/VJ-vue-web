<template>
  <div>
    <div 
      :class="[
        'transition-all duration-300 ease-in-out bg-white',
        isFullscreen ? 'fixed inset-0 z-50 p-6' : 'w-full rounded-lg shadow-sm p-6'
      ]"
    >
      <div v-if="!isRecording && !error" class="flex flex-col items-center gap-4">
        <div class="text-gray-600 mb-2">
          マイクを使用して波形を表示します
        </div>
        <button 
          @click="startRecording" 
          class="px-6 py-3 bg-blue-500 text-white font-medium rounded-lg shadow-sm hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          マイクを許可する
        </button>
      </div>
      <div v-else-if="error" class="flex flex-col items-center gap-4 text-center">
        <div class="text-red-500 font-medium">{{ error }}</div>
        <button 
          @click="retryRecording" 
          class="px-6 py-3 bg-blue-500 text-white font-medium rounded-lg shadow-sm hover:bg-blue-600 transition-colors"
        >
          再試行する
        </button>
      </div>
      <div v-else class="relative">
        <div class="text-gray-600 text-sm mb-2">マイクからの入力を波形で表示しています</div>
        <canvas 
          ref="canvas" 
          width="800" 
          height="200" 
          :class="[
            'border border-gray-200 bg-white',
            isFullscreen ? 'w-full h-[80vh]' : 'w-full h-48 rounded-lg'
          ]"
        ></canvas>
        
        <button 
          @click="toggleFullscreen" 
          class="absolute bottom-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
        >
          <svg v-if="!isFullscreen" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
          </svg>
        </button>
        
        <button 
          v-if="isFullscreen"
          @click="isFullscreen = false"
          class="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
    <P5Visualizer 
      v-if="isRecording && !error && analyser" 
      :audioAnalyser="getAnalyser()"
      :theme="props.theme"
      :style="props.style"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import confetti from 'canvas-confetti'
import P5Visualizer from './P5Visualizer.vue'

const props = defineProps({
  mode: {
    type: String,
    default: 'all'
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

const emit = defineEmits(['analyser-ready'])

const canvas = ref(null)
const isRecording = ref(false)
const error = ref('')
const isFullscreen = ref(false)
let audioContext = null
let analyser = null
let dataArray = null
let source = null
let animationId = null

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

const getAnalyser = () => {
  if (!analyser) {
    console.warn('Audio analyser not initialized')
    return null
  }
  console.log('Providing audio analyser:', {
    fftSize: analyser.fftSize,
    frequencyBinCount: analyser.frequencyBinCount
  })
  return analyser
}

const startRecording = async () => {
  try {
    console.log('Starting recording...')
    error.value = ''
    
    // For testing in environments without microphone access
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log('Microphone access granted')
    } catch (err) {
      console.warn('Microphone access denied, using mock data for testing')
      // Create a mock audio context for testing
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      
      // Create oscillator as mock audio source
      const oscillator = audioContext.createOscillator()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime)
      oscillator.connect(analyser)
      oscillator.start()
      
      const bufferLength = analyser.frequencyBinCount
      dataArray = new Uint8Array(bufferLength)
      
      console.log('Mock audio context initialized for testing')
      
      isRecording.value = true
      confetti()
      
      // Emit the analyser to parent component
      emit('analyser-ready', analyser)
      
      requestAnimationFrame(draw)
      return
    }
    
    audioContext = new AudioContext()
    analyser = audioContext.createAnalyser()
    source = audioContext.createMediaStreamSource(stream)
    source.connect(analyser)
    
    analyser.fftSize = 2048
    const bufferLength = analyser.frequencyBinCount
    dataArray = new Uint8Array(bufferLength)
    
    console.log('Audio context initialized:', {
      sampleRate: audioContext.sampleRate,
      fftSize: analyser.fftSize,
      bufferLength
    })
    
    isRecording.value = true
    confetti()
    
    // Emit the analyser to parent component
    emit('analyser-ready', analyser)
    
    requestAnimationFrame(draw)
  } catch (err) {
    let message = 'マイクの許可が得られませんでした'
    if (err.name === 'NotFoundError') {
      message = 'マイクが見つかりませんでした。マイクが接続されているか確認してください。'
    } else if (err.name === 'NotAllowedError') {
      message = 'マイクの使用が許可されませんでした。ブラウザの設定を確認してください。'
    }
    error.value = message
    console.error(message, err)
  }
}

const retryRecording = () => {
  error.value = ''
  startRecording()
}

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
  
  // Allow time for the container to resize before redrawing
  setTimeout(() => {
    if (canvas.value) {
      if (isFullscreen.value) {
        canvas.value.width = window.innerWidth - 48 // Account for padding
        canvas.value.height = window.innerHeight * 0.8 // 80% of viewport height
      } else {
        canvas.value.width = 800
        canvas.value.height = 200
      }
      
      // Redraw the canvas after resize
      if (isRecording.value) {
        draw()
      }
    }
  }, 300)
}

const draw = () => {
  if (!canvas.value || !isRecording.value) return
  
  const canvasCtx = canvas.value.getContext('2d')
  const width = canvas.value.width
  const height = canvas.value.height
  
  analyser.getByteTimeDomainData(dataArray)
  
  canvasCtx.fillStyle = 'rgb(255, 255, 255)'
  canvasCtx.fillRect(0, 0, width, height)
  
  // Different visualization styles
  switch(props.style) {
    case 'circular':
      drawCircularWaveform(canvasCtx, dataArray, width, height)
      break
    case 'bars':
      drawBarsWaveform(canvasCtx, dataArray, width, height)
      break
    case 'dots':
      drawDotsWaveform(canvasCtx, dataArray, width, height)
      break
    case 'wave':
      drawWaveWaveform(canvasCtx, dataArray, width, height)
      break
    default:
      drawDefaultWaveform(canvasCtx, dataArray, width, height)
  }
  
  animationId = requestAnimationFrame(draw)
}

const drawDefaultWaveform = (canvasCtx, dataArray, width, height) => {
  canvasCtx.lineWidth = 2
  canvasCtx.strokeStyle = 'rgb(0, 0, 0)'
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

const drawCircularWaveform = (canvasCtx, dataArray, width, height) => {
  // Get theme colors
  const themeColors = getThemeColors(props.theme)
  const hueStart = themeColors.hueStart || 0
  const hueEnd = themeColors.hueEnd || 360
  
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.min(width, height) / 3
  
  // 内側と外側の円を描画
  canvasCtx.beginPath()
  canvasCtx.strokeStyle = `hsla(${hueStart}, 80%, 50%, 0.3)`
  canvasCtx.lineWidth = 1
  canvasCtx.arc(centerX, centerY, radius * 0.8, 0, Math.PI * 2)
  canvasCtx.stroke()
  
  canvasCtx.beginPath()
  canvasCtx.strokeStyle = `hsla(${hueEnd}, 80%, 50%, 0.3)`
  canvasCtx.arc(centerX, centerY, radius * 1.2, 0, Math.PI * 2)
  canvasCtx.stroke()
  
  // メイン波形を描画
  canvasCtx.beginPath()
  canvasCtx.lineWidth = 3
  
  // 円環波形を描画
  for (let i = 0; i < dataArray.length; i += 8) {
    const v = dataArray[i] / 128.0
    const angle = (i / dataArray.length) * Math.PI * 2
    
    // 半径を変動させて円環効果を作成
    const r = radius * (0.9 + v * 0.3)
    const x = centerX + Math.cos(angle) * r
    const y = centerY + Math.sin(angle) * r
    
    // 位置に基づいて色を計算
    const hue = hueStart + ((i / dataArray.length) * (hueEnd - hueStart))
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

const drawBarsWaveform = (canvasCtx, dataArray, width, height) => {
  // Get theme colors
  const themeColors = getThemeColors(props.theme)
  const hueStart = themeColors.hueStart || 0
  const hueEnd = themeColors.hueEnd || 360
  
  const barCount = 64 // Reduce number of bars for better visualization
  const barWidth = width / barCount
  const barSpacing = 2
  
  for (let i = 0; i < barCount; i++) {
    // Sample from dataArray at regular intervals
    const dataIndex = Math.floor(i * (dataArray.length / barCount))
    const v = dataArray[dataIndex] / 128.0
    const barHeight = v * height * 0.8
    
    const x = i * barWidth
    const y = height - barHeight
    
    // Calculate color based on bar height and position
    const hue = hueStart + ((i / barCount) * (hueEnd - hueStart))
    const saturation = 70 + (v * 30)
    const lightness = 40 + (v * 20)
    
    canvasCtx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`
    canvasCtx.fillRect(x + barSpacing/2, y, barWidth - barSpacing, barHeight)
  }
}

const drawDotsWaveform = (canvasCtx, dataArray, width, height) => {
  // Get theme colors
  const themeColors = getThemeColors(props.theme)
  const hueStart = themeColors.hueStart || 0
  const hueEnd = themeColors.hueEnd || 360
  
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
    const hue = hueStart + ((i / dotCount) * (hueEnd - hueStart))
    const saturation = 70 + (v * 30)
    const lightness = 40 + (v * 20)
    
    canvasCtx.beginPath()
    canvasCtx.arc(x, y, dotSize, 0, Math.PI * 2)
    canvasCtx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`
    canvasCtx.fill()
  }
}

const drawWaveWaveform = (canvasCtx, dataArray, width, height) => {
  // Get theme colors
  const themeColors = getThemeColors(props.theme)
  const hueStart = themeColors.hueStart || 0
  const hueEnd = themeColors.hueEnd || 360
  
  // Draw multiple waves with offset
  const waveCount = 5
  const waveSpacing = height / (waveCount + 1)
  
  for (let wave = 0; wave < waveCount; wave++) {
    const yOffset = (wave + 1) * waveSpacing
    
    // Calculate color based on wave position
    const hue = hueStart + ((wave / waveCount) * (hueEnd - hueStart))
    canvasCtx.strokeStyle = `hsl(${hue}, 80%, 50%)`
    canvasCtx.lineWidth = 2
    
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

// Handle window resize events when in fullscreen mode
const handleResize = () => {
  if (isFullscreen.value && canvas.value) {
    canvas.value.width = window.innerWidth - 48; // Account for padding
    canvas.value.height = window.innerHeight * 0.8; // 80% of viewport height
    // Redraw the canvas after resize
    if (isRecording.value) {
      draw();
    }
  }
}

// Handle keyboard events for fullscreen toggle
const handleKeyDown = (event) => {
  if (event.key === 'Escape' && isFullscreen.value) {
    isFullscreen.value = false
  } else if (event.key === 'f' && isRecording.value) {
    toggleFullscreen()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('resize', handleResize);
})

onUnmounted(() => {
  console.log('AudioVisualizer unmounting...')
  if (animationId) {
    console.log('Canceling animation frame')
    cancelAnimationFrame(animationId)
  }
  if (audioContext) {
    console.log('Closing audio context')
    audioContext.close()
  }
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('resize', handleResize);
})
</script>
