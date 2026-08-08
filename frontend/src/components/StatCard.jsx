import React from 'react';

export default function StatCard({ title, value, icon, color = 'var(--accent)', trend }) {
  return (
    <div className="glass-panel animate-fade-in" style={{
      padding: '1.5rem',
      borderTop: `4px solid ${color}`,
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      transition: 'transform 0.2s',
      cursor: 'default',
    }}
    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{title}</h3>
        <span style={{ fontSize: '1.5rem' }}>{icon}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
        <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</span>
        {trend && (
          <span style={{ fontSize: '0.85rem', color: trend.startsWith('+') ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
