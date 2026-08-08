import React, { useState, useEffect, createContext, useContext } from 'react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {toasts.map((toast) => (
          <div key={toast.id} className="glass-panel animate-slide-in" style={{
            padding: '1rem 1.5rem',
            borderLeft: `4px solid ${toast.type === 'success' ? 'var(--green)' : toast.type === 'error' ? 'var(--red)' : toast.type === 'warning' ? 'var(--amber)' : 'var(--cyan)'}`,
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'var(--bg-primary)',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
          }}>
            <span style={{ fontWeight: 500 }}>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
