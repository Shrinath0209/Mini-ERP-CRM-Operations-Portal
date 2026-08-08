import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { api } from '../utils/api';

const emptyProduct = { name: '', sku: '', category: '', unitPrice: '', currentStock: '', minStockAlert: '10', location: '' };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [form, setForm] = useState(emptyProduct);
  const [showLowStock, setShowLowStock] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('IN');
  const [adjustReason, setAdjustReason] = useState('');
  const { showToast } = useToast();

  const loadProducts = async () => {
    try {
      const url = showLowStock ? '/products?lowStock=true' : '/products';
      const data = await api.get(url);
      setProducts(data || []);
    } catch (e) {
      showToast('Failed to load products', 'error');
    }
  };

  useEffect(() => { loadProducts(); }, [showLowStock]);

  const openCreate = () => {
    setSelectedProduct(null);
    setForm(emptyProduct);
    setIsModalOpen(true);
  };

  const openEdit = (product) => {
    setSelectedProduct(product);
    setForm({
      name: product.name || '',
      sku: product.sku || '',
      category: product.category || '',
      unitPrice: product.unitPrice?.toString() || '',
      currentStock: product.currentStock?.toString() || '0',
      minStockAlert: product.minStockAlert?.toString() || '10',
      location: product.location || ''
    });
    setAdjustQty('');
    setAdjustType('IN');
    setAdjustReason('');
    setIsModalOpen(true);
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        unitPrice: parseFloat(form.unitPrice),
        currentStock: parseInt(form.currentStock) || 0,
        minStockAlert: parseInt(form.minStockAlert) || 10
      };
      if (selectedProduct?.id) {
        await api.put(`/products/${selectedProduct.id}`, payload);
        showToast('Product updated successfully', 'success');
      } else {
        await api.post('/products', payload);
        showToast('Product created successfully', 'success');
      }
      setIsModalOpen(false);
      loadProducts();
    } catch (err) {
      showToast(err.message || 'Failed to save product', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStockAdjust = async () => {
    if (!adjustQty || parseInt(adjustQty) <= 0) {
      showToast('Enter a valid quantity', 'warning');
      return;
    }
    try {
      await api.post('/stock-movements', {
        productId: selectedProduct.id,
        quantity: parseInt(adjustQty),
        type: adjustType,
        reason: adjustReason || `Manual ${adjustType} adjustment`
      });
      showToast(`Stock ${adjustType === 'IN' ? 'added' : 'removed'} successfully`, 'success');
      setAdjustQty('');
      setAdjustReason('');
      loadProducts();
      // Reload product data in form
      const updated = await api.get(`/products/${selectedProduct.id}`);
      setSelectedProduct(updated);
      setForm(prev => ({ ...prev, currentStock: updated.currentStock?.toString() || '0' }));
    } catch (err) {
      showToast(err.message || 'Stock adjustment failed', 'error');
    }
  };

  const columns = [
    { label: 'SKU', key: 'sku' },
    { label: 'Name', key: 'name' },
    { label: 'Category', key: 'category' },
    { label: 'Price', render: (r) => `₹${(r.unitPrice || 0).toLocaleString('en-IN')}` },
    { label: 'Stock', render: (r) => (
      <span style={{ color: r.currentStock <= r.minStockAlert ? 'var(--red)' : 'var(--text-primary)', fontWeight: r.currentStock <= r.minStockAlert ? 'bold' : 'normal' }}>
        {r.currentStock} {r.currentStock <= r.minStockAlert && '⚠️'}
      </span>
    )},
    { label: 'Location', key: 'location' }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Inventory / Products</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={showLowStock} onChange={e => setShowLowStock(e.target.checked)} />
            Low Stock Only
          </label>
          <button className="btn btn-primary" onClick={openCreate}>+ Add Product</button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={products}
        searchable
        searchPlaceholder="Search products..."
        onRowClick={openEdit}
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedProduct?.id ? 'Manage Product' : 'Add Product'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>SKU *</label>
              <input className="input" name="sku" value={form.sku} onChange={handleChange} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Name *</label>
              <input className="input" name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Category</label>
              <input className="input" name="category" value={form.category} onChange={handleChange} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Unit Price (₹) *</label>
              <input className="input" name="unitPrice" type="number" step="0.01" value={form.unitPrice} onChange={handleChange} required />
            </div>
            {!selectedProduct?.id && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Initial Stock</label>
                <input className="input" name="currentStock" type="number" value={form.currentStock} onChange={handleChange} />
              </div>
            )}
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Min Stock Alert</label>
              <input className="input" name="minStockAlert" type="number" value={form.minStockAlert} onChange={handleChange} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Location</label>
            <input className="input" name="location" value={form.location} onChange={handleChange} placeholder="e.g., Aisle 1" />
          </div>

          {selectedProduct?.id && (
            <div className="glass-panel" style={{ padding: '1.25rem', marginTop: '0.5rem' }}>
              <h4 style={{ marginBottom: '0.75rem', color: 'var(--cyan)' }}>📦 Stock Adjustment (Current: {selectedProduct.currentStock})</h4>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                <div style={{ width: '90px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Qty</label>
                  <input className="input" type="number" min="1" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} />
                </div>
                <div style={{ width: '140px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Type</label>
                  <select className="input" value={adjustType} onChange={e => setAdjustType(e.target.value)}>
                    <option value="IN">Add (IN)</option>
                    <option value="OUT">Remove (OUT)</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Reason</label>
                  <input className="input" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="Reason..." />
                </div>
                <button type="button" className="btn btn-success" onClick={handleStockAdjust} style={{ height: '42px' }}>Apply</button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
              {saving ? 'Saving...' : 'Save Product'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)} style={{ flex: 1 }}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
