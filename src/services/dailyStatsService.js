const StatsEntry = require('../models/StatsEntry');
const DailyStats = require('../models/DailyStats');
const { getTodayDateString, getDayRange, formatDateString } = require('../utils/dateUtils');

const groupFields = {
  processedCompleted: { $sum: '$processedCompleted' },
  processedTotal: { $sum: '$processedTotal' },
  normal: { $sum: '$normal' },
  underHour: { $sum: '$underHour' },
  cancelled: { $sum: '$cancelled' },
  skipped: { $sum: '$skipped' },
  failed: { $sum: '$failed' },
  entryCount: { $sum: 1 },
};

const finalizeDate = async (dateStr) => {
  const { start, end } = getDayRange(dateStr);

  const userDayStats = await StatsEntry.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    { $group: { _id: '$user', ...groupFields } },
  ]);

  for (const stat of userDayStats) {
    await DailyStats.findOneAndUpdate(
      { user: stat._id, date: dateStr },
      {
        processedCompleted: stat.processedCompleted,
        processedTotal: stat.processedTotal,
        normal: stat.normal,
        underHour: stat.underHour,
        cancelled: stat.cancelled,
        skipped: stat.skipped,
        failed: stat.failed,
        entryCount: stat.entryCount,
        finalizedAt: new Date(),
      },
      { upsert: true, new: true }
    );
  }

  await StatsEntry.deleteMany({ createdAt: { $gte: start, $lte: end } });
};

const finalizePendingDailyStats = async () => {
  const today = getTodayDateString();
  const { start: todayStart } = getDayRange(today);

  const oldEntries = await StatsEntry.find({ createdAt: { $lt: todayStart } }).select('createdAt');
  const pendingDates = [
    ...new Set(oldEntries.map((entry) => formatDateString(entry.createdAt))),
  ]
    .filter((dateStr) => dateStr < today)
    .sort();

  for (const dateStr of pendingDates) {
    await finalizeDate(dateStr);
  }
};

let lastCheckedDate = getTodayDateString();

const startDailyStatsScheduler = () => {
  finalizePendingDailyStats().catch((err) => {
    console.error('Daily stats finalization error:', err);
  });

  setInterval(() => {
    const today = getTodayDateString();
    if (today !== lastCheckedDate) {
      lastCheckedDate = today;
      finalizePendingDailyStats().catch((err) => {
        console.error('Daily stats finalization error:', err);
      });
    }
  }, 60 * 1000);
};

const formatDailyStats = (doc) => ({
  _id: doc._id,
  date: doc.date,
  processed: {
    completed: doc.processedCompleted,
    total: doc.processedTotal,
  },
  normal: doc.normal,
  underHour: doc.underHour,
  cancelled: doc.cancelled,
  skipped: doc.skipped,
  failed: doc.failed,
  entryCount: doc.entryCount,
  finalizedAt: doc.finalizedAt,
});

module.exports = {
  finalizePendingDailyStats,
  finalizeDate,
  startDailyStatsScheduler,
  formatDailyStats,
  groupFields,
};
