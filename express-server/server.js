const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();
const PORT = 3001;

// Proxy /api requests to the Python backend
app.use('/api', createProxyMiddleware({
  target: 'http://data-service:5000', // Target the Python Flask backend service
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api' // Rewrite path, e.g., /api/data becomes /api/data on Flask
  }
}));

// Serve static files from the React build directory if needed (though Nginx handles this in frontend Dockerfile)
// For a simple combined setup where Express serves both, you'd uncomment and configure this:
// app.use(express.static('../frontend/build'));
// app.get('*', (req, res) => {
//   res.sendFile(path.resolve(__dirname, '../frontend', 'build', 'index.html'));
// });

app.listen(PORT, () => {
  console.log(`Express proxy server running on port ${PORT}`);
});