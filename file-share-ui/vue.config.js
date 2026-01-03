module.exports = {
  devServer: {
    port: 5173,
    host: '0.0.0.0', // Allow access from network
    proxy: {
      // Optional: Proxy API requests during development
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        pathRewrite: {
          '^/api': '/api',
        },
      },
    },
  },
}
