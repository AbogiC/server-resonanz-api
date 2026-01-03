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
            Type: {{ (currentFile.name.split('.').pop() || '').toUpperCase() }}
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

<script>
import axios from 'axios'

export default {
  props: {
    visible: Boolean,
    currentFile: Object,
    files: Array,
    apiBaseUrl: {
      type: String,
      default: 'http://localhost:3000/api',
    },
  },
  data() {
    return {
      isLoading: true,
      fileContent: '',
    }
  },
  computed: {
    fileUrl() {
      if (!this.currentFile) return ''
      return `${this.apiBaseUrl}/myfiles/${encodeURIComponent(this.currentFile.name)}`
    },
    currentIndex() {
      return this.files.findIndex((f) => f.name === (this.currentFile && this.currentFile.name))
    },
    isPDF() {
      return this.currentFile && this.currentFile.name.toLowerCase().endsWith('.pdf')
    },
    isImage() {
      const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
      return imageExts.some(
        (ext) => this.currentFile && this.currentFile.name.toLowerCase().endsWith(ext)
      )
    },
    isText() {
      return this.currentFile && this.currentFile.name.toLowerCase().endsWith('.txt')
    },
    isVideo() {
      const videoExts = ['.mp4', '.webm', '.avi', '.mov']
      return videoExts.some(
        (ext) => this.currentFile && this.currentFile.name.toLowerCase().endsWith(ext)
      )
    },
    isAudio() {
      const audioExts = ['.mp3', '.wav', '.ogg']
      return audioExts.some(
        (ext) => this.currentFile && this.currentFile.name.toLowerCase().endsWith(ext)
      )
    },
  },
  methods: {
    closePreview() {
      this.$emit('close')
    },
    prevFile() {
      if (this.currentIndex > 0) {
        this.$emit('prev', this.files[this.currentIndex - 1])
      }
    },
    nextFile() {
      if (this.currentIndex < this.files.length - 1) {
        this.$emit('next', this.files[this.currentIndex + 1])
      }
    },
    downloadFile() {
      window.open(this.fileUrl, '_blank')
    },
    formatBytes(bytes) {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    },
    formatDate(dateString) {
      const date = new Date(dateString)
      return (
        date.toLocaleDateString() +
        ' ' +
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      )
    },
    getFileIcon(filename) {
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
    },
    handleImageError() {
      this.isLoading = false
      // Could show error state here
    },
  },
  watch: {
    currentFile: {
      handler() {
        this.isLoading = true
        this.fileContent = ''

        // Load text content for text files
        if (this.isText && this.currentFile) {
          axios
            .get(this.fileUrl, { responseType: 'text' })
            .then((response) => {
              this.fileContent = response.data
              this.isLoading = false
            })
            .catch(() => {
              this.isLoading = false
            })
        }
      },
      immediate: true,
    },
  },
  mounted() {
    const handleKeydown = (e) => {
      if (!this.visible) return
      if (e.key === 'Escape') this.closePreview()
      if (e.key === 'ArrowLeft') this.prevFile()
      if (e.key === 'ArrowRight') this.nextFile()
    }

    window.addEventListener('keydown', handleKeydown)
    this._keydownHandler = handleKeydown
  },
  beforeDestroy() {
    if (this._keydownHandler) {
      window.removeEventListener('keydown', this._keydownHandler)
    }
  },
}
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
