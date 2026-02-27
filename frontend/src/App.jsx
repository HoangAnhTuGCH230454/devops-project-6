import { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const styles = {
  page: { minHeight: '100vh', background: '#f0f4f8', fontFamily: 'sans-serif' },
  navbar: {
    background: '#1a202c', color: '#fff', padding: '12px 24px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  navTitle: { margin: 0, fontSize: '20px', fontWeight: 'bold' },
  navUser: { fontSize: '14px', display: 'flex', alignItems: 'center', gap: '12px' },
  logoutBtn: {
    background: '#e53e3e', color: '#fff', border: 'none',
    padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px'
  },
  container: { maxWidth: '500px', margin: '60px auto', padding: '0 16px' },
  card: {
    background: '#fff', borderRadius: '12px', padding: '32px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  cardTitle: { margin: '0 0 24px', fontSize: '22px', textAlign: 'center', color: '#2d3748' },
  input: {
    width: '100%', padding: '10px 12px', marginBottom: '14px',
    border: '1px solid #e2e8f0', borderRadius: '8px',
    fontSize: '14px', boxSizing: 'border-box', outline: 'none'
  },
  btn: {
    width: '100%', padding: '11px', background: '#3182ce', color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '15px',
    cursor: 'pointer', fontWeight: 'bold', marginBottom: '12px'
  },
  switchText: { textAlign: 'center', fontSize: '13px', color: '#718096' },
  switchLink: { color: '#3182ce', cursor: 'pointer', fontWeight: 'bold' },
  rememberRow: {
    display: 'flex', alignItems: 'center', gap: '8px',
    marginBottom: '16px'
  },
  rememberLabel: { fontSize: '13px', color: '#4a5568', cursor: 'pointer', userSelect: 'none' },
  rememberHint: { fontSize: '11px', color: '#a0aec0', marginLeft: 'auto' },
  error: {
    background: '#fff5f5', border: '1px solid #fed7d7', color: '#c53030',
    padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px'
  },
  todoPage: { maxWidth: '600px', margin: '32px auto', padding: '0 16px' },
  todoCard: { background: '#fff', borderRadius: '12px', padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
  todoTitle: { margin: '0 0 20px', fontSize: '22px', color: '#2d3748' },
  addRow: { display: 'flex', gap: '8px', marginBottom: '20px' },
  addInput: {
    flex: 1, padding: '10px 12px', border: '1px solid #e2e8f0',
    borderRadius: '8px', fontSize: '14px', outline: 'none'
  },
  addBtn: {
    padding: '10px 18px', background: '#38a169', color: '#fff',
    border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold'
  },
  todoItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '8px',
    marginBottom: '8px',
  },
  todoLeft: { display: 'flex', alignItems: 'center', gap: '10px', flex: 1 },
  deleteBtn: {
    background: 'none', border: 'none', color: '#e53e3e',
    cursor: 'pointer', fontSize: '16px', padding: '2px 6px'
  },
};

// ─── Storage helpers ────────────────────────────────────────────────────────
// When "Remember Me" is checked  → localStorage  (survives browser close)
// When unchecked                 → sessionStorage (cleared when tab closes)

function saveSession(user, token, remember) {
  const store = remember ? localStorage : sessionStorage;
  store.setItem('token', token);
  store.setItem('user', JSON.stringify(user));
  store.setItem('rememberMe', remember ? '1' : '0');
}

function loadSession() {
  // Try localStorage first (remembered sessions), then sessionStorage
  for (const store of [localStorage, sessionStorage]) {
    try {
      const token = store.getItem('token');
      const user = JSON.parse(store.getItem('user'));
      if (token && user) return { user, token };
    } catch {}
  }
  return { user: null, token: '' };
}

function clearSession() {
  ['token', 'user', 'rememberMe'].forEach(k => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  });
}

// ─── Auth Form ──────────────────────────────────────────────────────────────
function AuthForm({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login'
        ? { email: form.email, password: form.password }
        : { username: form.username, email: form.email, password: form.password };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong'); return; }
      saveSession(data.user, data.token, rememberMe);
      onLogin(data.user, data.token);
    } catch (err) {
      setError('Network error. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter') submit(); };

  return (
    <div style={styles.page}>
      <nav style={styles.navbar}>
        <h1 style={styles.navTitle}>🚀 DevOps Todo App</h1>
      </nav>
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>{mode === 'login' ? '👋 Welcome back' : '✨ Create account'}</h2>
          {error && <div style={styles.error}>{error}</div>}
          {mode === 'register' && (
            <input style={styles.input} placeholder="Username" value={form.username}
              onChange={set('username')} onKeyDown={handleKey} />
          )}
          <input style={styles.input} placeholder="Email" type="email" value={form.email}
            onChange={set('email')} onKeyDown={handleKey} />
          <input style={styles.input} placeholder="Password" type="password" value={form.password}
            onChange={set('password')} onKeyDown={handleKey} />

          {/* ── Remember Me ── */}
          {mode === 'login' && (
            <div style={styles.rememberRow}>
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ cursor: 'pointer', width: '15px', height: '15px' }}
              />
              <label htmlFor="rememberMe" style={styles.rememberLabel}>Remember me</label>
              <span style={styles.rememberHint}>
                {rememberMe ? '✅ Stays logged in after browser close' : 'Session ends when tab closes'}
              </span>
            </div>
          )}

          <button style={styles.btn} onClick={submit} disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Register'}
          </button>
          <p style={styles.switchText}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <span style={styles.switchLink}
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
              {mode === 'login' ? 'Register' : 'Log In'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Todo App ───────────────────────────────────────────────────────────────
function TodoApp({ user, token, onLogout }) {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');

  const authFetch = (url, opts = {}) =>
    fetch(`${API_URL}${url}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts.headers },
    });

  const fetchTodos = async () => {
    try {
      const res = await authFetch('/api/todos');
      if (res.ok) setTodos(await res.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchTodos(); }, []);

  const addTodo = async () => {
    if (!newTodo.trim()) return;
    try {
      await authFetch('/api/todos', { method: 'POST', body: JSON.stringify({ title: newTodo }) });
      setNewTodo('');
      fetchTodos();
    } catch { alert('Failed to add todo'); }
  };

  const deleteTodo = async (id) => {
    await authFetch(`/api/todos/${id}`, { method: 'DELETE' });
    fetchTodos();
  };

  const toggleTodo = async (todo) => {
    await authFetch(`/api/todos/${todo.id}`, {
      method: 'PUT', body: JSON.stringify({ completed: !todo.completed })
    });
    fetchTodos();
  };

  const logout = async () => {
    try { await authFetch('/api/auth/logout', { method: 'POST' }); } catch {}
    onLogout();
  };

  return (
    <div style={styles.page}>
      <nav style={styles.navbar}>
        <h1 style={styles.navTitle}>🚀 DevOps Todo App</h1>
        <div style={styles.navUser}>
          <span>👤 {user.username}</span>
          <button style={styles.logoutBtn} onClick={logout}>Log Out</button>
        </div>
      </nav>
      <div style={styles.todoPage}>
        <div style={styles.todoCard}>
          <h2 style={styles.todoTitle}>My Todos</h2>
          <div style={styles.addRow}>
            <input style={styles.addInput} value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTodo()}
              placeholder="Add new todo..." />
            <button style={styles.addBtn} onClick={addTodo}>+ Add</button>
          </div>
          {todos.length === 0 && (
            <p style={{ textAlign: 'center', color: '#a0aec0' }}>No todos yet. Add one above!</p>
          )}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {todos.map(todo => (
              <li key={todo.id} style={{
                ...styles.todoItem,
                background: todo.completed ? '#f0fff4' : '#fff'
              }}>
                <div style={styles.todoLeft}>
                  <input type="checkbox" checked={todo.completed}
                    onChange={() => toggleTodo(todo)} style={{ cursor: 'pointer' }} />
                  <span style={{
                    textDecoration: todo.completed ? 'line-through' : 'none',
                    color: todo.completed ? '#a0aec0' : '#2d3748'
                  }}>{todo.title}</span>
                </div>
                <button style={styles.deleteBtn} onClick={() => deleteTodo(todo.id)}>🗑</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── Root App ───────────────────────────────────────────────────────────────
function App() {
  const [{ user, token }, setSession] = useState(() => loadSession());

  const handleLogin = (u, t) => setSession({ user: u, token: t });

  const handleLogout = () => {
    clearSession();
    setSession({ user: null, token: '' });
  };

  if (!user) return <AuthForm onLogin={handleLogin} />;
  return <TodoApp user={user} token={token} onLogout={handleLogout} />;
}

export default App;
