const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.use(authenticateToken);

// GET all customers with optional search
router.get('/', (req, res) => {
  const { search } = req.query;
  try {
    let query = 'SELECT * FROM customers ORDER BY createdAt DESC';
    let params = [];

    if (search) {
      query = 'SELECT * FROM customers WHERE name LIKE ? OR businessName LIKE ? OR email LIKE ? OR mobile LIKE ? ORDER BY createdAt DESC';
      const searchParam = `%${search}%`;
      params = [searchParam, searchParam, searchParam, searchParam];
    }

    const customers = db.prepare(query).all(...params);
    res.json(customers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// GET single customer
router.get('/:id', (req, res) => {
  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// POST create customer
router.post('/', (req, res) => {
  const { name, mobile, email, businessName, gstNumber, type, address, status, followUpDate, notes } = req.body;
  try {
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO customers (id, name, mobile, email, businessName, gstNumber, type, address, status, followUpDate, notes, createdBy, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id, name, mobile, email, businessName, gstNumber,
      type || 'Lead', address, status || 'Active', followUpDate, notes,
      req.user.id, now, now
    );

    const newCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    res.status(201).json(newCustomer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// PUT update customer
router.put('/:id', (req, res) => {
  const { name, mobile, email, businessName, gstNumber, type, address, status, followUpDate, notes } = req.body;
  try {
    const now = new Date().toISOString();

    const result = db.prepare(
      `UPDATE customers
       SET name = ?, mobile = ?, email = ?, businessName = ?, gstNumber = ?,
           type = ?, address = ?, status = ?, followUpDate = ?, notes = ?, updatedAt = ?
       WHERE id = ?`
    ).run(
      name, mobile, email, businessName, gstNumber,
      type, address, status, followUpDate, notes, now,
      req.params.id
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const updatedCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    res.json(updatedCustomer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

module.exports = router;
