const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/stats', (req, res) => {
  try {
    const totalCustomers = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    const totalChallans = db.prepare('SELECT COUNT(*) as count FROM challans').get().count;
    const confirmedChallans = db.prepare("SELECT COUNT(*) as count FROM challans WHERE status = 'Confirmed'").get().count;
    const lowStockProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE currentStock <= minStockAlert').get().count;

    const recentChallans = db.prepare(
      `SELECT c.*, cust.name as customerName
       FROM challans c
       JOIN customers cust ON c.customerId = cust.id
       ORDER BY c.createdAt DESC LIMIT 5`
    ).all();

    const recentCustomers = db.prepare('SELECT * FROM customers ORDER BY createdAt DESC LIMIT 5').all();

    const revenueResult = db.prepare("SELECT SUM(totalAmount) as total FROM challans WHERE status = 'Confirmed'").get();
    const totalRevenue = revenueResult.total || 0;

    res.json({
      totalCustomers,
      totalProducts,
      totalChallans,
      confirmedChallans,
      lowStockProducts,
      totalRevenue,
      recentChallans,
      recentCustomers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

module.exports = router;
