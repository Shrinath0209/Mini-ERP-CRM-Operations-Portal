const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Initialize database first, then start server
const { initDatabase } = require('./database');

initDatabase().then(() => {
  // Routes (loaded after DB is ready)
  const authRoutes = require('./routes/auth');
  const customerRoutes = require('./routes/customers');
  const productRoutes = require('./routes/products');
  const stockMovementRoutes = require('./routes/stockMovements');
  const challanRoutes = require('./routes/challans');
  const dashboardRoutes = require('./routes/dashboard');

  app.use('/api/auth', authRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/stock-movements', stockMovementRoutes);
  app.use('/api/challans', challanRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running successfully on port ${PORT}`);
    console.log(`Local API: http://localhost:${PORT}/api`);
    console.log(`Live API URL: https://onrender.com`);
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
