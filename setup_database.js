const sqlite3 = require('sqlite3').verbose();
const DB_PATH = './officers.db';

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

db.serialize(() => {
    console.log('Creating tables if they do not exist...');

    // Create Officers Table
    db.run(`CREATE TABLE IF NOT EXISTS officers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        job_title TEXT NOT NULL
    )`, (err) => {
        if (err) {
            console.error('Error creating officers table:', err.message);
        } else {
            console.log('"officers" table created or already exists.');
        }
    });

    // Create Feedback Table
    db.run(`CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        officer_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        interaction_type TEXT,
        feedback_text TEXT,
        is_anonymous INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (officer_id) REFERENCES officers (id)
    )`, (err) => {
        if (err) {
            console.error('Error creating feedback table:', err.message);
        } else {
            console.log('"feedback" table created or already exists.');
        }
    });
});

db.close((err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Closed the database connection.');
});
