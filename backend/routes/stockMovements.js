const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.use(authenticateToken);

// GET stock movements with optional productId filter
router.get('/', (req, res) => {
  const { productId } = req.query;
  try {
    let query = `
      SELECT sm.*, p.name as productName, p.sku, u.name as createdByName
      FROM stock_movements sm
      JOIN products p ON sm.productId = p.id
      LEFT JOIN users u ON sm.createdBy = u.id
    `;
    let params = [];

    if (productId) {
      query += ' WHERE sm.productId = ?';
      params.push(productId);
    }

    query += ' ORDER BY sm.createdAt DESC';

    const movements = db.prepare(query).all(...params);
    res.json(movements);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch stock movements' });
  }
});

// POST create manual stock adjustment
router.post('/', (req, res) => {
  const { productId, quantity, type, reason, reference } = req.body;

  if (!['IN', 'OUT'].includes(type)) {
    return res.status(400).json({ error: 'Type must be IN or OUT' });
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ error: 'Quantity must be a positive integer' });
  }

  try {
    const product = db.prepare('SELECT currentStock FROM products WHERE id = ?').get(productId);
    if (!product) {
      return res.status(400).json({ error: 'Product not found' });
    }

    if (type === 'OUT' && product.currentStock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    // Create movement
    db.prepare(
      `INSERT INTO stock_movements (id, productId, quantity, type, reason, reference, createdBy, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, productId, quantity, type, reason, reference || '', req.user.id, now);

    // Update product stock
    const stockChange = type === 'IN' ? quantity : -quantity;
    db.prepare('UPDATE products SET currentStock = currentStock + ?, updatedAt = ? WHERE id = ?')
      .run(stockChange, now, productId);

    const newMovement = db.prepare(
      `SELECT sm.*, p.name as productName
       FROM stock_movements sm
       JOIN products p ON sm.productId = p.id
       WHERE sm.id = ?`
    ).get(id);

    res.status(201).json(newMovement);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create stock movement' });
  }
});

module.exports = router;
