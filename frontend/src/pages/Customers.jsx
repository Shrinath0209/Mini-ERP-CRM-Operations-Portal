import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { api } from '../utils/api';

const emptyCustomer = { name: '', mobile: '', email: '', businessName: '', gstNumber: '', type: 'Lead', address: '', status: 'Active', followUpDate: '', notes: '' };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [form, setForm] = useState(emptyCustomer);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const loadCustomers = async () => {
    try {
      const data = await api.get('/customers');
      setCustomers(data || []);
    } catch (e) {
      showToast('Failed to load customers', 'error');
    }
  };

  useEffect(() => { loadCustomers(); }, []);

  const openCreate = () => {
    setEditingCustomer(null);
    setForm(emptyCustomer);
    setIsModalOpen(true);
  };

  const openEdit = (customer) => {
    setEditingCustomer(customer);
    setForm({
      name: customer.name || '',
      mobile: customer.mobile || '',
      email: customer.email || '',
      businessName: customer.businessName || '',
      gstNumber: customer.gstNumber || '',
      type: customer.type || 'Lead',
      address: customer.address || '',
      status: customer.status || 'Active',
      followUpDate: customer.followUpDate ? customer.followUpDate.split('T')[0] : '',
      notes: customer.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingCustomer?.id) {
        await api.put(`/customers/${editingCustomer.id}`, form);
        showToast('Customer updated successfully', 'success');
      } else {
        await api.post('/customers', form);
        showToast('Customer created successfully', 'success');
      }
      setIsModalOpen(false);
      loadCustomers();
    } catch (err) {
      showToast(err.message || 'Failed to save customer', 'error');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { label: 'Name', key: 'name' },
    { label: 'Business', key: 'businessName' },
    { label: 'Mobile', key: 'mobile' },
    { label: 'Type', render: (r) => <span className={`badge ${r.type === 'Lead' ? 'badge-amber' : 'badge-green'}`}>{r.type}</span> },
    { label: 'Status', render: (r) => <span className={`badge ${r.status === 'Active' ? 'badge-blue' : r.status === 'Inactive' ? 'badge-red' : 'badge-amber'}`}>{r.status}</span> },
    { label: 'Follow-up', render: (r) => r.followUpDate ? new Date(r.followUpDate).toLocaleDateString() : '—' }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2>Customers</h2>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Customer</button>
      </div>

      <DataTable
        columns={columns}
        data={customers}
        searchable
        searchPlaceholder="Search customers..."
        onRowClick={openEdit}
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCustomer?.id ? 'Edit Customer' : 'Add Customer'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Name *</label>
              <input className="input" name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Business Name</label>
              <input className="input" name="businessName" value={form.businessName} onChange={handleChange} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Mobile *</label>
              <input className="input" name="mobile" value={form.mobile} onChange={handleChange} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Email</label>
              <input className="input" name="email" type="email" value={form.email} onChange={handleChange} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>GST Number</label>
              <input className="input" name="gstNumber" value={form.gstNumber} onChange={handleChange} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Address</label>
              <input className="input" name="address" value={form.address} onChange={handleChange} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Type</label>
              <select className="input" name="type" value={form.type} onChange={handleChange}>
                <option value="Lead">Lead</option>
                <option value="Customer">Customer</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status</label>
              <select className="input" name="status" value={form.status} onChange={handleChange}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Prospect">Prospect</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Follow-up Date</label>
              <input className="input" name="followUpDate" type="date" value={form.followUpDate} onChange={handleChange} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Notes</label>
            <textarea className="input" name="notes" value={form.notes} onChange={handleChange} rows={3} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
              {saving ? 'Saving...' : 'Save Customer'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)} style={{ flex: 1 }}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
