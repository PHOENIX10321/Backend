// backend/routes/examRoutes.js
const express = require('express');
const pool = require('../config/db'); // Database connection pool
const { protect, admin } = require('../middleware/authMiddleware'); // Auth middleware

const router = express.Router();

// POST /api/exams - Create a new exam (Admin only)
router.post('/', protect, admin, async (req, res) => {
    // ... (existing create exam logic - no changes)
    const { title, description, duration_minutes, passing_score } = req.body;
    const created_by_user_id = req.user.id;
    if (!title || duration_minutes === undefined || passing_score === undefined) {
        return res.status(400).json({ message: 'Please provide title, duration (minutes), and passing score.' });
    }
    const duration = parseInt(duration_minutes, 10);
    const score = parseFloat(passing_score);
    if (isNaN(duration) || duration <= 0 || isNaN(score) || score < 0 || score > 100) {
        return res.status(400).json({ message: 'Duration must be a positive number. Passing score must be a number between 0 and 100.' });
    }
    try {
        const [result] = await pool.query(
            'INSERT INTO Exams (title, description, duration_minutes, passing_score, created_by_user_id) VALUES (?, ?, ?, ?, ?)',
            [title, description || null, duration, score, created_by_user_id]
        );
        res.status(201).json({
            message: 'Exam created successfully!',
            examId: result.insertId,
            title,
            description: description || null,
            duration_minutes: duration,
            passing_score: score,
            created_by_user_id
        });
    } catch (error) {
        console.error('Error creating exam:', error);
        res.status(500).json({ message: 'Server error while creating exam.' });
    }
});

// GET /api/exams - Get all exams (Protected - any logged-in user)
router.get('/', protect, async (req, res) => {
    // ... (existing get all exams logic - no changes)
    try {
        const [exams] = await pool.query('SELECT id, title, description, duration_minutes, passing_score, created_at FROM Exams ORDER BY created_at DESC');
        res.json(exams);
    } catch (error) {
        console.error('Error fetching exams:', error);
        res.status(500).json({ message: 'Server error while fetching exams.' });
    }
});

// GET /api/exams/:id - Get a single exam by ID (Protected - any logged-in user)
router.get('/:id', protect, async (req, res) => {
    // ... (existing get single exam logic - no changes)
    try {
        const examId = req.params.id;
        const [exams] = await pool.query(
            'SELECT id, title, description, duration_minutes, passing_score, created_by_user_id, created_at FROM Exams WHERE id = ?',
            [examId]
        );
        if (exams.length === 0) {
            return res.status(404).json({ message: 'Exam not found.' });
        }
        res.json(exams[0]);
    } catch (error) {
        console.error(`Error fetching exam with ID ${req.params.id}:`, error);
        res.status(500).json({ message: 'Server error while fetching exam.' });
    }
});

// PUT /api/exams/:id - Update an exam (Admin only)
router.put('/:id', protect, admin, async (req, res) => {
    // ... (existing update exam logic - no changes)
    const examId = req.params.id;
    const { title, description, duration_minutes, passing_score } = req.body;
    if (title === undefined && description === undefined && duration_minutes === undefined && passing_score === undefined) {
        return res.status(400).json({ message: 'No update fields provided.' });
    }
    let duration, score;
    if (duration_minutes !== undefined) {
        duration = parseInt(duration_minutes, 10);
        if (isNaN(duration) || duration <= 0) {
            return res.status(400).json({ message: 'Duration must be a positive number.' });
        }
    }
    if (passing_score !== undefined) {
        score = parseFloat(passing_score);
        if (isNaN(score) || score < 0 || score > 100) {
            return res.status(400).json({ message: 'Passing score must be a number between 0 and 100.' });
        }
    }
    try {
        const [existingExams] = await pool.query('SELECT * FROM Exams WHERE id = ?', [examId]);
        if (existingExams.length === 0) {
            return res.status(404).json({ message: 'Exam not found.' });
        }
        const fieldsToUpdate = [];
        const values = [];
        if (title !== undefined) { fieldsToUpdate.push('title = ?'); values.push(title); }
        if (description !== undefined) { fieldsToUpdate.push('description = ?'); values.push(description); }
        if (duration !== undefined) { fieldsToUpdate.push('duration_minutes = ?'); values.push(duration); }
        if (score !== undefined) { fieldsToUpdate.push('passing_score = ?'); values.push(score); }
        if (fieldsToUpdate.length === 0) {
            return res.status(400).json({ message: 'No valid fields provided for update.' });
        }
        const sqlQuery = `UPDATE Exams SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;
        values.push(examId);
        const [result] = await pool.query(sqlQuery, values);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Exam not found or no changes made.' });
        }
        const [updatedExams] = await pool.query('SELECT * FROM Exams WHERE id = ?', [examId]);
        res.json({ message: 'Exam updated successfully!', exam: updatedExams[0] });
    } catch (error) {
        console.error(`Error updating exam with ID ${examId}:`, error);
        res.status(500).json({ message: 'Server error while updating exam.' });
    }
});

// DELETE /api/exams/:id - Delete an exam (Admin only)
router.delete('/:id', protect, admin, async (req, res) => {
    // ... (existing delete exam logic - no changes)
    const examId = req.params.id;
    try {
        const [existingExams] = await pool.query('SELECT id FROM Exams WHERE id = ?', [examId]);
        if (existingExams.length === 0) {
            return res.status(404).json({ message: 'Exam not found.' });
        }
        const [result] = await pool.query('DELETE FROM Exams WHERE id = ?', [examId]);
        if (result.affectedRows > 0) {
            res.json({ message: 'Exam deleted successfully.' });
        } else {
            return res.status(404).json({ message: 'Exam not found or already deleted.' });
        }
    } catch (error) {
        console.error(`Error deleting exam with ID ${examId}:`, error);
        res.status(500).json({ message: 'Server error while deleting exam.' });
    }
});

// === QUESTION MANAGEMENT ROUTES (from previous work, for reference, not implemented yet in this flow) ===
// router.post('/:examId/questions', protect, admin, async (req, res) => {
// ... (existing add question to exam logic - no changes from where we paused it) ...
// });


// --- NEW: GET /api/exams/:examId/results - Get all results for a specific exam (Admin only) ---
router.get('/:examId/results', protect, admin, async (req, res) => {
    const { examId } = req.params;

    try {
        // First, check if the exam exists to provide a specific 404 if not.
        const [exams] = await pool.query('SELECT id, title FROM Exams WHERE id = ?', [examId]);
        if (exams.length === 0) {
            return res.status(404).json({ message: 'Exam not found.' });
        }
        const examTitle = exams[0].title;

        // Query to get attempts for this exam, joining with Users table to get student details
        const sqlQuery = `
            SELECT 
                uea.id as attempt_id, 
                uea.user_id, 
                u.name as student_name, 
                u.email as student_email, 
                uea.exam_id,
                uea.score_achieved, 
                uea.total_possible_score,
                uea.percentage_score,
                uea.submitted_at
            FROM UserExamAttempts uea
            JOIN Users u ON uea.user_id = u.id
            WHERE uea.exam_id = ?
            ORDER BY uea.submitted_at DESC;
        `;
        const [results] = await pool.query(sqlQuery, [examId]);

        res.json({
            exam_id: parseInt(examId),
            exam_title: examTitle,
            results: results // This will be an array of result objects
        });

    } catch (error) {
        console.error(`Error fetching results for exam ID ${examId}:`, error);
        res.status(500).json({ message: 'Server error while fetching exam results.' });
    }
});
// --- END OF NEW GET RESULTS FOR EXAM ROUTE ---


module.exports = router;