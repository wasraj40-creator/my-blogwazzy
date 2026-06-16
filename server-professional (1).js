const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database
const db = new sqlite3.Database(':memory:', (err) => {
  if (err) console.error(err);
  else console.log('Connected to SQLite database');
});

// Create posts table with SEO fields
db.run(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    category TEXT,
    seoDescription TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Sample posts
const samplePosts = [
  {
    title: 'The Future of Web Design in 2024',
    slug: 'future-web-design-2024',
    excerpt: 'Exploring emerging trends in web design, from AI-powered tools to sustainable practices.',
    content: `# The Future of Web Design

Web design continues to evolve at a rapid pace. In 2024, we're seeing several key trends emerge:

## AI-Powered Design Tools
Artificial intelligence is transforming how designers work, from automatic layout suggestions to intelligent color palettes.

## Accessibility First
Web accessibility is no longer an afterthought. Designing for inclusivity benefits all users and improves SEO.

## Sustainable Design
Eco-conscious design practices reduce carbon footprint and create a better user experience.

## Interactive Experiences
Beyond static pages, interactive elements and micro-animations are creating more engaging interfaces.

The designers who embrace these trends will stand out in an increasingly competitive market.`,
    category: 'design',
    seoDescription: 'Discover the top web design trends for 2024: AI tools, accessibility, sustainability, and interactive experiences.'
  },
  {
    title: 'Building Scalable Backend Systems',
    slug: 'scalable-backend-systems',
    excerpt: 'Best practices for architecting backend systems that grow with your application.',
    content: `# Building Scalable Backend Systems

As your application grows, your backend architecture becomes critical.

## Database Optimization
- Use indexes strategically
- Normalize your schema
- Consider caching layers

## API Design
- REST or GraphQL
- Versioning strategies
- Rate limiting

## Monitoring & Observability
Track performance with proper logging and monitoring tools.`,
    category: 'technology',
    seoDescription: 'Learn how to architect scalable backend systems with optimization, API design, and monitoring strategies.'
  },
];

db.serialize(() => {
  samplePosts.forEach(post => {
    db.run(
      `INSERT OR IGNORE INTO posts (title, slug, excerpt, content, category, seoDescription) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [post.title, post.slug, post.excerpt, post.content, post.category, post.seoDescription]
    );
  });
});

// Routes

app.get('/api/posts', (req, res) => {
  db.all(
    `SELECT id, title, slug, excerpt, category, seoDescription, createdAt FROM posts ORDER BY createdAt DESC`,
    (err, rows) => {
      if (err) res.status(500).json({ error: err.message });
      else res.json(rows);
    }
  );
});

app.get('/api/posts/:slug', (req, res) => {
  db.get(
    `SELECT * FROM posts WHERE slug = ?`,
    [req.params.slug],
    (err, row) => {
      if (err) res.status(500).json({ error: err.message });
      else if (!row) res.status(404).json({ error: 'Post not found' });
      else res.json(row);
    }
  );
});

app.post('/api/posts', (req, res) => {
  const { title, slug, excerpt, content, category, seoDescription } = req.body;
  if (!title || !slug || !content) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  db.run(
    `INSERT INTO posts (title, slug, excerpt, content, category, seoDescription) VALUES (?, ?, ?, ?, ?, ?)`,
    [title, slug, excerpt, content, category, seoDescription],
    function(err) {
      if (err) res.status(500).json({ error: err.message });
      else res.json({ id: this.lastID, title, slug, excerpt, content, category, seoDescription });
    }
  );
});

app.put('/api/posts/:id', (req, res) => {
  const { title, content, excerpt, category, seoDescription } = req.body;
  db.run(
    `UPDATE posts SET title = ?, content = ?, excerpt = ?, category = ?, seoDescription = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
    [title, content, excerpt, category, seoDescription, req.params.id],
    (err) => {
      if (err) res.status(500).json({ error: err.message });
      else res.json({ success: true });
    }
  );
});

app.delete('/api/posts/:id', (req, res) => {
  db.run(
    `DELETE FROM posts WHERE id = ?`,
    [req.params.id],
    (err) => {
      if (err) res.status(500).json({ error: err.message });
      else res.json({ success: true });
    }
  );
});

// Sitemap for SEO
app.get('/sitemap.xml', (req, res) => {
  db.all(`SELECT slug, updatedAt FROM posts`, (err, rows) => {
    if (err) {
      res.status(500).send('Error generating sitemap');
      return;
    }
    const baseUrl = 'https://yourdomain.com';
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    xml += `  <url><loc>${baseUrl}</loc><priority>1.0</priority></url>\n`;
    rows.forEach(row => {
      xml += `  <url><loc>${baseUrl}/blog/${row.slug}</loc><lastmod>${new Date(row.updatedAt).toISOString().split('T')[0]}</lastmod></url>\n`;
    });
    xml += '</urlset>';
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  });
});

app.listen(PORT, () => {
  console.log(`Professional blog backend running on http://localhost:${PORT}`);
  console.log(`Sitemap available at http://localhost:${PORT}/sitemap.xml`);
});
