import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p.slice(-2), { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3200);
  }, []);

  const STYLES = {
    success: { bg: 'bg-primary text-white', icon: '✓' },
    error:   { bg: 'bg-red-600 text-white',  icon: '✕' },
    warning: { bg: 'bg-gold text-white',     icon: '⚠' },
    info:    { bg: 'bg-ink text-white',      icon: 'ℹ' },
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-wrap">
        {toasts.map(t => {
          const s = STYLES[t.type] || STYLES.info;
          return (
            <div key={t.id} className={`toast ${s.bg}`}>
              <span className="text-sm font-bold opacity-80">{s.icon}</span>
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
