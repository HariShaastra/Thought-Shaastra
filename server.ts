import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "thought-shaastra-secret-key-123";

const db = new Database("thoughts.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS thoughts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    text TEXT NOT NULL,
    expression TEXT,
    meaning TEXT,
    clarity TEXT,
    is_insight INTEGER DEFAULT 0,
    reasoning TEXT,
    insight TEXT,
    category_id INTEGER,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    parent_id INTEGER,
    unlock_at DATETIME,
    is_private INTEGER DEFAULT 1,
    type TEXT DEFAULT 'text',
    audio_data TEXT,
    attachments TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (parent_id) REFERENCES thoughts(id)
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    text TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    audio_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS reflections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    thought_id INTEGER,
    text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (thought_id) REFERENCES thoughts(id)
  );

  CREATE TABLE IF NOT EXISTS connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    thought_a_id INTEGER NOT NULL,
    thought_b_id INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (thought_a_id) REFERENCES thoughts(id),
    FOREIGN KEY (thought_b_id) REFERENCES thoughts(id)
  );

  CREATE TABLE IF NOT EXISTS purpose (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    text TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    audio_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    category_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_private INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS document_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    title TEXT,
    content TEXT,
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS document_thoughts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    thought_id INTEGER NOT NULL,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (thought_id) REFERENCES thoughts(id) ON DELETE CASCADE
  );

  -- Insert default categories if they don't exist
  INSERT OR IGNORE INTO categories (name, is_default) VALUES 
    ('Philosophy', 1),
    ('Life', 1),
    ('Ideas', 1),
    ('Creativity', 1),
    ('Observations', 1),
    ('Questions', 1),
    ('Learning', 1);
`);

// Migration to add missing columns if they don't exist (for existing DBs)
try { db.exec("ALTER TABLE thoughts ADD COLUMN reasoning TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE thoughts ADD COLUMN insight TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE thoughts ADD COLUMN expression TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE thoughts ADD COLUMN meaning TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE thoughts ADD COLUMN clarity TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE thoughts ADD COLUMN is_insight INTEGER DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE questions ADD COLUMN type TEXT DEFAULT 'text'"); } catch (e) {}
try { db.exec("ALTER TABLE questions ADD COLUMN audio_data TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE purpose ADD COLUMN type TEXT DEFAULT 'text'"); } catch (e) {}
try { db.exec("ALTER TABLE purpose ADD COLUMN audio_data TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE thoughts ADD COLUMN user_id INTEGER"); } catch (e) {}
try { db.exec("ALTER TABLE thoughts ADD COLUMN attachments TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE categories ADD COLUMN user_id INTEGER"); } catch (e) {}
try { db.exec("ALTER TABLE questions ADD COLUMN user_id INTEGER"); } catch (e) {}
try { db.exec("ALTER TABLE reflections ADD COLUMN user_id INTEGER"); } catch (e) {}
try { db.exec("ALTER TABLE connections ADD COLUMN user_id INTEGER"); } catch (e) {}
try { db.exec("ALTER TABLE purpose ADD COLUMN user_id INTEGER"); } catch (e) {}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(cookieParser());

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
      next();
    } catch (e) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  const getUserId = (req: any) => {
    const token = req.cookies.token;
    if (token) {
      try { return (jwt.verify(token, JWT_SECRET) as any).id; } catch (e) {}
    }
    return null;
  };

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, name } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const info = db.prepare("INSERT INTO users (email, password, name) VALUES (?, ?, ?)").run(email, hashedPassword, name);
      const token = jwt.sign({ id: info.lastInsertRowid, email }, JWT_SECRET);
      res.cookie("token", token, { httpOnly: true, secure: true, sameSite: 'none' });
      res.json({ id: info.lastInsertRowid, email, name });
    } catch (e) {
      res.status(400).json({ error: "User already exists" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: 'none' });
    res.json({ id: user.id, email: user.email, name: user.name });
  });

  app.get("/api/auth/me", authenticate, (req: any, res) => {
    const user = db.prepare("SELECT id, email, name FROM users WHERE id = ?").get(req.user.id);
    res.json(user || null);
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ success: true });
  });

  app.delete("/api/auth/account", authenticate, (req: any, res) => {
    const userId = req.user.id;
    db.transaction(() => {
      db.prepare("DELETE FROM connections WHERE user_id = ?").run(userId);
      db.prepare("DELETE FROM reflections WHERE user_id = ?").run(userId);
      db.prepare("DELETE FROM thoughts WHERE user_id = ?").run(userId);
      db.prepare("DELETE FROM questions WHERE user_id = ?").run(userId);
      db.prepare("DELETE FROM purpose WHERE user_id = ?").run(userId);
      db.prepare("DELETE FROM categories WHERE user_id = ?").run(userId);
      db.prepare("DELETE FROM documents WHERE user_id = ?").run(userId);
      db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    })();
    res.clearCookie("token");
    res.json({ success: true });
  });

  // Sync Route
  app.post("/api/sync", authenticate, (req: any, res) => {
    const { thoughts, questions, purpose, categories } = req.body;
    const userId = req.user.id;

    db.transaction(() => {
      if (categories) {
        for (const cat of categories) {
          db.prepare("INSERT OR IGNORE INTO categories (user_id, name) VALUES (?, ?)").run(userId, cat.name);
        }
      }
      if (thoughts) {
        for (const t of thoughts) {
          db.prepare(`
            INSERT INTO thoughts (user_id, title, text, expression, meaning, clarity, is_insight, reasoning, insight, tags, created_at, unlock_at, is_private, type, audio_data, attachments)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(userId, t.title, t.text, t.expression, t.meaning, t.clarity, t.is_insight ? 1 : 0, t.reasoning, t.insight, t.tags, t.created_at, t.unlock_at, t.is_private ? 1 : 0, t.type, t.audio_data, t.attachments);
        }
      }
      if (questions) {
        for (const q of questions) {
          db.prepare("INSERT INTO questions (user_id, text, type, audio_data, created_at) VALUES (?, ?, ?, ?, ?)").run(userId, q.text, q.type, q.audio_data, q.created_at);
        }
      }
      if (purpose) {
        for (const p of purpose) {
          db.prepare("INSERT INTO purpose (user_id, text, type, audio_data, created_at) VALUES (?, ?, ?, ?, ?)").run(userId, p.text, p.type, p.audio_data, p.created_at);
        }
      }
    })();

    res.json({ success: true });
  });

  // Thoughts
  app.get("/api/thoughts", (req: any, res) => {
    const userId = getUserId(req);
    const thoughts = db.prepare(`
      SELECT t.*, c.name as category_name 
      FROM thoughts t 
      LEFT JOIN categories c ON t.category_id = c.id 
      WHERE (t.user_id IS ? OR t.user_id IS NULL)
      AND (t.unlock_at IS NULL OR t.unlock_at <= CURRENT_TIMESTAMP)
      ORDER BY t.created_at DESC
    `).all(userId);
    res.json(thoughts);
  });

  app.post("/api/thoughts", (req: any, res) => {
    const userId = getUserId(req);
    const { title, text, expression, meaning, clarity, is_insight, reasoning, insight, category_id, tags, parent_id, unlock_at, is_private, type, audio_data, attachments } = req.body;
    const info = db.prepare(`
      INSERT INTO thoughts (user_id, title, text, expression, meaning, clarity, is_insight, reasoning, insight, category_id, tags, parent_id, unlock_at, is_private, type, audio_data, attachments)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, title, text, expression, meaning, clarity, is_insight ? 1 : 0, reasoning, insight, category_id, tags, parent_id, unlock_at, is_private ? 1 : 0, type || 'text', audio_data, attachments);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/thoughts/:id", (req: any, res) => {
    const { title, text, expression, meaning, clarity, is_insight, reasoning, insight, category_id, tags, is_private, type, audio_data, attachments } = req.body;
    db.prepare(`
      UPDATE thoughts 
      SET title = ?, text = ?, expression = ?, meaning = ?, clarity = ?, is_insight = ?, reasoning = ?, insight = ?, category_id = ?, tags = ?, is_private = ?, type = ?, audio_data = ?, attachments = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(title, text, expression, meaning, clarity, is_insight ? 1 : 0, reasoning, insight, category_id, tags, is_private ? 1 : 0, type, audio_data, attachments, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/time-capsules", (req: any, res) => {
    const userId = getUserId(req);
    const capsules = db.prepare(`
      SELECT t.*, c.name as category_name 
      FROM thoughts t 
      LEFT JOIN categories c ON t.category_id = c.id 
      WHERE (t.user_id IS ? OR t.user_id IS NULL) AND t.unlock_at IS NOT NULL
      ORDER BY t.unlock_at ASC
    `).all(userId);
    res.json(capsules);
  });

  // Categories
  app.get("/api/categories", (req: any, res) => {
    const userId = getUserId(req);
    const categories = db.prepare("SELECT * FROM categories WHERE user_id IS ? OR is_default = 1").all(userId);
    res.json(categories);
  });

  app.post("/api/categories", (req: any, res) => {
    const userId = getUserId(req);
    const { name } = req.body;
    try {
      const info = db.prepare("INSERT INTO categories (user_id, name) VALUES (?, ?)").run(userId, name);
      res.json({ id: info.lastInsertRowid });
    } catch (e) {
      res.status(400).json({ error: "Category already exists" });
    }
  });

  // Questions
  app.get("/api/questions", (req: any, res) => {
    const userId = getUserId(req);
    const questions = db.prepare("SELECT * FROM questions WHERE user_id IS ? OR user_id IS NULL ORDER BY created_at DESC").all(userId);
    res.json(questions);
  });

  app.post("/api/questions", (req: any, res) => {
    const userId = getUserId(req);
    const { text, type, audio_data } = req.body;
    const info = db.prepare("INSERT INTO questions (user_id, text, type, audio_data) VALUES (?, ?, ?, ?)").run(userId, text, type || 'text', audio_data);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/questions/:id", (req, res) => {
    const { text } = req.body;
    db.prepare("UPDATE questions SET text = ? WHERE id = ?").run(text, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/questions/:id", (req, res) => {
    db.prepare("DELETE FROM questions WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Purpose (Principles)
  app.get("/api/purpose", (req: any, res) => {
    const userId = getUserId(req);
    const purpose = db.prepare("SELECT * FROM purpose WHERE user_id IS ? OR user_id IS NULL ORDER BY created_at DESC").all(userId);
    res.json(purpose);
  });

  app.post("/api/purpose", (req: any, res) => {
    const userId = getUserId(req);
    const { text, type, audio_data } = req.body;
    const info = db.prepare("INSERT INTO purpose (user_id, text, type, audio_data) VALUES (?, ?, ?, ?)").run(userId, text, type || 'text', audio_data);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/purpose/:id", (req, res) => {
    const { text } = req.body;
    db.prepare("UPDATE purpose SET text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(text, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/purpose/:id", (req, res) => {
    db.prepare("DELETE FROM purpose WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Connections
  app.get("/api/connections", (req: any, res) => {
    const userId = getUserId(req);
    const connections = db.prepare("SELECT * FROM connections WHERE user_id IS ? OR user_id IS NULL").all(userId);
    res.json(connections);
  });

  app.post("/api/connections", (req: any, res) => {
    const userId = getUserId(req);
    const { thought_a_id, thought_b_id } = req.body;
    db.prepare("INSERT INTO connections (user_id, thought_a_id, thought_b_id) VALUES (?, ?, ?)").run(userId, thought_a_id, thought_b_id);
    res.json({ success: true });
  });

  // Reflections
  app.post("/api/reflections", (req: any, res) => {
    const userId = getUserId(req);
    const { thought_id, text } = req.body;
    const info = db.prepare("INSERT INTO reflections (user_id, thought_id, text) VALUES (?, ?, ?)").run(userId, thought_id, text);
    res.json({ id: info.lastInsertRowid });
  });

  // Stats for Graph
  app.get("/api/stats", (req: any, res) => {
    const userId = getUserId(req);
    const stats = db.prepare(`
      SELECT c.name, COUNT(t.id) as count
      FROM categories c
      LEFT JOIN thoughts t ON c.id = t.category_id AND (t.user_id = ? OR (t.user_id IS NULL AND ? IS NULL))
      WHERE c.is_default = 1 OR c.user_id = ?
      GROUP BY c.id
    `).all(userId, userId, userId);
    res.json(stats);
  });

  // Documents
  app.get("/api/documents", (req: any, res) => {
    const userId = getUserId(req);
    const docs = db.prepare(`
      SELECT d.*, c.name as category_name 
      FROM documents d
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE d.user_id IS ? OR d.user_id IS NULL
      ORDER BY d.updated_at DESC
    `).all(userId);
    res.json(docs);
  });

  app.get("/api/documents/:id", (req: any, res) => {
    const userId = getUserId(req);
    const doc = db.prepare(`
      SELECT d.*, c.name as category_name 
      FROM documents d
      LEFT JOIN categories c ON d.category_id = c.id
      WHERE d.id = ? AND (d.user_id IS ? OR d.user_id IS NULL)
    `).get(req.params.id, userId) as any;
    
    if (!doc) return res.status(404).json({ error: "Document not found" });
    
    const sections = db.prepare("SELECT * FROM document_sections WHERE document_id = ? ORDER BY order_index ASC").all(doc.id);
    const linkedThoughts = db.prepare(`
      SELECT t.*, c.name as category_name
      FROM thoughts t
      JOIN document_thoughts dt ON t.id = dt.thought_id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE dt.document_id = ?
    `).all(doc.id);
    
    res.json({ ...doc, sections, linkedThoughts });
  });

  app.post("/api/documents", (req: any, res) => {
    const userId = getUserId(req);
    const { title, description, category_id, is_private, sections } = req.body;
    const info = db.prepare(`
      INSERT INTO documents (user_id, title, description, category_id, is_private)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, title, description, category_id, is_private ? 1 : 0);
    
    const docId = info.lastInsertRowid;

    // Create initial sections
    if (sections && Array.isArray(sections) && sections.length > 0) {
      const stmt = db.prepare("INSERT INTO document_sections (document_id, title, content, order_index) VALUES (?, ?, ?, ?)");
      sections.forEach((s: any, idx: number) => {
        stmt.run(docId, s.title || "", s.content || "", idx);
      });
    } else {
      db.prepare("INSERT INTO document_sections (document_id, title, content, order_index) VALUES (?, ?, ?, ?)").run(docId, "Introduction", "", 0);
    }
    
    res.json({ id: docId });
  });

  app.put("/api/documents/:id", (req: any, res) => {
    const userId = getUserId(req);
    const { title, description, category_id, is_private } = req.body;
    db.prepare(`
      UPDATE documents 
      SET title = ?, description = ?, category_id = ?, is_private = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND (user_id IS ? OR user_id IS NULL)
    `).run(title, description, category_id, is_private ? 1 : 0, req.params.id, userId);
    res.json({ success: true });
  });

  app.delete("/api/documents/:id", (req: any, res) => {
    const userId = getUserId(req);
    db.prepare("DELETE FROM documents WHERE id = ? AND (user_id IS ? OR user_id IS NULL)").run(req.params.id, userId);
    res.json({ success: true });
  });

  // Document Sections
  app.post("/api/documents/:id/sections", (req: any, res) => {
    const { title, content, order_index } = req.body;
    const info = db.prepare(`
      INSERT INTO document_sections (document_id, title, content, order_index)
      VALUES (?, ?, ?, ?)
    `).run(req.params.id, title, content, order_index || 0);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/sections/:id", (req: any, res) => {
    const { title, content, order_index } = req.body;
    db.prepare(`
      UPDATE document_sections 
      SET title = ?, content = ?, order_index = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(title, content, order_index, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/sections/:id", (req: any, res) => {
    db.prepare("DELETE FROM document_sections WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Link Thoughts to Documents
  app.post("/api/documents/:docId/link/:thoughtId", (req: any, res) => {
    db.prepare("INSERT OR IGNORE INTO document_thoughts (document_id, thought_id) VALUES (?, ?)").run(req.params.docId, req.params.thoughtId);
    res.json({ success: true });
  });

  app.delete("/api/documents/:docId/link/:thoughtId", (req: any, res) => {
    db.prepare("DELETE FROM document_thoughts WHERE document_id = ? AND thought_id = ?").run(req.params.docId, req.params.thoughtId);
    res.json({ success: true });
  });

  app.get("/api/insights/activity", (req: any, res) => {
    const userId = getUserId(req);
    const activity = db.prepare(`
      SELECT date(created_at) as date, COUNT(*) as count
      FROM thoughts
      WHERE user_id = ? OR (user_id IS NULL AND ? IS NULL)
      GROUP BY date(created_at)
      ORDER BY date ASC
      LIMIT 30
    `).all(userId, userId);
    res.json(activity);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
