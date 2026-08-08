import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/customers', label: 'Customers', icon: '👥' },
    { path: '/products', label: 'Products', icon: '📦' },
    { path: '/challans', label: 'Challans', icon: '📄' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside className="glass-panel animate-slide-in" style={{ width: '250px', display: 'flex', flexDirection: 'column', margin: '1rem', padding: '1.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h2 className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Mini ERP</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Operations Portal</span>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                textDecoration: 'none',
                color: isActive ? 'white' : 'var(--text-secondary)',
                background: isActive ? 'rgba(79, 70, 229, 0.15)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                transition: 'all 0.2s',
                gap: '0.75rem'
              })}
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user?.name || 'User'}</div>
              <div className="badge badge-blue" style={{ display: 'inline-block', marginTop: '4px' }}>{user?.role || 'Admin'}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ width: '100%' }}>
            🚪 Logout
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '1rem 2rem 1rem 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header className="glass-panel animate-fade-in" style={{ padding: '1rem 2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Welcome back! ✨</h1>
          <button className="btn btn-primary" onClick={() => navigate('/challans')}>+ New Challan</button>
        </header>
        <div style={{ flex: 1, overflowY: 'auto' }} className="animate-slide-up">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
