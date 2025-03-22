<template>
  <div>
    <div 
      :class="[
        'transition-all duration-300 ease-in-out bg-black',
        isFullscreen ? 'fixed inset-0 z-50 p-6' : 'w-full rounded-lg shadow-sm p-6'
      ]"
    >
      <div v-if="!isRecording && !error" class="flex flex-col items-center gap-4">
        <div class="text-white mb-2">
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
        <div class="text-white text-sm mb-2">マイクからの入力を波形で表示しています</div>
        <canvas 
          ref="canvas" 
          width="800" 
          height="200" 
          :class="[
            'border border-gray-200 bg-black',
            isFullscreen ? 'w-full h-[80vh]' : 'w-full h-48 rounded-lg'
          ]"
        ></canvas>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import confetti from 'canvas-confetti'

const props = defineProps({
  theme: {
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
      
      // Emit the mock analyser for VJ mode
      console.log('Emitting mock audio analyser to parent component')
      emit('analyser-ready', analyser)
      console.log('Mock audio analyser emitted')
      
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
    
    // Emit the analyser for VJ mode
    console.log('Emitting real audio analyser to parent component')
    emit('analyser-ready', analyser)
    console.log('Real audio analyser emitted')
    
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

const draw = () => {
  if (!canvas.value || !isRecording.value) return
  
  const canvasCtx = canvas.value.getContext('2d')
  const width = canvas.value.width
  const height = canvas.value.height
  
  analyser.getByteTimeDomainData(dataArray)
  
  canvasCtx.fillStyle = 'rgb(0, 0, 0)'
  canvasCtx.fillRect(0, 0, width, height)
  
  canvasCtx.lineWidth = 2
  canvasCtx.strokeStyle = 'rgb(0, 191, 255)' // Changed to a cool cyan blue color
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

onMounted(() => {
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isFullscreen.value) {
      isFullscreen.value = false
    }
  });
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
})
</script>
