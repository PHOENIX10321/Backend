// backend/routes/adminRoutes.js
const express = require('express');
const pool = require('../config/db');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/admin/enrollments - Get all student exam attempts/enrollments (Admin only)
router.get('/enrollments', protect, admin, async (req, res) => {
    try {
        const query = `
            SELECT 
                uea.id AS enrollment_id, 
                u.id AS student_id,
                u.name AS student_name,
                u.email AS student_email,
                e.id AS exam_id,
                e.title AS exam_title, 
                uea.submitted_at AS enrollment_date,
                uea.score_achieved,         -- Added score
                uea.total_possible_score    -- Added total score
            FROM UserExamAttempts uea
            JOIN Users u ON uea.user_id = u.id
            JOIN Exams e ON uea.exam_id = e.id
            WHERE u.role = 'student' -- Ensure we only fetch for actual students
            ORDER BY uea.submitted_at DESC;
        `;
        const [enrollments] = await pool.query(query);

        res.json(enrollments);

    } catch (error) {
        console.error('Error fetching student enrollments:', error);
        res.status(500).json({ message: 'Server error while fetching student enrollments.' });
    }
});

module.exports = router;