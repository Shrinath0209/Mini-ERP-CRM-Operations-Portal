const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.use(authenticateToken);

// GET all products with optional search and lowStock filter
router.get('/', (req, res) => {
  const { search, lowStock } = req.query;
  try {
    let query = 'SELECT * FROM products';
    let conditions = [];
    let params = [];

    if (search) {
      conditions.push('(name LIKE ? OR sku LIKE ? OR category LIKE ?)');
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (lowStock === 'true') {
      conditions.push('currentStock <= minStockAlert');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY createdAt DESC';

    const products = db.prepare(query).all(...params);
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET single product
router.get('/:id', (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST create product
router.post('/', (req, res) => {
  const { name, sku, category, unitPrice, currentStock, minStockAlert, location } = req.body;
  try {
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO products (id, name, sku, category, unitPrice, currentStock, minStockAlert, location, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id, name, sku, category, unitPrice,
      currentStock || 0, minStockAlert || 10, location,
      now, now
    );

    // If initial stock > 0, create a stock movement
    if (currentStock > 0) {
      db.prepare(
        `INSERT INTO stock_movements (id, productId, quantity, type, reason, reference, createdBy, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(uuidv4(), id, currentStock, 'IN', 'Initial Stock', 'SYSTEM', req.user.id, now);
    }

    const newProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.status(201).json(newProduct);
  } catch (error) {
    console.error(error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'SKU must be unique' });
    }
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT update product
router.put('/:id', (req, res) => {
  const { name, sku, category, unitPrice, minStockAlert, location } = req.body;
  try {
    const now = new Date().toISOString();

    // Note: We don't update currentStock directly here. It should be done via stock movements.
    const result = db.prepare(
      `UPDATE products
       SET name = ?, sku = ?, category = ?, unitPrice = ?, minStockAlert = ?, location = ?, updatedAt = ?
       WHERE id = ?`
    ).run(
      name, sku, category, unitPrice, minStockAlert, location, now,
      req.params.id
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updatedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    res.json(updatedProduct);
  } catch (error) {
    console.error(error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'SKU must be unique' });
    }
    res.status(500).json({ error: 'Failed to update product' });
  }
});

module.exports = router;
