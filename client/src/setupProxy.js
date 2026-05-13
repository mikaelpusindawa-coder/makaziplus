const { createProxyMiddleware } = require('http-proxy-middleware');

const TARGET = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace('/api', '')
  : 'http://localhost:5000';

module.exports = function (app) {
  app.use('/api', createProxyMiddleware({ target: TARGET, changeOrigin: true }));
  app.use('/uploads', createProxyMiddleware({ target: TARGET, changeOrigin: true }));
};
