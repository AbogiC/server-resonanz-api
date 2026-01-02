<template>
  <div class="file-preview-overlay" v-if="visible" @click="closePreview">
    <div class="file-preview-container" @click.stop>
      <div class="preview-header">
        <h3>{{ currentFile.name }}</h3>
        <div class="preview-actions">
          <button @click="downloadFile" class="btn-download">
            <span>⬇️ Download</span>
          </button>
          <button @click="closePreview" class="btn-close">✕</button>
        </div>
      </div>

      <div class="preview-content">
        <!-- PDF Preview -->
        <div v-if="isPDF" class="pdf-preview">
          <iframe
            :src="fileUrl"
            frameborder="0"
            class="pdf-frame"
            @load="isLoading = false"
          ></iframe>
        </div>

        <!-- Image Preview -->
        <div v-else-if="isImage" class="image-preview">
          <img
            :src="fileUrl"
            :alt="currentFile.name"
            @load="isLoading = false"
            @error="handleImageError"
          />
        </div>

        <!-- Text Preview -->
        <div v-else-if="isText" class="text-preview">
          <pre>{{ fileContent }}</pre>
        </div>

        <!-- Video Preview -->
        <div v-else-if="isVideo" class="video-preview">
          <video
            controls
            :src="fileUrl"
            @loadeddata="isLoading = false"
            class="video-player"
          ></video>
        </div>

        <!-- Audio Preview -->
        <div v-else-if="isAudio" class="audio-preview">
          <audio
            controls
            :src="fileUrl"
            @loadeddata="isLoading = false"
            class="audio-player"
          ></audio>
        </div>

        <!-- Unsupported/Generic Preview -->
        <div v-else class="generic-preview">
          <div class="file-icon-large">
            <span class="icon">{{ getFileIcon(currentFile.name) }}</span>
          </div>
          <p>Preview not available for this file type</p>
          <p class="file-info">
            Size: {{ formatBytes(currentFile.size) }}<br />
            Type: {{ currentFile.name.split('.').pop()?.toUpperCase() }}
          </p>
          <button @click="downloadFile" class="btn-primary">⬇️ Download File</button>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="loading-preview">
          <div class="spinner"></div>
          <p>Loading preview...</p>
        </div>
      </div>

      <div class="preview-footer">
        <div class="file-info">
          <span>📏 {{ formatBytes(currentFile.size) }}</span>
          <span>📅 {{ formatDate(currentFile.lastModified) }}</span>
          <span v-if="currentFile.type">📄 {{ currentFile.type }}</span>
        </div>
        <div class="navigation" v-if="files.length > 1">
          <button @click="prevFile" :disabled="currentIndex === 0" class="btn-nav">
            ◀ Previous
          </button>
          <span>{{ currentIndex + 1 }} of {{ files.length }}</span>
          <button @click="nextFile" :disabled="currentIndex === files.length - 1" class="btn-nav">
            Next ▶
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import axios from 'axios'

const props = defineProps({
  visible: Boolean,
  currentFile: Object,
  files: Array,
  apiBaseUrl: {
    type: String,
    default: 'http://localhost:3000/api',
  },
})

const emit = defineEmits(['close', 'prev', 'next'])

const isLoading = ref(true)
const fileContent = ref('')
const fileUrl = computed(() => {
  if (!props.currentFile) return ''
  return `${props.apiBaseUrl}/myfiles/${encodeURIComponent(props.currentFile.name)}`
})

const currentIndex = computed(() => {
  return props.files.findIndex((f) => f.name === props.currentFile?.name)
})

// File type detection
const isPDF = computed(() => props.currentFile?.name.toLowerCase().endsWith('.pdf'))
const isImage = computed(() => {
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
  return imageExts.some((ext) => props.currentFile?.name.toLowerCase().endsWith(ext))
})
const isText = computed(() => props.currentFile?.name.toLowerCase().endsWith('.txt'))
const isVideo = computed(() => {
  const videoExts = ['.mp4', '.webm', '.avi', '.mov']
  return videoExts.some((ext) => props.currentFile?.name.toLowerCase().endsWith(ext))
})
const isAudio = computed(() => {
  const audioExts = ['.mp3', '.wav', '.ogg']
  return audioExts.some((ext) => props.currentFile?.name.toLowerCase().endsWith(ext))
})

// Methods
function closePreview() {
  emit('close')
}

function prevFile() {
  if (currentIndex.value > 0) {
    emit('prev', props.files[currentIndex.value - 1])
  }
}

function nextFile() {
  if (currentIndex.value < props.files.length - 1) {
    emit('next', props.files[currentIndex.value + 1])
  }
}

function downloadFile() {
  window.open(fileUrl.value, '_blank')
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return (
    date.toLocaleDateString() +
    ' ' +
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  )
}

function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  const icons = {
    pdf: '📕',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️',
    gif: '🖼️',
    txt: '📄',
    doc: '📝',
    docx: '📝',
    xls: '📊',
    xlsx: '📊',
    mp4: '🎬',
    avi: '🎬',
    mov: '🎬',
    mp3: '🎵',
    wav: '🎵',
    zip: '📦',
    rar: '📦',
    exe: '⚙️',
    default: '📁',
  }
  return icons[ext] || icons.default
}

function handleImageError() {
  isLoading.value = false
  // Could show error state here
}

// Watch for file changes
watch(
  () => props.currentFile,
  () => {
    isLoading.value = true
    fileContent.value = ''

    // Load text content for text files
    if (isText.value && props.currentFile) {
      axios
        .get(fileUrl.value, { responseType: 'text' })
        .then((response) => {
          fileContent.value = response.data
          isLoading.value = false
        })
        .catch(() => {
          isLoading.value = false
        })
    }
  },
  { immediate: true },
)

// Keyboard navigation
onMounted(() => {
  const handleKeydown = (e) => {
    if (!props.visible) return
    if (e.key === 'Escape') closePreview()
    if (e.key === 'ArrowLeft') prevFile()
    if (e.key === 'ArrowRight') nextFile()
  }

  window.addEventListener('keydown', handleKeydown)

  return () => {
    window.removeEventListener('keydown', handleKeydown)
  }
})
</script>

<style scoped>
.file-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.file-preview-container {
  background: #1e1e1e;
  border-radius: 16px;
  width: 90vw;
  max-width: 1200px;
  height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease;
}

.preview-header {
  padding: 20px;
  background: #2d2d2d;
  border-radius: 16px 16px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #444;
}

.preview-header h3 {
  margin: 0;
  color: white;
  font-size: 1.2rem;
  font-weight: 500;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 20px;
}

.preview-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.btn-download {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: transform 0.2s ease;
}

.btn-download:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.btn-close {
  background: #444;
  color: white;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  transition: background 0.2s ease;
}

.btn-close:hover {
  background: #666;
}

.preview-content {
  flex: 1;
  padding: 20px;
  overflow: hidden;
  position: relative;
}

.pdf-preview,
.image-preview,
.video-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pdf-frame {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
}

.image-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
}

.text-preview {
  background: #2d2d2d;
  border-radius: 8px;
  padding: 20px;
  height: 100%;
  overflow: auto;
}

.text-preview pre {
  margin: 0;
  color: #e0e0e0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.video-player,
.audio-player {
  width: 100%;
  max-width: 800px;
}

.generic-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #aaa;
}

.file-icon-large {
  font-size: 4rem;
  margin-bottom: 20px;
}

.file-info {
  margin: 10px 0;
  text-align: center;
  color: #888;
}

.btn-primary {
  background: #667eea;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 20px;
  transition: background 0.2s ease;
}

.btn-primary:hover {
  background: #764ba2;
}

.loading-preview {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(30, 30, 30, 0.9);
  color: #aaa;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #444;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

.preview-footer {
  padding: 15px 20px;
  background: #2d2d2d;
  border-radius: 0 0 16px 16px;
  border-top: 1px solid #444;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #aaa;
  font-size: 0.9rem;
}

.preview-footer .file-info {
  display: flex;
  gap: 20px;
}

.navigation {
  display: flex;
  align-items: center;
  gap: 15px;
}

.btn-nav {
  background: #444;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn-nav:hover:not(:disabled) {
  background: #666;
}

.btn-nav:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .file-preview-container {
    width: 95vw;
    height: 90vh;
  }

  .preview-header {
    padding: 15px;
  }

  .preview-footer {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }

  .preview-footer .file-info {
    flex-direction: column;
    gap: 5px;
  }
}
</style>
