<template>
  <div id="app">
    <header class="app-header">
      <div class="container">
        <div class="header-content">
          <h1>📁 Local File Share UI</h1>
          <p class="tagline">Preview and manage files from your local server</p>
        </div>

        <div class="server-config">
          <div class="config-input">
            <label for="apiUrl">Server URL:</label>
            <input
              id="apiUrl"
              v-model="apiUrl"
              type="text"
              placeholder="http://localhost:3000/api"
              class="url-input"
            />
            <button @click="testConnection" class="btn-test">Test Connection</button>
          </div>

          <div v-if="connectionStatus" class="connection-status">
            <span :class="['status-indicator', connectionStatus.type]">
              {{ connectionStatus.type === 'success' ? '✓' : '✗' }}
            </span>
            {{ connectionStatus.message }}
          </div>
        </div>
      </div>
    </header>

    <main class="app-main">
      <div class="container">
        <FileList :api-url="apiUrl" />
      </div>
    </main>

    <footer class="app-footer">
      <div class="container">
        <div class="footer-content">
          <div class="footer-section">
            <h3>Quick Links</h3>
            <a :href="apiUrl.replace('/api', '')" target="_blank" class="footer-link">
              📊 Server Dashboard
            </a>
            <a :href="apiUrl + '/myfiles'" target="_blank" class="footer-link"> 📋 Raw JSON </a>
            <a :href="apiUrl.replace('/api', '/web')" target="_blank" class="footer-link">
              🌐 Web Interface
            </a>
          </div>

          <div class="footer-section">
            <h3>How to Use</h3>
            <p>1. Start the backend server</p>
            <p>2. Ensure the API URL is correct</p>
            <p>3. Click files to preview, double-click to download</p>
          </div>

          <div class="footer-section">
            <h3>Server Info</h3>
            <p v-if="serverInfo">
              📁 {{ serverInfo.folder }}<br />
              📄 {{ serverInfo.totalFiles }} files<br />
              ⚙️ Port: {{ getPortFromUrl(apiUrl) || 3000 }}
            </p>
            <p v-else>Server info not available</p>
          </div>
        </div>

        <div class="footer-bottom">
          <p>Local File Share UI v1.0.0 | Made with Vue.js</p>
          <p class="hint">Note: This app runs locally. Files are served from your computer.</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script>
import FileList from './components/FileList.vue'
import axios from 'axios'

export default {
  components: {
    FileList,
  },
  data() {
    return {
      apiUrl: 'http://192.168.18.32:3000/api',
      connectionStatus: null,
      serverInfo: null,
    }
  },
  methods: {
    async testConnection() {
      this.connectionStatus = { type: 'info', message: 'Testing connection...' }

      try {
        const response = await axios.get(this.apiUrl + '/info', { timeout: 5000 })
        this.serverInfo = response.data
        this.connectionStatus = {
          type: 'success',
          message: `Connected to ${response.data.name} v${response.data.version}`,
        }
      } catch (error) {
        this.connectionStatus = {
          type: 'error',
          message: `Failed to connect: ${error.message}`,
        }
        this.serverInfo = null
      }

      // Clear status after 5 seconds
      setTimeout(() => {
        this.connectionStatus = null
      }, 5000)
    },
    getPortFromUrl(url) {
      try {
        const urlObj = new URL(url)
        return urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80')
      } catch {
        return null
      }
    },
  },
  mounted() {
    setTimeout(() => {
      this.testConnection()
    }, 1000)
  },
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  line-height: 1.6;
  color: #333;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 30px 0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.header-content {
  text-align: center;
  margin-bottom: 30px;
}

.header-content h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
  font-weight: 700;
}

.tagline {
  font-size: 1.1rem;
  opacity: 0.9;
  max-width: 600px;
  margin: 0 auto;
}

.server-config {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
}

.config-input {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  flex-wrap: wrap;
  align-items: center;
}

.config-input label {
  font-weight: 500;
  min-width: 100px;
}

.url-input {
  flex: 1;
  min-width: 200px;
  padding: 10px 15px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 8px;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.url-input:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.15);
}

.url-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.btn-test {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-test:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
}

.status-indicator {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.status-indicator.success {
  background: #4caf50;
}

.status-indicator.error {
  background: #f44336;
}

.status-indicator.info {
  background: #2196f3;
}

.app-main {
  flex: 1;
  padding: 30px 0;
  background: #f5f7fa;
}

.app-footer {
  background: #2d3748;
  color: white;
  padding: 40px 0 20px;
}

.footer-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 40px;
  margin-bottom: 40px;
}

.footer-section h3 {
  color: #667eea;
  margin-bottom: 15px;
  font-size: 1.1rem;
}

.footer-link {
  display: block;
  color: #cbd5e0;
  text-decoration: none;
  margin-bottom: 8px;
  transition: color 0.2s ease;
}

.footer-link:hover {
  color: white;
  text-decoration: underline;
}

.footer-section p {
  color: #a0aec0;
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.footer-bottom {
  border-top: 1px solid #4a5568;
  padding-top: 20px;
  text-align: center;
  color: #718096;
  font-size: 0.9rem;
}

.hint {
  font-size: 0.8rem;
  color: #a0aec0;
  margin-top: 10px;
  font-style: italic;
}

@media (max-width: 768px) {
  .header-content h1 {
    font-size: 2rem;
  }

  .config-input {
    flex-direction: column;
    align-items: stretch;
  }

  .config-input label {
    margin-bottom: 5px;
  }

  .url-input,
  .btn-test {
    width: 100%;
  }

  .footer-content {
    grid-template-columns: 1fr;
    gap: 30px;
  }
}
</style>
