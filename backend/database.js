const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'erp.db');

let sqlDb = null;

// Save database to disk
function saveDb() {
  if (sqlDb) {
    const data = sqlDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// Compatibility wrapper that mimics better-sqlite3 API
const db = {
  prepare(sql) {
    return {
      get(...params) {
        try {
          const stmt = sqlDb.prepare(sql);
          if (params.length > 0) stmt.bind(params);
          if (stmt.step()) {
            const colNames = stmt.getColumnNames();
            const values = stmt.get();
            const row = {};
            colNames.forEach((col, i) => { row[col] = values[i]; });
            stmt.free();
            return row;
          }
          stmt.free();
          return undefined;
        } catch (e) {
          console.error('DB get error:', sql, params, e.message);
          throw e;
        }
      },
      all(...params) {
        try {
          const results = [];
          const stmt = sqlDb.prepare(sql);
          if (params.length > 0) stmt.bind(params);
          while (stmt.step()) {
            const colNames = stmt.getColumnNames();
            const values = stmt.get();
            const row = {};
            colNames.forEach((col, i) => { row[col] = values[i]; });
            results.push(row);
          }
          stmt.free();
          return results;
        } catch (e) {
          console.error('DB all error:', sql, params, e.message);
          throw e;
        }
      },
      run(...params) {
        try {
          sqlDb.run(sql, params);
          saveDb();
          // Mimic better-sqlite3 result object
          const changesStmt = sqlDb.prepare('SELECT changes() as c');
          changesStmt.step();
          const changes = changesStmt.get()[0];
          changesStmt.free();
          return { changes };
        } catch (e) {
          console.error('DB run error:', sql, params, e.message);
          // Re-throw with code for constraint handling
          if (e.message && e.message.includes('UNIQUE constraint')) {
            e.code = 'SQLITE_CONSTRAINT_UNIQUE';
          }
          throw e;
        }
      }
    };
  },
  exec(sql) {
    sqlDb.exec(sql);
    saveDb();
  },
  pragma(str) {
    try {
      sqlDb.exec(`PRAGMA ${str}`);
    } catch (e) {
      // Ignore pragma errors for WAL mode (not supported in sql.js)
      console.log(`Pragma ${str} skipped (not supported in sql.js)`);
    }
  },
  transaction(fn) {
    return (...args) => {
      sqlDb.exec('BEGIN TRANSACTION');
      try {
        const result = fn(...args);
        sqlDb.exec('COMMIT');
        saveDb();
        return result;
      } catch (e) {
        sqlDb.exec('ROLLBACK');
        throw e;
      }
    };
  }
};

// Async initialization
async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    sqlDb = new SQL.Database(buffer);
    console.log('Loaded existing database from disk.');
  } else {
    sqlDb = new SQL.Database();
    console.log('Created new database.');
  }

  // Create tables
  sqlDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password TEXT,
      name TEXT,
      role TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT,
      mobile TEXT,
      email TEXT,
      businessName TEXT,
      gstNumber TEXT,
      type TEXT DEFAULT 'Lead',
      address TEXT,
      status TEXT DEFAULT 'Active',
      followUpDate TEXT,
      notes TEXT,
      createdBy TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT,
      sku TEXT UNIQUE,
      category TEXT,
      unitPrice REAL,
      currentStock INTEGER DEFAULT 0,
      minStockAlert INTEGER DEFAULT 10,
      location TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      productId TEXT,
      quantity INTEGER,
      type TEXT,
      reason TEXT,
      reference TEXT,
      createdBy TEXT,
      createdAt TEXT,
      FOREIGN KEY (productId) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS challans (
      id TEXT PRIMARY KEY,
      challanNumber TEXT UNIQUE,
      customerId TEXT,
      totalAmount REAL DEFAULT 0,
      totalQuantity INTEGER DEFAULT 0,
      status TEXT DEFAULT 'Draft',
      notes TEXT,
      createdBy TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      FOREIGN KEY (customerId) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS challan_items (
      id TEXT PRIMARY KEY,
      challanId TEXT,
      productId TEXT,
      productName TEXT,
      quantity INTEGER,
      unitPrice REAL,
      totalPrice REAL,
      FOREIGN KEY (challanId) REFERENCES challans(id),
      FOREIGN KEY (productId) REFERENCES products(id)
    );
  `);

  // Seed data
  seedDB();
  saveDb();

  console.log('Database initialized successfully.');
  return db;
}

// Seed function
function seedDB() {
  const stmt = sqlDb.prepare('SELECT COUNT(*) as count FROM users');
  stmt.step();
  const userCount = stmt.get()[0];
  stmt.free();

  if (userCount === 0) {
    console.log('Seeding database...');
    const now = new Date().toISOString();

    // Insert Users
    const adminId = uuidv4();
    sqlDb.run('INSERT INTO users (id, email, password, name, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [adminId, 'admin@erp.com', bcrypt.hashSync('admin123', 10), 'Admin User', 'Admin', now]);
    const salesId = uuidv4();
    sqlDb.run('INSERT INTO users (id, email, password, name, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [salesId, 'sales@erp.com', bcrypt.hashSync('sales123', 10), 'Sales Manager', 'Sales', now]);
    const warehouseId = uuidv4();
    sqlDb.run('INSERT INTO users (id, email, password, name, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [warehouseId, 'warehouse@erp.com', bcrypt.hashSync('warehouse123', 10), 'Warehouse Staff', 'Warehouse', now]);

    // Insert Customers
    const c1Id = uuidv4();
    sqlDb.run(`INSERT INTO customers (id, name, mobile, email, businessName, gstNumber, type, address, status, followUpDate, notes, createdBy, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c1Id, 'Rahul Sharma', '9876543210', 'rahul@techcorp.in', 'TechCorp Solutions', '27AAPCU8943L1Z1', 'Customer', 'Mumbai, MH', 'Active', null, 'VIP Client', adminId, now, now]);

    const c2Id = uuidv4();
    sqlDb.run(`INSERT INTO customers (id, name, mobile, email, businessName, gstNumber, type, address, status, followUpDate, notes, createdBy, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c2Id, 'Anita Desai', '9876543211', 'anita@innovative.in', 'Innovative Minds', '29BBDCU1234L1Z2', 'Customer', 'Bangalore, KA', 'Active', null, '', salesId, now, now]);

    const c3Id = uuidv4();
    sqlDb.run(`INSERT INTO customers (id, name, mobile, email, businessName, gstNumber, type, address, status, followUpDate, notes, createdBy, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c3Id, 'Vikram Singh', '9876543212', 'vikram@builder.in', 'Singh Builders', '07CCDCU5678L1Z3', 'Lead', 'Delhi, DL', 'Active', new Date(Date.now() + 86400000).toISOString(), 'Interested in bulk orders', salesId, now, now]);

    const c4Id = uuidv4();
    sqlDb.run(`INSERT INTO customers (id, name, mobile, email, businessName, gstNumber, type, address, status, followUpDate, notes, createdBy, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c4Id, 'Priya Patel', '9876543213', 'priya@retail.in', 'Patel Retail', '24DDECU9012L1Z4', 'Customer', 'Ahmedabad, GJ', 'Inactive', null, '', adminId, now, now]);

    const c5Id = uuidv4();
    sqlDb.run(`INSERT INTO customers (id, name, mobile, email, businessName, gstNumber, type, address, status, followUpDate, notes, createdBy, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c5Id, 'Amit Kumar', '9876543214', 'amit@global.in', 'Global Traders', '33EEECU3456L1Z5', 'Lead', 'Chennai, TN', 'Active', new Date(Date.now() + 172800000).toISOString(), 'Call next week', salesId, now, now]);

    // Insert Products
    const p1Id = uuidv4();
    sqlDb.run('INSERT INTO products (id, name, sku, category, unitPrice, currentStock, minStockAlert, location, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [p1Id, 'Ergonomic Office Chair', 'FURN-001', 'Furniture', 4500.00, 50, 10, 'Aisle 1', now, now]);
    const p2Id = uuidv4();
    sqlDb.run('INSERT INTO products (id, name, sku, category, unitPrice, currentStock, minStockAlert, location, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [p2Id, 'Standing Desk', 'FURN-002', 'Furniture', 12000.00, 20, 5, 'Aisle 1', now, now]);
    const p3Id = uuidv4();
    sqlDb.run('INSERT INTO products (id, name, sku, category, unitPrice, currentStock, minStockAlert, location, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [p3Id, 'A4 Printer Paper Box', 'OFF-001', 'Office Supplies', 1500.00, 100, 20, 'Aisle 2', now, now]);
    const p4Id = uuidv4();
    sqlDb.run('INSERT INTO products (id, name, sku, category, unitPrice, currentStock, minStockAlert, location, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [p4Id, 'Whiteboard Markers (12pk)', 'OFF-002', 'Office Supplies', 350.00, 200, 50, 'Aisle 2', now, now]);
    const p5Id = uuidv4();
    sqlDb.run('INSERT INTO products (id, name, sku, category, unitPrice, currentStock, minStockAlert, location, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [p5Id, 'Dell 24" Monitor', 'ELEC-001', 'Electronics', 8500.00, 30, 10, 'Aisle 3', now, now]);
    const p6Id = uuidv4();
    sqlDb.run('INSERT INTO products (id, name, sku, category, unitPrice, currentStock, minStockAlert, location, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [p6Id, 'Logitech Wireless Mouse', 'ELEC-002', 'Electronics', 800.00, 150, 30, 'Aisle 3', now, now]);
    const p7Id = uuidv4();
    sqlDb.run('INSERT INTO products (id, name, sku, category, unitPrice, currentStock, minStockAlert, location, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [p7Id, 'Industrial Extension Cord', 'ELEC-003', 'Electronics', 1200.00, 40, 15, 'Aisle 4', now, now]);
    const p8Id = uuidv4();
    sqlDb.run('INSERT INTO products (id, name, sku, category, unitPrice, currentStock, minStockAlert, location, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [p8Id, 'Storage Cabinet', 'FURN-003', 'Furniture', 6500.00, 15, 5, 'Aisle 5', now, now]);

    // Initial Stock Movements (IN)
    const products = [
      { id: p1Id, stock: 50 }, { id: p2Id, stock: 20 }, { id: p3Id, stock: 100 }, { id: p4Id, stock: 200 },
      { id: p5Id, stock: 30 }, { id: p6Id, stock: 150 }, { id: p7Id, stock: 40 }, { id: p8Id, stock: 15 }
    ];
    for (const p of products) {
      sqlDb.run('INSERT INTO stock_movements (id, productId, quantity, type, reason, reference, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [uuidv4(), p.id, p.stock, 'IN', 'Initial Stock', 'SYSTEM', adminId, now]);
    }

    // Insert Challans
    // Challan 1: Confirmed
    const ch1Id = uuidv4();
    sqlDb.run('INSERT INTO challans (id, challanNumber, customerId, totalAmount, totalQuantity, status, notes, createdBy, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [ch1Id, 'CH-0001', c1Id, 25500.00, 4, 'Confirmed', 'Urgent delivery', salesId, now, now]);
    sqlDb.run('INSERT INTO challan_items (id, challanId, productId, productName, quantity, unitPrice, totalPrice) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), ch1Id, p1Id, 'Ergonomic Office Chair', 2, 4500.00, 9000.00]);
    sqlDb.run('INSERT INTO challan_items (id, challanId, productId, productName, quantity, unitPrice, totalPrice) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), ch1Id, p2Id, 'Standing Desk', 1, 12000.00, 12000.00]);
    sqlDb.run('INSERT INTO challan_items (id, challanId, productId, productName, quantity, unitPrice, totalPrice) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), ch1Id, p3Id, 'A4 Printer Paper Box', 3, 1500.00, 4500.00]);

    // Deduct stock for confirmed challan
    sqlDb.run('UPDATE products SET currentStock = currentStock - 2 WHERE id = ?', [p1Id]);
    sqlDb.run('UPDATE products SET currentStock = currentStock - 1 WHERE id = ?', [p2Id]);
    sqlDb.run('UPDATE products SET currentStock = currentStock - 3 WHERE id = ?', [p3Id]);

    // Stock movements for CH-0001
    sqlDb.run('INSERT INTO stock_movements (id, productId, quantity, type, reason, reference, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), p1Id, 2, 'OUT', 'Challan Sale', 'CH-0001', salesId, now]);
    sqlDb.run('INSERT INTO stock_movements (id, productId, quantity, type, reason, reference, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), p2Id, 1, 'OUT', 'Challan Sale', 'CH-0001', salesId, now]);
    sqlDb.run('INSERT INTO stock_movements (id, productId, quantity, type, reason, reference, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), p3Id, 3, 'OUT', 'Challan Sale', 'CH-0001', salesId, now]);

    // Challan 2: Draft
    const ch2Id = uuidv4();
    sqlDb.run('INSERT INTO challans (id, challanNumber, customerId, totalAmount, totalQuantity, status, notes, createdBy, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [ch2Id, 'CH-0002', c2Id, 17000.00, 2, 'Draft', 'Pending confirmation', salesId, now, now]);
    sqlDb.run('INSERT INTO challan_items (id, challanId, productId, productName, quantity, unitPrice, totalPrice) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), ch2Id, p5Id, 'Dell 24" Monitor', 2, 8500.00, 17000.00]);

    // Challan 3: Cancelled
    const ch3Id = uuidv4();
    sqlDb.run('INSERT INTO challans (id, challanNumber, customerId, totalAmount, totalQuantity, status, notes, createdBy, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [ch3Id, 'CH-0003', c4Id, 6500.00, 1, 'Cancelled', 'Customer cancelled', salesId, now, now]);
    sqlDb.run('INSERT INTO challan_items (id, challanId, productId, productName, quantity, unitPrice, totalPrice) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), ch3Id, p8Id, 'Storage Cabinet', 1, 6500.00, 6500.00]);

    console.log('Database seeded successfully.');
  }
}

module.exports = db;
module.exports.initDatabase = initDatabase;
