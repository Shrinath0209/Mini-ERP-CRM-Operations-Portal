const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.use(authenticateToken);

// GET all challans
router.get('/', (req, res) => {
  try {
    const challans = db.prepare(
      `SELECT c.*, cust.name as customerName, cust.businessName
       FROM challans c
       JOIN customers cust ON c.customerId = cust.id
       ORDER BY c.createdAt DESC`
    ).all();
    res.json(challans);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch challans' });
  }
});

// GET single challan with items
router.get('/:id', (req, res) => {
  try {
    const challan = db.prepare(
      `SELECT c.*, cust.name as customerName, cust.businessName, cust.address, cust.mobile
       FROM challans c
       JOIN customers cust ON c.customerId = cust.id
       WHERE c.id = ?`
    ).get(req.params.id);

    if (!challan) {
      return res.status(404).json({ error: 'Challan not found' });
    }

    const items = db.prepare('SELECT * FROM challan_items WHERE challanId = ?').all(req.params.id);
    challan.items = items;

    res.json(challan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch challan' });
  }
});

// POST create draft challan
router.post('/', (req, res) => {
  const { customerId, notes, items } = req.body;

  if (!items || !items.length) {
    return res.status(400).json({ error: 'Challan must have at least one item' });
  }

  try {
    const challanId = uuidv4();
    const now = new Date().toISOString();

    // Generate Challan Number
    const countResult = db.prepare('SELECT COUNT(*) as count FROM challans').get();
    const count = (countResult.count || 0) + 1;
    const challanNumber = 'CH-' + count.toString().padStart(4, '0');

    let totalAmount = 0;
    let totalQuantity = 0;

    // Insert Items and calculate totals
    for (const item of items) {
      const product = db.prepare('SELECT name, unitPrice FROM products WHERE id = ?').get(item.productId);
      if (!product) {
        return res.status(400).json({ error: `Product ${item.productId} not found` });
      }

      const unitPrice = item.unitPrice || product.unitPrice;
      const totalPrice = unitPrice * item.quantity;

      totalAmount += totalPrice;
      totalQuantity += item.quantity;

      db.prepare(
        `INSERT INTO challan_items (id, challanId, productId, productName, quantity, unitPrice, totalPrice)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        uuidv4(), challanId, item.productId, product.name,
        item.quantity, unitPrice, totalPrice
      );
    }

    // Insert Challan
    db.prepare(
      `INSERT INTO challans (id, challanNumber, customerId, totalAmount, totalQuantity, status, notes, createdBy, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      challanId, challanNumber, customerId, totalAmount, totalQuantity,
      'Draft', notes || '', req.user.id, now, now
    );

    res.status(201).json({ id: challanId, challanNumber, message: 'Draft challan created' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to create challan' });
  }
});

// PUT update draft challan
router.put('/:id', (req, res) => {
  const { notes, items } = req.body;
  const challanId = req.params.id;

  try {
    const challan = db.prepare('SELECT status FROM challans WHERE id = ?').get(challanId);
    if (!challan) return res.status(404).json({ error: 'Challan not found' });
    if (challan.status !== 'Draft') return res.status(400).json({ error: 'Only Draft challans can be updated' });

    const now = new Date().toISOString();
    let totalAmount = 0;
    let totalQuantity = 0;

    // Delete old items
    db.prepare('DELETE FROM challan_items WHERE challanId = ?').run(challanId);

    // Insert new items
    if (items && items.length > 0) {
      for (const item of items) {
        const product = db.prepare('SELECT name, unitPrice FROM products WHERE id = ?').get(item.productId);
        if (!product) return res.status(400).json({ error: `Product ${item.productId} not found` });

        const unitPrice = item.unitPrice || product.unitPrice;
        const totalPrice = unitPrice * item.quantity;

        totalAmount += totalPrice;
        totalQuantity += item.quantity;

        db.prepare(
          `INSERT INTO challan_items (id, challanId, productId, productName, quantity, unitPrice, totalPrice)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(
          uuidv4(), challanId, item.productId, product.name,
          item.quantity, unitPrice, totalPrice
        );
      }
    }

    // Update Challan
    db.prepare(
      `UPDATE challans
       SET totalAmount = ?, totalQuantity = ?, notes = ?, updatedAt = ?
       WHERE id = ?`
    ).run(totalAmount, totalQuantity, notes || '', now, challanId);

    res.json({ message: 'Challan updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to update challan' });
  }
});


// PUT confirm challan
router.put('/:id/confirm', (req, res) => {
  const challanId = req.params.id;

  try {
    const challan = db.prepare('SELECT * FROM challans WHERE id = ?').get(challanId);
    if (!challan) return res.status(404).json({ error: 'Challan not found' });
    if (challan.status !== 'Draft') return res.status(400).json({ error: 'Only Draft challans can be confirmed' });

    const items = db.prepare('SELECT * FROM challan_items WHERE challanId = ?').all(challanId);
    const now = new Date().toISOString();

    // Check stock for all items first
    for (const item of items) {
      const product = db.prepare('SELECT currentStock, name FROM products WHERE id = ?').get(item.productId);
      if (product.currentStock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for product ${product.name}. Available: ${product.currentStock}, Required: ${item.quantity}` });
      }
    }

    // Deduct stock and create movements
    for (const item of items) {
      db.prepare('UPDATE products SET currentStock = currentStock - ?, updatedAt = ? WHERE id = ?')
        .run(item.quantity, now, item.productId);

      db.prepare(
        `INSERT INTO stock_movements (id, productId, quantity, type, reason, reference, createdBy, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(uuidv4(), item.productId, item.quantity, 'OUT', 'Challan Confirmed', challan.challanNumber, req.user.id, now);
    }

    // Update Challan status
    db.prepare('UPDATE challans SET status = ?, updatedAt = ? WHERE id = ?').run('Confirmed', now, challanId);

    res.json({ message: 'Challan confirmed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to confirm challan' });
  }
});

// PUT cancel challan
router.put('/:id/cancel', (req, res) => {
  const challanId = req.params.id;

  try {
    const challan = db.prepare('SELECT status FROM challans WHERE id = ?').get(challanId);
    if (!challan) return res.status(404).json({ error: 'Challan not found' });
    if (challan.status !== 'Draft') return res.status(400).json({ error: 'Only Draft challans can be cancelled' });

    const now = new Date().toISOString();
    db.prepare('UPDATE challans SET status = ?, updatedAt = ? WHERE id = ?').run('Cancelled', now, challanId);

    res.json({ message: 'Challan cancelled successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to cancel challan' });
  }
});


module.exports = router;
