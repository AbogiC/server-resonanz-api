const https = require("https");
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const os = require("os");

const SSL_CONFIG = {
  key: fs.readFileSync('./ssl/key.pem'),
  cert: fs.readFileSync('./ssl/cert.pem')
};

const app = express();
const PORT = process.env.PORT || 3000;

// Get local IP addresses
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  Object.keys(interfaces).forEach((ifaceName) => {
    interfaces[ifaceName].forEach((iface) => {
      // Skip internal and non-IPv4 addresses
      if (iface.family === "IPv4" && !iface.internal) {
        addresses.push({
          interface: ifaceName,
          address: iface.address,
        });
      }
    });
  });

  return addresses;
}

// Middleware
app.use(cors());
app.use(express.json());

// Configuration
const CONFIG = {
  basePath: process.env.SHARE_FOLDER || "./files",
  host: process.env.HOST || "0.0.0.0", // Listen on all interfaces
  allowedExtensions: [
    ".pdf",
    ".txt",
    ".jpg",
    ".png",
    ".jpeg",
    ".gif",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".mp4",
    ".mp3",
    ".zip",
    ".rar",
  ],
  maxFileSize: 100 * 1024 * 1024, // 100MB max file size
};

// Ensure the base directory exists
if (!fs.existsSync(CONFIG.basePath)) {
  fs.mkdirSync(CONFIG.basePath, { recursive: true });
  console.log(`Created directory: ${CONFIG.basePath}`);
}

// Helper function to check if file extension is allowed
function isAllowedExtension(filename) {
  const ext = path.extname(filename).toLowerCase();
  return (
    CONFIG.allowedExtensions.length === 0 ||
    CONFIG.allowedExtensions.includes(ext)
  );
}

// API to list all files
app.get("/api/myfiles", (req, res) => {
  try {
    fs.readdir(CONFIG.basePath, (err, files) => {
      if (err) {
        return res.status(500).json({ error: "Unable to read directory" });
      }

      const fileList = files
        .map((file) => {
          try {
            const filePath = path.join(CONFIG.basePath, file);
            const stats = fs.statSync(filePath);
            return {
              name: file,
              path: `/api/myfiles/${encodeURIComponent(file)}`,
              url: `https://${req.headers.host}/api/myfiles/${encodeURIComponent(
                file
              )}`,
              size: stats.size,
              sizeFormatted: formatBytes(stats.size),
              lastModified: stats.mtime,
              isDirectory: stats.isDirectory(),
            };
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean);

      res.json({
        folder: CONFIG.basePath,
        totalFiles: fileList.length,
        files: fileList,
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API to serve a specific file
app.get("/api/myfiles/:filename", (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename);
    const filePath = path.join(CONFIG.basePath, filename);

    // Security check: prevent directory traversal
    const resolvedPath = path.resolve(filePath);
    const baseResolvedPath = path.resolve(CONFIG.basePath);

    if (!resolvedPath.startsWith(baseResolvedPath)) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    const stats = fs.statSync(filePath);

    // Check if it's a directory
    if (stats.isDirectory()) {
      return res
        .status(400)
        .json({ error: "Cannot serve directories directly" });
    }

    // Check file size
    if (stats.size > CONFIG.maxFileSize) {
      return res.status(413).json({
        error: "File too large",
        maxSize: formatBytes(CONFIG.maxFileSize),
        fileSize: formatBytes(stats.size),
      });
    }

    // Check if extension is allowed (if restrictions are set)
    if (!isAllowedExtension(filename) && CONFIG.allowedExtensions.length > 0) {
      return res.status(403).json({
        error: "File type not allowed",
        allowedTypes: CONFIG.allowedExtensions,
      });
    }

    // Set appropriate headers
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      ".pdf": "application/pdf",
      ".txt": "text/plain",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".mp4": "video/mp4",
      ".mp3": "audio/mpeg",
      ".zip": "application/zip",
      ".rar": "application/x-rar-compressed",
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xls": "application/vnd.ms-excel",
      ".xlsx":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };

    res.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");
    res.setHeader("Content-Length", stats.size);
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.setHeader("Cache-Control", "public, max-age=3600"); // Cache for 1 hour

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Browse directory contents (new endpoint)
app.get("/api/browse/*", (req, res) => {
  try {
    const relativePath = req.params[0] || "";
    const dirPath = path.join(CONFIG.basePath, relativePath);

    // Security check
    const resolvedPath = path.resolve(dirPath);
    const baseResolvedPath = path.resolve(CONFIG.basePath);

    if (!resolvedPath.startsWith(baseResolvedPath)) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!fs.existsSync(dirPath)) {
      return res.status(404).json({ error: "Directory not found" });
    }

    const stats = fs.statSync(dirPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: "Not a directory" });
    }

    fs.readdir(dirPath, (err, files) => {
      if (err) {
        return res.status(500).json({ error: "Unable to read directory" });
      }

      const items = files.map((file) => {
        const itemPath = path.join(dirPath, file);
        const itemStats = fs.statSync(itemPath);
        const isDir = itemStats.isDirectory();

        return {
          name: file,
          type: isDir ? "directory" : "file",
          path: isDir
            ? `/api/browse/${path.join(relativePath, file)}`
            : `/api/myfiles/${path.join(relativePath, file)}`,
          size: itemStats.size,
          sizeFormatted: isDir ? "-" : formatBytes(itemStats.size),
          lastModified: itemStats.mtime,
          extension: isDir ? "" : path.extname(file).toLowerCase(),
        };
      });

      res.json({
        currentPath: relativePath || "/",
        parentPath: relativePath
          ? `/api/browse/${path.dirname(relativePath)}`
          : null,
        items: items.sort((a, b) => {
          // Directories first, then files
          if (a.type === "directory" && b.type !== "directory") return -1;
          if (a.type !== "directory" && b.type === "directory") return 1;
          return a.name.localeCompare(b.name);
        }),
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Web interface
app.get("/web", (req, res) => {
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Local File Share</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
        padding: 20px;
        color: #333;
      }
      
      .container {
        max-width: 1200px;
        margin: 0 auto;
        background: white;
        border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        overflow: hidden;
      }
      
      header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 30px 40px;
      }
      
      header h1 {
        font-size: 2.5em;
        margin-bottom: 10px;
      }
      
      .server-info {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        margin-top: 20px;
        background: rgba(255,255,255,0.1);
        padding: 15px;
        border-radius: 10px;
      }
      
      .server-info div {
        background: rgba(255,255,255,0.2);
        padding: 10px 15px;
        border-radius: 5px;
        backdrop-filter: blur(10px);
      }
      
      .main-content {
        padding: 40px;
      }
      
      .links-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin: 30px 0;
      }
      
      .link-card {
        background: #f8f9fa;
        padding: 25px;
        border-radius: 10px;
        text-decoration: none;
        color: #333;
        transition: all 0.3s ease;
        border: 2px solid transparent;
      }
      
      .link-card:hover {
        background: white;
        border-color: #667eea;
        transform: translateY(-5px);
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      }
      
      .link-card h3 {
        color: #667eea;
        margin-bottom: 10px;
        font-size: 1.3em;
      }
      
      .link-card p {
        color: #666;
        line-height: 1.5;
      }
      
      .file-input {
        margin: 30px 0;
        padding: 20px;
        background: #f8f9fa;
        border-radius: 10px;
      }
      
      input[type="file"] {
        width: 100%;
        padding: 15px;
        border: 2px dashed #667eea;
        border-radius: 5px;
        background: white;
        cursor: pointer;
      }
      
      footer {
        text-align: center;
        padding: 20px;
        background: #f8f9fa;
        color: #666;
        border-top: 1px solid #eaeaea;
      }
      
      @media (max-width: 768px) {
        .container {
          border-radius: 0;
        }
        
        header {
          padding: 20px;
        }
        
        .main-content {
          padding: 20px;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <header>
        <h1>📁 Local File Share</h1>
        <p>Access and share files from your local folder</p>
        <div class="server-info" id="serverInfo">
          <!-- Filled by JavaScript -->
        </div>
      </header>
      
      <div class="main-content">
        <h2>Quick Access</h2>
        <div class="links-grid">
          <a href="/api/myfiles" class="link-card" target="_blank">
            <h3>📋 List All Files</h3>
            <p>View all available files in JSON format</p>
          </a>
          
          <a href="/api/browse" class="link-card" target="_blank">
            <h3>📁 Browse Files</h3>
            <p>Browse directories and files with API</p>
          </a>
          
          <a href="/web/browser" class="link-card">
            <h3>🌐 File Browser</h3>
            <p>Web-based file browser interface</p>
          </a>
          
          <a href="/api/info" class="link-card" target="_blank">
            <h3>ℹ️ Server Info</h3>
            <p>View server configuration and endpoints</p>
          </a>
        </div>
        
        <div class="file-input">
          <h3>Quick File Access</h3>
          <p>Enter filename to access directly:</p>
          <input type="text" id="filenameInput" placeholder="Enter filename (e.g., confutatis.pdf)" 
                 style="width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 5px;">
          <button onclick="openFile()" style="background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
            Open File
          </button>
        </div>
      </div>
      
      <footer>
        <p>Running on port ${PORT} | Folder: ${CONFIG.basePath}</p>
      </footer>
    </div>
    
    <script>
      // Display server URLs
      const serverInfo = document.getElementById('serverInfo');
      const protocol = 'https';
      const hostname = window.location.hostname;
      const port = window.location.port;
      
      const urls = [
        { name: 'Local URL', url: \`http://localhost:\${port}\` },
        { name: 'Network URL', url: \`\${protocol}//\${hostname}:\${port}\` }
      ];
      
      // Add all network interfaces
      fetch('/api/network')
        .then(r => r.json())
        .then(data => {
          data.interfaces.forEach(iface => {
            urls.push({ 
              name: \`\${iface.interface} (\${iface.address})\`, 
              url: \`http://\${iface.address}:\${port}\` 
            });
          });
          
          serverInfo.innerHTML = urls.map(url => \`
            <div>
              <strong>\${url.name}:</strong><br>
              <a href="\${url.url}" target="_blank" style="color: white; text-decoration: underline;">
                \${url.url}
              </a>
            </div>
          \`).join('');
        })
        .catch(() => {
          // Fallback if network endpoint fails
          serverInfo.innerHTML = urls.map(url => \`
            <div>
              <strong>\${url.name}:</strong><br>
              <a href="\${url.url}" target="_blank" style="color: white; text-decoration: underline;">
                \${url.url}
              </a>
            </div>
          \`).join('');
        });
      
      function openFile() {
        const filename = document.getElementById('filenameInput').value;
        if (filename) {
          const encoded = encodeURIComponent(filename);
          window.open(\`/api/myfiles/\${encoded}\`, '_blank');
        }
      }
      
      // Enter key support for filename input
      document.getElementById('filenameInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          openFile();
        }
      });
    </script>
  </body>
  </html>
  `;

  res.send(html);
});

// Web-based file browser
app.get("/web/browser", (req, res) => {
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>File Browser</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; }
      .file-item { padding: 10px; border-bottom: 1px solid #eee; }
      .file-item:hover { background: #f5f5f5; }
      .directory { color: #2196F3; }
      .file { color: #4CAF50; }
      a { text-decoration: none; }
      .path { background: #f0f0f0; padding: 10px; margin-bottom: 20px; }
    </style>
  </head>
  <body>
    <h1>File Browser</h1>
    <div class="path" id="path"></div>
    <div id="content"></div>
    <script>
      async function loadPath(path = '') {
        const response = await fetch(\`/api/browse/\${path}\`);
        const data = await response.json();
        
        document.getElementById('path').innerHTML = \`
          <strong>Current Path:</strong> \${data.currentPath}
          \${data.parentPath ? \`<br><a href="#" onclick="loadPath('\${data.parentPath.replace('/api/browse/', '')}')">↑ Go Up</a>\` : ''}
        \`;
        
        const itemsHtml = data.items.map(item => \`
          <div class="file-item \${item.type}">
            \${item.type === 'directory' ? '📁' : '📄'}
            <a href="\${item.type === 'directory' ? '#' : item.path}" 
               \${item.type === 'directory' ? \`onclick="loadPath('\${item.path.replace('/api/browse/', '')}')"\` : 'target="_blank"'}
               class="\${item.type}">
              \${item.name}
            </a>
            <span style="float: right; color: #666;">
              \${item.sizeFormatted} • \${new Date(item.lastModified).toLocaleDateString()}
            </span>
          </div>
        \`).join('');
        
        document.getElementById('content').innerHTML = itemsHtml;
      }
      
      loadPath();
    </script>
  </body>
  </html>
  `;

  res.send(html);
});

// Network info endpoint
app.get("/api/network", (req, res) => {
  const interfaces = getLocalIPs();
  res.json({
    hostname: os.hostname(),
    platform: os.platform(),
    interfaces: interfaces,
  });
});

// Server info endpoint
app.get("/api/info", (req, res) => {
  const localIPs = getLocalIPs();
  const urls = localIPs.map((ip) => `http://${ip.address}:${PORT}`);

  res.json({
    name: "Local File Share API",
    version: "1.0.0",
    server: {
      host: CONFIG.host,
      port: PORT,
      basePath: CONFIG.basePath,
    },
    accessUrls: {
      local: `http://localhost:${PORT}`,
      network: urls,
      webInterface: `http://localhost:${PORT}/web`,
      fileBrowser: `http://localhost:${PORT}/web/browser`,
    },
    endpoints: {
      listFiles: "GET /api/myfiles",
      getFile: "GET /api/myfiles/:filename",
      browse: "GET /api/browse/*",
      networkInfo: "GET /api/network",
      webInterface: "GET /web",
      fileBrowser: "GET /web/browser",
    },
    limits: {
      maxFileSize: formatBytes(CONFIG.maxFileSize),
      allowedExtensions: CONFIG.allowedExtensions,
    },
  });
});

// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

// Start server
const server = https.createServer(SSL_CONFIG, app).listen(PORT, CONFIG.host, () => {
  const localIPs = getLocalIPs();

  console.log("\n" + "=".repeat(60));
  console.log("📁 LOCAL FILE SHARE SERVER");
  console.log("=".repeat(60));

  console.log("\n✅ Server is running!");
  console.log("\n📡 ACCESS URLs:");
  console.log("   Local:     http://localhost:" + PORT);
  console.log("   Network:");
  localIPs.forEach((ip) => {
    console.log(`     • http://${ip.address}:${PORT} (${ip.interface})`);
  });

  console.log("\n🌐 WEB INTERFACES:");
  console.log("   Main:      http://localhost:" + PORT + "/web");
  console.log("   Browser:   http://localhost:" + PORT + "/web/browser");

  console.log("\n🔧 API ENDPOINTS:");
  console.log("   List files: http://localhost:" + PORT + "/api/myfiles");
  console.log(
    "   File:       http://localhost:" + PORT + "/api/myfiles/{filename}"
  );
  console.log("   Browse:     http://localhost:" + PORT + "/api/browse/");
  console.log("   Server info: http://localhost:" + PORT + "/api/info");

  console.log("\n📂 SERVING FILES FROM:");
  console.log("   " + CONFIG.basePath);

  console.log("\n" + "=".repeat(60));
  console.log("Press Ctrl+C to stop the server");
  console.log("=".repeat(60) + "\n");
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Shutting down server...");
  server.close(() => {
    console.log("✅ Server stopped");
    process.exit(0);
  });
});
