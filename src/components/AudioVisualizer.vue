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
      v-if="isRecording && !error && analyser && (props.mode === 'all' || props.mode === 'particles')" 
      :audioAnalyser="getAnalyser()"
      :theme="props.theme"
    />
    <FrequencyVisualizer 
      v-if="isRecording && !error && analyser && (props.mode === 'all' || props.mode === 'frequency')" 
      :audioAnalyser="getAnalyser()"
      :theme="props.theme"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import confetti from 'canvas-confetti'
import FrequencyVisualizer from './FrequencyVisualizer.vue'
import P5Visualizer from './P5Visualizer.vue'

const props = defineProps({
  mode: {
    type: String,
    default: 'all'
  },
  theme: {
    type: String,
    default: 'default'
  }
})

const canvas = ref(null)
const isRecording = ref(false)
const error = ref('')
const isFullscreen = ref(false)
let audioContext = null
let analyser = null
let dataArray = null
let source = null
let animationId = null

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
  // Allow time for the container to resize before adjusting the canvas
  setTimeout(() => {
    if (canvas.value) {
      // Adjust canvas dimensions to match container size in fullscreen mode
      if (isFullscreen.value) {
        canvas.value.width = window.innerWidth - 48; // Account for padding
        canvas.value.height = window.innerHeight * 0.8; // 80% of viewport height
      } else {
        canvas.value.width = 800;
        canvas.value.height = 200;
      }
      // Redraw the canvas after resize
      draw();
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
  
  animationId = requestAnimationFrame(draw)
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
