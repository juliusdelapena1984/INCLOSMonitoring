const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api', // All requests starting with /api will be proxied
    createProxyMiddleware({
      target: 'http://express-server:3001', // Target the Express.js server
      changeOrigin: true,
    })
  );
};