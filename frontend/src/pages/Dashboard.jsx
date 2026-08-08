import React, { useState, useEffect } from 'react';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import { api } from '../utils/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        <StatCard title="Total Customers" value={stats?.totalCustomers || 0} icon="👥" color="var(--accent)" />
        <StatCard title="Total Products" value={stats?.totalProducts || 0} icon="📦" color="var(--cyan)" />
        <StatCard title="Total Challans" value={stats?.totalChallans || 0} icon="📄" color="var(--amber)" />
        <StatCard title="Revenue" value={`₹${(stats?.totalRevenue || 0).toLocaleString('en-IN')}`} icon="💰" color="var(--green)" trend="+12.5%" />
        <StatCard title="Low Stock Items" value={stats?.lowStockProducts || 0} icon="⚠️" color="var(--red)" />
        <StatCard title="Confirmed Challans" value={stats?.confirmedChallans || 0} icon="✅" color="var(--accent-light)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div>
          <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Recent Customers</h3>
          <DataTable
            columns={[
              { label: 'Name', key: 'name' },
              { label: 'Business', key: 'businessName' },
              { label: 'Type', render: (r) => <span className={`badge ${r.type === 'Lead' ? 'badge-amber' : 'badge-green'}`}>{r.type}</span> },
              { label: 'Status', render: (r) => <span className={`badge ${r.status === 'Active' ? 'badge-blue' : 'badge-red'}`}>{r.status}</span> }
            ]}
            data={stats?.recentCustomers || []}
          />
        </div>
        <div>
          <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Recent Challans</h3>
          <DataTable
            columns={[
              { label: 'Challan #', key: 'challanNumber' },
              { label: 'Customer', key: 'customerName' },
              { label: 'Amount', render: (r) => `₹${(r.totalAmount || 0).toLocaleString('en-IN')}` },
              { label: 'Status', render: (r) => (
                <span className={`badge ${r.status === 'Confirmed' ? 'badge-green' : r.status === 'Cancelled' ? 'badge-red' : 'badge-amber'}`}>
                  {r.status}
                </span>
              )}
            ]}
            data={stats?.recentChallans || []}
          />
        </div>
      </div>
    </div>
  );
}
