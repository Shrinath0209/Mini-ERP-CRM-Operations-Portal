import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { api } from '../utils/api';

export default function Challans() {
  const [challans, setChallans] = useState([]);
  const [filter, setFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [challanItems, setChallanItems] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const loadChallans = async () => {
    try {
      const data = await api.get('/challans');
      setChallans(data || []);
    } catch (e) {
      showToast('Failed to load challans', 'error');
    }
  };

  const loadFormData = async () => {
    try {
      const [custs, prods] = await Promise.all([
        api.get('/customers'),
        api.get('/products')
      ]);
      setCustomers(custs || []);
      setProducts(prods || []);
    } catch (e) { /* ignore */ }
  };

  useEffect(() => { loadChallans(); }, []);

  const openCreate = () => {
    loadFormData();
    setSelectedCustomer('');
    setChallanItems([]);
    setSelectedProduct('');
    setItemQty(1);
    setNotes('');
    setIsModalOpen(true);
  };

  const openDetail = async (challan) => {
    try {
      const detail = await api.get(`/challans/${challan.id}`);
      setDetailModal(detail);
    } catch (e) {
      showToast('Failed to load challan details', 'error');
    }
  };

  const addItem = () => {
    if (!selectedProduct) { showToast('Select a product', 'warning'); return; }
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;
    if (itemQty <= 0) { showToast('Quantity must be > 0', 'warning'); return; }

    // Check if product already added
    const existing = challanItems.find(i => i.productId === selectedProduct);
    if (existing) {
      setChallanItems(prev => prev.map(i => i.productId === selectedProduct ? { ...i, quantity: i.quantity + itemQty } : i));
    } else {
      setChallanItems(prev => [...prev, {
        productId: product.id,
        productName: product.name,
        unitPrice: product.unitPrice,
        quantity: itemQty,
        availableStock: product.currentStock
      }]);
    }
    setSelectedProduct('');
    setItemQty(1);
  };

  const removeItem = (productId) => {
    setChallanItems(prev => prev.filter(i => i.productId !== productId));
  };

  const grandTotal = challanItems.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0);

  const handleCreateChallan = async () => {
    if (!selectedCustomer) { showToast('Select a customer', 'warning'); return; }
    if (challanItems.length === 0) { showToast('Add at least one item', 'warning'); return; }
    setSaving(true);
    try {
      await api.post('/challans', {
        customerId: selectedCustomer,
        notes,
        items: challanItems.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice
        }))
      });
      showToast('Challan created as Draft', 'success');
      setIsModalOpen(false);
      loadChallans();
    } catch (err) {
      showToast(err.message || 'Failed to create challan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async (id) => {
    try {
      await api.put(`/challans/${id}/confirm`);
      showToast('Challan confirmed! Stock deducted.', 'success');
      setDetailModal(null);
      loadChallans();
    } catch (err) {
      showToast(err.message || 'Failed to confirm challan', 'error');
    }
  };

  const handleCancel = async (id) => {
    try {
      await api.put(`/challans/${id}/cancel`);
      showToast('Challan cancelled', 'info');
      setDetailModal(null);
      loadChallans();
    } catch (err) {
      showToast(err.message || 'Failed to cancel challan', 'error');
    }
  };

  const columns = [
    { label: 'Challan #', key: 'challanNumber' },
    { label: 'Customer', key: 'customerName' },
    { label: 'Qty', key: 'totalQuantity' },
    { label: 'Amount', render: (r) => `₹${(r.totalAmount || 0).toLocaleString('en-IN')}` },
    { label: 'Status', render: (r) => (
      <span className={`badge ${r.status === 'Confirmed' ? 'badge-green' : r.status === 'Cancelled' ? 'badge-red' : 'badge-amber'}`}>
        {r.status}
      </span>
    )},
    { label: 'Date', render: (r) => new Date(r.createdAt).toLocaleDateString() }
  ];

  const filteredChallans = filter === 'All' ? challans : challans.filter(c => c.status === filter);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Sales Challans</h2>
        <button className="btn btn-primary" onClick={openCreate}>+ Create Challan</button>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {['All', 'Draft', 'Confirmed', 'Cancelled'].map(f => (
          <button
            key={f}
            className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <DataTable columns={columns} data={filteredChallans} searchable searchPlaceholder="Search challans..." onRowClick={openDetail} />

      {/* Create Challan Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Challan">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Customer *</label>
            <select className="input" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
              <option value="">Select Customer...</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} — {c.businessName}</option>
              ))}
            </select>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h4 style={{ marginBottom: '0.75rem', color: 'var(--cyan)' }}>📦 Add Items</h4>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 2 }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Product</label>
                <select className="input" value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}>
                  <option value="">Select Product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — Stock: {p.currentStock} — ₹{p.unitPrice}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ width: '80px' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Qty</label>
                <input className="input" type="number" min="1" value={itemQty} onChange={e => setItemQty(parseInt(e.target.value) || 1)} />
              </div>
              <button type="button" className="btn btn-secondary" onClick={addItem} style={{ height: '42px' }}>+ Add</button>
            </div>

            {challanItems.length > 0 && (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Price</th>
                      <th>Qty</th>
                      <th>Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {challanItems.map((item, i) => (
                      <tr key={i}>
                        <td>{item.productName}</td>
                        <td>₹{item.unitPrice.toLocaleString('en-IN')}</td>
                        <td>{item.quantity}</td>
                        <td>₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}</td>
                        <td><button className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => removeItem(item.productId)}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '1.1rem', marginTop: '1rem', color: 'var(--green)' }}>
              Grand Total: ₹{grandTotal.toLocaleString('en-IN')}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Notes</label>
            <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCreateChallan} disabled={saving}>
              {saving ? 'Saving...' : '💾 Save as Draft'}
            </button>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title={`Challan ${detailModal?.challanNumber || ''}`}>
        {detailModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Customer</span>
                <div style={{ fontWeight: 600 }}>{detailModal.customerName}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{detailModal.businessName}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status</span>
                <div><span className={`badge ${detailModal.status === 'Confirmed' ? 'badge-green' : detailModal.status === 'Cancelled' ? 'badge-red' : 'badge-amber'}`}>{detailModal.status}</span></div>
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Address</span>
                <div>{detailModal.address || '—'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Date</span>
                <div>{new Date(detailModal.createdAt).toLocaleDateString()}</div>
              </div>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Product</th><th>Price</th><th>Qty</th><th>Total</th></tr>
                </thead>
                <tbody>
                  {(detailModal.items || []).map((item, i) => (
                    <tr key={i}>
                      <td>{item.productName}</td>
                      <td>₹{(item.unitPrice || 0).toLocaleString('en-IN')}</td>
                      <td>{item.quantity}</td>
                      <td>₹{(item.totalPrice || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '1.1rem', color: 'var(--green)' }}>
              Total: ₹{(detailModal.totalAmount || 0).toLocaleString('en-IN')}
            </div>

            {detailModal.notes && (
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <strong>Notes:</strong> {detailModal.notes}
              </div>
            )}

            {detailModal.status === 'Draft' && (
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn btn-success" style={{ flex: 1 }} onClick={() => handleConfirm(detailModal.id)}>✅ Confirm & Deduct Stock</button>
                <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => handleCancel(detailModal.id)}>❌ Cancel Challan</button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
