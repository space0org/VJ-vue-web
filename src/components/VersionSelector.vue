<template>
  <div>
    <!-- Semi-transparent center button (visible when VJ mode is closed) -->
    <button 
      v-if="!isVJModeActive && showVersionButton"
      @click="openModal"
      class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 
             w-12 h-12 rounded-full bg-purple-600/30 hover:bg-purple-600/50 
             flex items-center justify-center transition-all duration-300 shadow-lg"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14M5 12h14"></path>
      </svg>
    </button>
    
    <!-- Version selector modal -->
    <div 
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      @click.self="closeModal"
    >
      <div class="bg-gray-900 rounded-lg shadow-xl p-6 max-w-md w-full mx-4 transform transition-all">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-white">バージョン選択</h2>
          <button 
            @click="closeModal"
            class="p-1 rounded-full hover:bg-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="space-y-3 max-h-80 overflow-y-auto">
          <div 
            v-for="version in versions" 
            :key="version.id"
            @click="selectVersion(version)"
            :class="[
              'p-3 rounded-lg cursor-pointer transition-colors',
              selectedVersionId === version.id ? 'bg-purple-700' : 'bg-gray-800 hover:bg-gray-700'
            ]"
          >
            <div class="flex justify-between items-center">
              <h3 class="font-medium text-white">{{ version.name }}</h3>
              <span 
                v-if="selectedVersionId === version.id" 
                class="text-xs bg-purple-500 text-white px-2 py-1 rounded-full"
              >
                現在
              </span>
            </div>
            <p class="text-sm text-gray-400 mt-1">{{ version.description }}</p>
            <div class="mt-2 text-xs text-gray-500">
              <span>深さ: {{ version.config.maxDepth }}</span>
              <span class="mx-2">|</span>
              <span>枝: {{ version.config.branchCount }}</span>
            </div>
          </div>
        </div>
        
        <div class="mt-4 flex justify-end">
          <button 
            @click="closeModal"
            class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { visualizationVersions, getDefaultVersion } from '../utils/VersionManager'

const props = defineProps({
  isVJModeActive: {
    type: Boolean,
    default: false
  },
  currentVersionId: {
    type: String,
    default: ''
  },
  showVersionButton: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['version-selected'])

const versions = ref(visualizationVersions)
const selectedVersionId = ref(props.currentVersionId || getDefaultVersion().id)
const isModalOpen = ref(false)

// Watch for changes in currentVersionId prop
watch(() => props.currentVersionId, (newValue) => {
  if (newValue) {
    selectedVersionId.value = newValue
  }
})

const openModal = () => {
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
}

const selectVersion = (version) => {
  selectedVersionId.value = version.id
  emit('version-selected', version)
  closeModal()
}
</script>
