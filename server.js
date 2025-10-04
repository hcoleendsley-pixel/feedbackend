const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = 3000;
const dbPath = './officers.db';

app.use(cors());
app.use(express.json());

// Endpoint to test if the server is running
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!', timestamp: new Date() });
});

// Endpoint to get all officers with their average rating and feedback count
app.get('/api/officers', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const sql = `
    SELECT 
      o.*, 
      COALESCE(AVG(f.rating), 0) as average_rating,
      COUNT(f.id) as feedback_count
    FROM officers o
    LEFT JOIN feedback f ON o.id = f.officer_id
    GROUP BY o.id
    ORDER BY o.last_name, o.first_name;
  `;
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    console.log(`Returning ${rows.length} officers from database.`);
    res.json(rows);
  });
  db.close();
});

// Endpoint to get all feedback for a specific officer
app.get('/api/officers/:id/feedback', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    const sql = `SELECT rating, feedback_text, created_at FROM feedback WHERE officer_id = ? ORDER BY created_at DESC`;
    db.all(sql, [req.params.id], (err, rows) => {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        res.json(rows);
    });
    db.close();
});


// Endpoint to submit new feedback
app.post('/api/feedback', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  const { officer_id, rating, feedback_text, is_anonymous } = req.body;
  if (!officer_id || !rating) {
    return res.status(400).json({ error: 'Officer ID and rating are required.' });
  }
  const sql = `INSERT INTO feedback (officer_id, rating, feedback_text, is_anonymous) VALUES (?, ?, ?, ?)`;
  db.run(sql, [officer_id, rating, feedback_text, is_anonymous], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Feedback submitted successfully!', id: this.lastID });
  });
  db.close();
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Test it by visiting: http://localhost:3000/test`);
});

