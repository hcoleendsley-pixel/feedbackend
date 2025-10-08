    const express = require('express');
    const cors = require('cors');
    const { Pool } = require('pg'); // Replaced sqlite3 with pg
    
    const app = express();
    app.use(cors());
    app.use(express.json());
    
    // Create a new Pool object to connect to the PostgreSQL database
    // It will automatically use the DATABASE_URL from Render's environment variables
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Required for Render's database connections
      }
    });
    
    // Test route
    app.get('/test', (req, res) => {
        res.json({ message: 'Server is live and running!', time: new Date() });
    });
    
    // API endpoint to get all officers with their feedback stats
    app.get('/api/officers', async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT 
                    o.*, 
                    COALESCE(f.feedback_count, 0) as feedback_count, 
                    COALESCE(f.average_rating, 0) as average_rating
                FROM officers o
                LEFT JOIN (
                    SELECT 
                        officer_id, 
                        COUNT(*) as feedback_count, 
                        AVG(rating) as average_rating 
                    FROM feedback 
                    GROUP BY officer_id
                ) f ON o.id = f.officer_id
                ORDER BY o.last_name, o.first_name;
            `);
            res.json(result.rows);
        } catch (err) {
            console.error('Error fetching officers:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    app.get('/api/officers-with-ratings', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                o.id,
                o.first_name,
                o.last_name,
                o.job_title,
                COALESCE(AVG(f.rating), 0) as avg_rating,
                COUNT(f.id) as feedback_count
            FROM officers o
            LEFT JOIN feedback f ON o.id = f.officer_id
            GROUP BY o.id, o.first_name, o.last_name, o.job_title
            ORDER BY o.last_name, o.first_name;
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching officers with ratings:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});    

    // API endpoint to get all feedback for a specific officer
    app.get('/api/officers/:id/feedback', async (req, res) => {
        try {
            const { id } = req.params;
            const result = await pool.query('SELECT * FROM feedback WHERE officer_id = $1 ORDER BY created_at DESC', [id]);
            res.json(result.rows);
        } catch (err) {
            console.error(`Error fetching feedback for officer ${req.params.id}:`, err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    
    // API endpoint to submit new feedback
    app.post('/api/feedback', async (req, res) => {
        const { officer_id, rating, feedback_text, is_anonymous } = req.body;
    
        if (!officer_id || !rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Officer ID and a valid rating (1-5) are required.' });
        }
    
        try {
            const result = await pool.query(
                'INSERT INTO feedback (officer_id, rating, feedback_text, is_anonymous) VALUES ($1, $2, $3, $4) RETURNING *',
                [officer_id, rating, feedback_text || '', is_anonymous]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error('Error submitting feedback:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    
    
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server is listening on port ${PORT}`);
    });
    // Add this route for admin view (around line 68)
app.get('/api/admin/all-feedback', async (req, res) => {
    try {
        // Get overall stats
        const statsResult = await pool.query(`
            SELECT 
                COUNT(*) as total_feedback,
                COALESCE(AVG(rating), 0) as overall_average_rating
            FROM feedback
        `);

        // Get all officers with their feedback
        const officersResult = await pool.query(`
            SELECT 
                o.id,
                o.first_name,
                o.last_name,
                o.job_title,
                COALESCE(AVG(f.rating), 0) as avg_rating,
                COUNT(f.id) as feedback_count
            FROM officers o
            LEFT JOIN feedback f ON o.id = f.officer_id
            GROUP BY o.id
            ORDER BY o.last_name, o.first_name
        `);

        // Get feedback for each officer
        const feedbackResult = await pool.query(`
            SELECT 
                f.id,
                f.officer_id,
                f.rating,
                f.feedback_text,
                f.created_at
            FROM feedback f
            ORDER BY f.created_at DESC
        `);

        // Organize feedback by officer
        const officers = officersResult.rows.map(officer => ({
            ...officer,
            feedback: feedbackResult.rows.filter(f => f.officer_id === officer.id)
        }));

        res.json({
            total_feedback: parseInt(statsResult.rows[0].total_feedback),
            overall_average_rating: parseFloat(statsResult.rows[0].overall_average_rating),
            officers: officers
        });
    } catch (err) {
        console.error('Error fetching admin data:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
    

