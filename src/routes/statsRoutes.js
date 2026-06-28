const express = require('express');
const router = express.Router();
const {
  getStatsEntries,
  addStatsEntry,
  getStatsRank,
  getDashboardSummary,
  getLeaderboard,
  deleteStatsEntry,
} = require('../controllers/statsController');
const { protect } = require('../middleware/auth');

router.get('/rank', protect, getStatsRank);
router.get('/summary', protect, getDashboardSummary);
router.get('/leaderboard', protect, getLeaderboard);
router.get('/', protect, getStatsEntries);
router.post('/', protect, addStatsEntry);
router.delete('/:id', protect, deleteStatsEntry);

module.exports = router;
