const mongoose = require('mongoose');

const statsEntrySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rawText: {
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('StatsEntry', statsEntrySchema);
