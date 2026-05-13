// client/src/setupProxy.js
// ─────────────────────────────────────────────────────────────────────────────
// CRA reads this file automatically at startup — no import needed anywhere.
// It proxies BOTH /api AND /uploads from React (port 3000) to the server (port 5000).
//
// WHY THIS FIXES THE IMAGE 404s PERMANENTLY:
//   Without this, CRA only proxies "/api" requests (set in package.json "proxy").
//   Uploaded images at "/uploads/properties/..." are served from port 5000 but
//   the browser requests them from port 3000 → 404.
//   This file tells CRA's dev server to forward ALL /uploads requests to port 5000.
//   No component code needs to change — images just work.
//
// INSTALLATION:
//   npm install http-proxy-middleware --save-dev   (in the client folder)
//   Then place this file at: client/src/setupProxy.js
//   Restart the React dev server (Ctrl+C then npm start).
//
// PRODUCTION (Vercel / Render):
//   On production, REACT_APP_API_URL is set to the real server URL so
//   resolveImageUrl() in helpers.js returns the full https://... URL.
//   This file only affects the local dev server — production is unaffected.

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  const target = process.env.REACT_APP_API_URL
    ? process.env.REACT_APP_API_URL.replace('/api', '')
    : 'http://localhost:5000';

  // Proxy all /api calls
  app.use(
    '/api',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      logLevel: 'silent',
    })
  );

  // Proxy all /uploads calls — THIS is the image fix
  app.use(
    '/uploads',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      logLevel: 'silent',
    })
  );
};