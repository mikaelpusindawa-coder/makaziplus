import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n';  // ADD THIS LINE - i18n initialization
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);