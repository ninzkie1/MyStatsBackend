const mongoose = require('mongoose');

const dailyStatsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  processedCompleted: { type: Number, default: 0 },
  processedTotal: { type: Number, default: 0 },
  normal: { type: Number, default: 0 },
  underHour: { type: Number, default: 0 },
  cancelled: { type: Number, default: 0 },
  skipped: { type: Number, default: 0 },
  failed: { type: Number, default: 0 },
  entryCount: { type: Number, default: 0 },
  finalizedAt: {
    type: Date,
    default: Date.now,
  },
});

dailyStatsSchema.index({ user: 1, date: 1 }, { unique: true });
dailyStatsSchema.index({ date: 1 });

module.exports = mongoose.model('DailyStats', dailyStatsSchema);
