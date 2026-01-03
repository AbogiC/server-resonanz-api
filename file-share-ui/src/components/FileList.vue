<template>
  <div class="file-list-container">
    <!-- Header -->
    <div class="list-header">
      <div class="header-content">
        <h1>📁 Local File Share</h1>
        <p class="subtitle">{{ apiUrl }} | {{ files.length }} files</p>
      </div>

      <div class="header-actions">
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search files..."
            class="search-input"
          />
          <span class="search-icon">🔍</span>
        </div>

        <div class="view-controls">
          <button
            @click="viewMode = 'grid'"
            :class="{ active: viewMode === 'grid' }"
            class="view-btn"
            title="Grid View"
          >
            ▦
          </button>
          <button
            @click="viewMode = 'list'"
            :class="{ active: viewMode === 'list' }"
            class="view-btn"
            title="List View"
          >
            ☰
          </button>
        </div>

        <button @click="refreshFiles" class="btn-refresh" :disabled="loading">
          {{ loading ? '🔄 Loading...' : '🔄 Refresh' }}
        </button>
      </div>
    </div>

    <!-- Stats Bar -->
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-label">📁 Folder:</span>
        <span class="stat-value">{{ folderPath }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">📄 Files:</span>
        <span class="stat-value">{{ files.length }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">📊 Total Size:</span>
        <span class="stat-value">{{ formatBytes(totalSize) }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">👁️ View:</span>
        <span class="stat-value">{{ viewMode === 'grid' ? 'Grid' : 'List' }}</span>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && files.length === 0" class="loading-state">
      <div class="spinner"></div>
      <p>Loading files from server...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <div class="error-icon">❌</div>
      <h3>Failed to load files</h3>
      <p>{{ error }}</p>
      <button @click="refreshFiles" class="btn-retry">Retry Connection</button>
      <div class="server-config">
        <p>Make sure your file server is running at:</p>
        <code>{{ apiUrl }}</code>
        <p class="hint">Run: <code>node server.js</code> in your backend folder</p>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredFiles.length === 0" class="empty-state">
      <div class="empty-icon">📁</div>
      <h3>No files found</h3>
      <p v-if="searchQuery">No files match "{{ searchQuery }}"</p>
      <p v-else>The folder is empty</p>
      <button @click="refreshFiles" class="btn-refresh">Check Again</button>
    </div>

    <!-- File List/Grid -->
    <div v-else :class="['files-display', viewMode]">
      <!-- Grid View -->
      <div v-if="viewMode === 'grid'" class="grid-view">
        <div
          v-for="file in filteredFiles"
          :key="file.name"
          class="file-card"
          @click="openPreview(file)"
          @dblclick="downloadFile(file)"
        >
          <div class="file-card-header">
            <div class="file-icon">
              <span class="icon">{{ getFileIcon(file.name) }}</span>
            </div>
            <div class="file-actions">
              <button @click.stop="downloadFile(file)" class="action-btn" title="Download">
                ⬇️
              </button>
            </div>
          </div>

          <div class="file-card-body">
            <h4 class="file-name" :title="file.name">
              {{ truncateFileName(file.name) }}
            </h4>
            <p class="file-size">{{ formatBytes(file.size) }}</p>
            <p class="file-date">
              {{ formatDate(file.lastModified) }}
            </p>
          </div>

          <div class="file-card-footer">
            <div class="file-type">
              {{ getFileType(file.name) }}
            </div>
            <button @click.stop="openPreview(file)" class="preview-btn">👁️ Preview</button>
          </div>
        </div>
      </div>

      <!-- List View -->
      <div v-else class="list-view">
        <table class="file-table">
          <thead>
            <tr>
              <th @click="sortBy('name')" class="sortable">
                Name
                <span v-if="sortField === 'name'" class="sort-icon">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th @click="sortBy('size')" class="sortable">
                Size
                <span v-if="sortField === 'size'" class="sort-icon">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th @click="sortBy('lastModified')" class="sortable">
                Modified
                <span v-if="sortField === 'lastModified'" class="sort-icon">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
              </th>
              <th>Type</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="file in filteredFiles"
              :key="file.name"
              @click="openPreview(file)"
              class="file-row"
            >
              <td class="file-name-cell">
                <div class="file-name-wrapper">
                  <span class="file-icon-small">
                    {{ getFileIcon(file.name) }}
                  </span>
                  <span class="file-name" :title="file.name">
                    {{ file.name }}
                  </span>
                </div>
              </td>
              <td class="file-size-cell">
                {{ formatBytes(file.size) }}
              </td>
              <td class="file-date-cell">
                {{ formatDate(file.lastModified) }}
              </td>
              <td class="file-type-cell">
                {{ getFileType(file.name) }}
              </td>
              <td class="file-actions-cell">
                <div class="action-buttons">
                  <button @click.stop="openPreview(file)" class="btn-preview" title="Preview">
                    👁️
                  </button>
                  <button @click.stop="downloadFile(file)" class="btn-download" title="Download">
                    ⬇️
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- File Preview Modal -->
    <FilePreview
      v-if="previewVisible"
      :visible="previewVisible"
      :currentFile="selectedFile"
      :files="files"
      :apiBaseUrl="apiUrl"
      @close="closePreview"
      @prev="prevFile"
      @next="nextFile"
    />

    <!-- Footer -->
    <div class="list-footer">
      <div class="footer-content">
        <div class="server-status" :class="{ online: !error, offline: error }">
          <span class="status-dot"></span>
          {{ error ? 'Server Offline' : 'Server Online' }}
        </div>
        <div class="footer-info">
          <span>Showing {{ filteredFiles.length }} of {{ files.length }} files</span>
          <span v-if="searchQuery">• Search: "{{ searchQuery }}"</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import FilePreview from './FilePreview.vue'

export default {
  components: {
    FilePreview,
  },
  props: {
    apiUrl: {
      type: String,
      default: 'http://localhost:3000/api',
    },
  },
  data() {
    return {
      files: [],
      loading: true,
      error: null,
      searchQuery: '',
      viewMode: 'grid',
      previewVisible: false,
      selectedFile: null,
      sortField: 'name',
      sortDirection: 'asc',
      folderPath: '',
    }
  },
  computed: {
    filteredFiles() {
      let filtered = this.files

      // Apply search filter
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase()
        filtered = filtered.filter((file) => file.name.toLowerCase().includes(query))
      }

      // Apply sorting
      filtered = [...filtered].sort((a, b) => {
        let aVal = a[this.sortField]
        let bVal = b[this.sortField]

        // Handle date strings
        if (this.sortField === 'lastModified') {
          aVal = new Date(aVal).getTime()
          bVal = new Date(bVal).getTime()
        }

        if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1
        if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1
        return 0
      })

      return filtered
    },
    totalSize() {
      return this.files.reduce((sum, file) => sum + file.size, 0)
    },
  },
  methods: {
    async fetchFiles() {
      this.loading = true
      this.error = null

      try {
        const response = await axios.get(`${this.apiUrl}/myfiles`)

        if (response.data && response.data.files) {
          this.files = response.data.files
          this.folderPath = response.data.folder
        } else {
          this.files = []
        }
      } catch (err) {
        console.error('Failed to fetch files:', err)
        this.error = err.message || 'Failed to connect to server'
        this.files = []
      } finally {
        this.loading = false
      }
    },
    refreshFiles() {
      this.fetchFiles()
    },
    sortBy(field) {
      if (this.sortField === field) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc'
      } else {
        this.sortField = field
        this.sortDirection = 'asc'
      }
    },
    openPreview(file) {
      this.selectedFile = file
      this.previewVisible = true
    },
    closePreview() {
      this.previewVisible = false
      this.selectedFile = null
    },
    prevFile(file) {
      const currentIndex = this.files.findIndex((f) => f.name === file.name)
      if (currentIndex > 0) {
        this.selectedFile = this.files[currentIndex - 1]
      }
    },
    nextFile(file) {
      const currentIndex = this.files.findIndex((f) => f.name === file.name)
      if (currentIndex < this.files.length - 1) {
        this.selectedFile = this.files[currentIndex + 1]
      }
    },
    downloadFile(file) {
      const url = `${this.apiUrl}/myfiles/${encodeURIComponent(file.name)}`
      window.open(url, '_blank')
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
      const now = new Date()
      const diffTime = Math.abs(now - date)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays === 1) return 'Yesterday'
      if (diffDays < 7) return `${diffDays} days ago`

      return date.toLocaleDateString()
    },
    truncateFileName(name, maxLength = 20) {
      if (name.length <= maxLength) return name
      const extIndex = name.lastIndexOf('.')
      if (extIndex === -1) return name.substring(0, maxLength) + '...'

      const ext = name.substring(extIndex)
      const nameWithoutExt = name.substring(0, extIndex)
      const truncatedName = nameWithoutExt.substring(0, maxLength - ext.length - 3) + '...'
      return truncatedName + ext
    },
    getFileIcon(filename) {
      const ext = filename.split('.').pop().toLowerCase()
      const icons = {
        pdf: '📕',
        jpg: '🖼️',
        jpeg: '🖼️',
        png: '🖼️',
        gif: '🖼️',
        bmp: '🖼️',
        webp: '🖼️',
        txt: '📄',
        doc: '📝',
        docx: '📝',
        xls: '📊',
        xlsx: '📊',
        mp4: '🎬',
        avi: '🎬',
        mov: '🎬',
        webm: '🎬',
        mp3: '🎵',
        wav: '🎵',
        ogg: '🎵',
        zip: '📦',
        rar: '📦',
        '7z': '📦',
        exe: '⚙️',
        msi: '⚙️',
        default: '📁',
      }
      return icons[ext] || icons.default
    },
    getFileType(filename) {
      const ext = filename.split('.').pop().toUpperCase()
      return ext || 'FILE'
    },
  },
  mounted() {
    this.fetchFiles()

    // Auto-refresh every 30 seconds
    setInterval(() => {
      if (!this.previewVisible) {
        this.fetchFiles()
      }
    }, 30000)
  },
  watch: {
    apiUrl() {
      this.fetchFiles()
    },
  },
}
</script>

<style scoped>
.file-list-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
}

.list-header {
  background: white;
  padding: 20px 40px;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.header-content h1 {
  margin: 0;
  color: #333;
  font-size: 1.8rem;
  font-weight: 600;
}

.subtitle {
  margin: 5px 0 0 0;
  color: #666;
  font-size: 0.9rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
}

.search-input {
  padding: 10px 15px 10px 40px;
  border: 2px solid #e1e5e9;
  border-radius: 10px;
  font-size: 0.9rem;
  width: 250px;
  transition: all 0.3s ease;
  background: #f8f9fa;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  background: white;
}

.search-icon {
  position: absolute;
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
  color: #999;
}

.view-controls {
  display: flex;
  gap: 5px;
  background: #f8f9fa;
  padding: 5px;
  border-radius: 10px;
}

.view-btn {
  background: transparent;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.2s ease;
}

.view-btn:hover {
  background: #e9ecef;
}

.view-btn.active {
  background: #667eea;
  color: white;
}

.btn-refresh {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 500;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.btn-refresh:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.btn-refresh:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.stats-bar {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  margin: 20px 40px;
  padding: 15px 25px;
  border-radius: 12px;
  display: flex;
  gap: 40px;
  flex-wrap: wrap;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-label {
  color: #666;
  font-size: 0.9rem;
}

.stat-value {
  color: #333;
  font-weight: 500;
}

.loading-state,
.error-state,
.empty-state {
  background: white;
  margin: 40px;
  padding: 60px 40px;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
}

.spinner {
  width: 50px;
  height: 50px;
  border: 3px solid #f3f3f3;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

.error-icon,
.empty-icon {
  font-size: 3rem;
  margin-bottom: 20px;
}

.error-state h3,
.empty-state h3 {
  color: #333;
  margin-bottom: 10px;
}

.error-state p,
.empty-state p {
  color: #666;
  margin-bottom: 20px;
}

.btn-retry {
  background: #667eea;
  color: white;
  border: none;
  padding: 10px 25px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s ease;
}

.btn-retry:hover {
  background: #764ba2;
}

.server-config {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.server-config code {
  background: #f8f9fa;
  padding: 5px 10px;
  border-radius: 4px;
  font-family: monospace;
  color: #333;
  display: block;
  margin: 10px auto;
  max-width: 300px;
}

.hint {
  font-size: 0.9rem;
  color: #888;
  margin-top: 10px;
}

.files-display {
  margin: 0 40px 40px;
}

/* Grid View */
.grid-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.file-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  border: 2px solid transparent;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.file-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
  border-color: #667eea;
}

.file-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.file-icon {
  font-size: 2.5rem;
}

.action-btn {
  background: transparent;
  border: none;
  padding: 5px;
  cursor: pointer;
  font-size: 1.2rem;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.action-btn:hover {
  opacity: 1;
}

.file-card-body {
  flex: 1;
  margin-bottom: 15px;
}

.file-name {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 1rem;
  font-weight: 600;
  word-break: break-word;
}

.file-size,
.file-date {
  margin: 5px 0;
  color: #666;
  font-size: 0.9rem;
}

.file-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.file-type {
  background: #f8f9fa;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  color: #666;
}

.preview-btn {
  background: transparent;
  border: 1px solid #667eea;
  color: #667eea;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s ease;
}

.preview-btn:hover {
  background: #667eea;
  color: white;
}

/* List View */
.list-view {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.file-table {
  width: 100%;
  border-collapse: collapse;
}

.file-table thead {
  background: #f8f9fa;
  border-bottom: 2px solid #e9ecef;
}

.file-table th {
  padding: 15px 20px;
  text-align: left;
  font-weight: 600;
  color: #666;
  font-size: 0.9rem;
  user-select: none;
}

.sortable {
  cursor: pointer;
  transition: background 0.2s ease;
}

.sortable:hover {
  background: #e9ecef;
}

.sort-icon {
  margin-left: 5px;
  color: #667eea;
}

.file-row {
  border-bottom: 1px solid #e9ecef;
  transition: background 0.2s ease;
}

.file-row:hover {
  background: #f8f9fa;
}

.file-table td {
  padding: 15px 20px;
  color: #333;
}

.file-name-cell {
  width: 40%;
}

.file-name-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.file-icon-small {
  font-size: 1.2rem;
}

.file-name {
  word-break: break-word;
}

.file-size-cell,
.file-date-cell {
  width: 15%;
}

.file-type-cell {
  width: 10%;
}

.file-actions-cell {
  width: 20%;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.btn-preview,
.btn-download {
  background: transparent;
  border: 1px solid #ddd;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.btn-preview:hover {
  background: #667eea;
  border-color: #667eea;
  color: white;
}

.btn-download:hover {
  background: #4caf50;
  border-color: #4caf50;
  color: white;
}

.list-footer {
  background: white;
  padding: 20px 40px;
  border-top: 1px solid #e9ecef;
  margin-top: auto;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
}

.server-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
}

.server-status.online {
  background: #e8f5e9;
  color: #2e7d32;
}

.server-status.offline {
  background: #ffebee;
  color: #c62828;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.online .status-dot {
  background: #4caf50;
  animation: pulse 2s infinite;
}

.offline .status-dot {
  background: #f44336;
}

.footer-info {
  color: #666;
  font-size: 0.9rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@media (max-width: 768px) {
  .list-header,
  .stats-bar,
  .files-display,
  .list-footer {
    margin: 20px;
    padding: 15px;
  }

  .grid-view {
    grid-template-columns: 1fr;
  }

  .search-input {
    width: 200px;
  }

  .file-table {
    display: block;
    overflow-x: auto;
  }

  .stat-item {
    flex: 1 0 calc(50% - 20px);
  }
}

@media (max-width: 480px) {
  .header-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    width: 100%;
  }

  .stat-item {
    flex: 1 0 100%;
  }

  .footer-content {
    flex-direction: column;
    text-align: center;
  }
}
</style>
