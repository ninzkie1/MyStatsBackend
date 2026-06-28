const StatsEntry = require('../models/StatsEntry');
const DailyStats = require('../models/DailyStats');
const { parseStatsText } = require('../utils/parseStatsText');
const { buildLeaderboard, getUserRank } = require('../utils/leaderboardUtils');
const { getTodayDateString, getDayRange } = require('../utils/dateUtils');
const {
  finalizePendingDailyStats,
  formatDailyStats,
  groupFields,
} = require('../services/dailyStatsService');
const formatEntry = (entry) => ({
  _id: entry._id,
  rawText: entry.rawText,
  processed: {
    completed: entry.processedCompleted,
    total: entry.processedTotal,
  },
  normal: entry.normal,
  underHour: entry.underHour,
  cancelled: entry.cancelled,
  skipped: entry.skipped,
  failed: entry.failed,
  createdAt: entry.createdAt,
});

const computeTotalsFromAggregate = (result) => {
  const totals = result[0] || {
    processedCompleted: 0,
    processedTotal: 0,
    normal: 0,
    underHour: 0,
    cancelled: 0,
    skipped: 0,
    failed: 0,
  };

  return {
    processed: {
      completed: totals.processedCompleted,
      total: totals.processedTotal,
    },
    normal: totals.normal,
    underHour: totals.underHour,
    cancelled: totals.cancelled,
    skipped: totals.skipped,
    failed: totals.failed,
  };
};

const RATE_LIMIT_MS = 60 * 1000;
const DEFAULT_PAGE_SIZE = 5;

// @desc    Get paginated stats entries for logged-in user
// @route   GET /api/stats?page=1&limit=5
// @access  Private
const getStatsEntries = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE));
    const skip = (page - 1) * limit;

    const today = getTodayDateString();
    const { start, end } = getDayRange(today);
    const userFilter = {
      user: req.user._id,
      createdAt: { $gte: start, $lte: end },
    };

    const [entries, totalEntries, totalsAggregate] = await Promise.all([
      StatsEntry.find(userFilter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      StatsEntry.countDocuments(userFilter),
      StatsEntry.aggregate([
        { $match: userFilter },
        {
          $group: {
            _id: null,
            processedCompleted: { $sum: '$processedCompleted' },
            processedTotal: { $sum: '$processedTotal' },
            normal: { $sum: '$normal' },
            underHour: { $sum: '$underHour' },
            cancelled: { $sum: '$cancelled' },
            skipped: { $sum: '$skipped' },
            failed: { $sum: '$failed' },
          },
        },
      ]),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalEntries / limit));

    res.json({
      success: true,
      data: {
        entries: entries.map(formatEntry),
        totals: computeTotalsFromAggregate(totalsAggregate),
        pagination: {
          page,
          limit,
          totalEntries,
          totalPages,
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Add a stats entry
// @route   POST /api/stats
// @access  Private
const addStatsEntry = async (req, res) => {
  try {
    const { rawText } = req.body;
    const { stats, error } = parseStatsText(rawText);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    const lastEntry = await StatsEntry.findOne({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('createdAt');

    if (lastEntry) {
      const elapsed = Date.now() - lastEntry.createdAt.getTime();
      const waitMs = RATE_LIMIT_MS - elapsed;

      if (waitMs > 0) {
        const retryAfterSeconds = Math.ceil(waitMs / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${retryAfterSeconds} second(s) before adding another entry`,
          retryAfterSeconds,
        });
      }
    }

    const entry = await StatsEntry.create({
      user: req.user._id,
      rawText: stats.rawText,
      processedCompleted: stats.processedCompleted || 0,
      processedTotal: stats.processedTotal || 0,
      normal: stats.normal || 0,
      underHour: stats.underHour || 0,
      cancelled: stats.cancelled || 0,
      skipped: stats.skipped || 0,
      failed: stats.failed || 0,
    });

    res.status(201).json({
      success: true,
      data: formatEntry(entry),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get current user rank (today only, real-time)
// @route   GET /api/stats/rank
// @access  Private
const getStatsRank = async (req, res) => {
  try {
    const leaderboard = await buildLeaderboard();
    const rank = getUserRank(leaderboard, req.user._id);

    res.json({
      success: true,
      data: { rank },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get dashboard summary (rank, today, daily finals)
// @route   GET /api/stats/summary
// @access  Private
const getDashboardSummary = async (req, res) => {
  try {
    const leaderboard = await buildLeaderboard();
    const rank = getUserRank(leaderboard, req.user._id);

    const today = getTodayDateString();
    const { start, end } = getDayRange(today);

    const [todayAggregate, dailySnapshots] = await Promise.all([
      StatsEntry.aggregate([
        { $match: { user: req.user._id, createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, ...groupFields } },
      ]),
      DailyStats.find({ user: req.user._id }).sort({ date: -1 }).limit(14),
    ]);

    const todayTotals = todayAggregate[0] || {
      processedCompleted: 0,
      processedTotal: 0,
      normal: 0,
      underHour: 0,
      cancelled: 0,
      skipped: 0,
      failed: 0,
      entryCount: 0,
    };

    res.json({
      success: true,
      data: {
        rank,
        today: {
          date: today,
          processed: {
            completed: todayTotals.processedCompleted,
            total: todayTotals.processedTotal,
          },
          normal: todayTotals.normal,
          underHour: todayTotals.underHour,
          cancelled: todayTotals.cancelled,
          skipped: todayTotals.skipped,
          failed: todayTotals.failed,
          entryCount: todayTotals.entryCount,
        },
        dailySnapshots: dailySnapshots.map(formatDailyStats),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get leaderboard rankings across all users
// @route   GET /api/stats/leaderboard
// @access  Private
const getLeaderboard = async (req, res) => {
  try {
    const { byProcessed, byNormal } = await buildLeaderboard();

    res.json({
      success: true,
      data: {
        byProcessed,
        byNormal,
      },
    });
  } catch (error) {    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Delete a stats entry
// @route   DELETE /api/stats/:id
// @access  Private
const deleteStatsEntry = async (req, res) => {
  try {
    const entry = await StatsEntry.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Stats entry not found',
      });
    }

    await entry.deleteOne();

    res.json({
      success: true,
      message: 'Stats entry deleted',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

module.exports = {
  getStatsEntries,
  addStatsEntry,
  getStatsRank,
  getDashboardSummary,
  getLeaderboard,
  deleteStatsEntry,
};