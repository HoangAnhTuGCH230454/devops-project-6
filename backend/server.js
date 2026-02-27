const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'devops-secret-key-change-in-production';

app.use(helmet({
   contentSecurityPolicy: {
      directives: {
         defaultSrc: ["'self'"],
         connectSrc: ["'self'", "http://localhost:3000", "http://frontend:3000"],
      }
   }
}));
app.use(cors());
app.use(express.json());

const pool = new Pool({
   user: process.env.DB_USER || 'postgres',
   host: process.env.DB_HOST || 'localhost',
   database: process.env.DB_NAME || 'tododb',
    password: process.env.DB_PASSWORD || 'postgres',
   port: process.env.DB_PORT || 5432,
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
   const authHeader = req.headers['authorization'];
   const token = authHeader && authHeader.split(' ')[1];
   if (!token) return res.status(401).json({ error: 'Access token required' });
   try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
   } catch (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
   }
};

app.get('/', (req, res) => {
   res.json({ message: 'DevOps Todo API', version: '1.0.0' });
});

app.get('/health', (req, res) => {
   res.json({ status: 'healthy', version: '1.0.0' });
});

// AUTH ROUTES

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
   try {
      const { username, email, password } = req.body;
      if (!username || !email || !password) {
         return res.status(400).json({ error: 'Username, email, and password are required' });
      }
      if (password.length < 6) {
         return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      const existing = await pool.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
      if (existing.rowCount > 0) {
         return res.status(409).json({ error: 'Username or email already in use' });
      }
      const password_hash = await bcrypt.hash(password, 10);
      const result = await pool.query(
         'INSERT INTO users(username, email, password_hash) VALUES($1, $2, $3) RETURNING id, username, email',
         [username, email, password_hash]
      );
      const user = result.rows[0];
      const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      res.status(201).json({ user, token });
   } catch (err) {
      res.status(500).json({ error: err.message });
   }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
   try {
      const { email, password } = req.body;
      if (!email || !password) {
         return res.status(400).json({ error: 'Email and password are required' });
      }
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rowCount === 0) {
         return res.status(401).json({ error: 'Invalid credentials' });
      }
      const user = result.rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
         return res.status(401).json({ error: 'Invalid credentials' });
      }
      const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ user: { id: user.id, username: user.username, email: user.email }, token });
   } catch (err) {
      res.status(500).json({ error: err.message });
   }
});

// GET /api/auth/me
app.get('/api/auth/me', authenticateToken, async (req, res) => {
   res.json({ user: req.user });
});

// POST /api/auth/logout (client-side token removal, but we acknowledge it)
app.post('/api/auth/logout', authenticateToken, (req, res) => {
   res.json({ message: 'Logged out successfully' });
});

// TODOS ROUTES (protected)
app.get('/api/todos', authenticateToken, async (req, res) => {
   try {
        const result = await pool.query('SELECT * FROM todos WHERE user_id = $1 OR user_id IS NULL ORDER BY id', [req.user.id]);
      res.json(result.rows);
   } catch (err) {
      res.status(500).json({ error: err.message });
   }
});

app.post('/api/todos', authenticateToken, async (req, res) => {
   try {
      const { title, completed = false } = req.body;
      if (!title || typeof title !== 'string' || !title.trim()) {
            return res.status(400).json({ error: 'Title is required' });
      }
      const result = await pool.query(
            'INSERT INTO todos(title, completed, user_id) VALUES($1, $2, $3) RETURNING *',
            [title.trim(), completed, req.user.id]
      );
      res.status(201).json(result.rows[0]);
   } catch (err) {
      res.status(500).json({ error: err.message });
   }
});

app.delete('/api/todos/:id', authenticateToken, async (req, res) => {
   try {
      const { id } = req.params;
        const result = await pool.query('DELETE FROM todos WHERE id = $1 AND (user_id = $2 OR user_id IS NULL) RETURNING *', [id, req.user.id]);
      if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Todo not found' });
      }
      res.json({ message: 'Todo deleted successfully' });
   } catch (err) {
      res.status(500).json({ error: err.message });
   }
});

app.put('/api/todos/:id', authenticateToken, async (req, res) => {
   try {
      const { id } = req.params;
      const { title, completed } = req.body;
      const result = await pool.query(
            `UPDATE todos 
            SET title = COALESCE($1, title), 
            completed = COALESCE($2, completed) 
            WHERE id = $3 AND (user_id = $4 OR user_id IS NULL)
             RETURNING *`,
            [title, completed, id, req.user.id]
      );
      if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Todo not found' });
      }
      res.json(result.rows[0]);
   } catch (err) {
      res.status(500).json({ error: err.message });
   }
});

const port = process.env.PORT || 8080;

if (require.main === module) {
   app.listen(port, () => {
      console.log(`Backend running on port ${port}`);
   });
}

module.exports = app;