const STAT_PATTERNS = [
  { key: 'processed', regex: /Processed\s+(\d+)\s*\/\s*(\d+)/i, type: 'fraction' },
  { key: 'normal', regex: /Normal\s+(\d+)/i },
  { key: 'underHour', regex: /Under hour\s+(\d+)/i },
  { key: 'cancelled', regex: /Cancelled\s+(\d+)/i },
  { key: 'skipped', regex: /Skipped\s+(\d+)/i },
  { key: 'failed', regex: /Failed\s+(\d+)/i },
];

const parseStatsText = (text) => {
  if (!text?.trim()) {
    return { stats: null, error: 'Stats text is required' };
  }

  const stats = { rawText: text.trim() };
  let matched = 0;

  for (const pattern of STAT_PATTERNS) {
    const match = text.match(pattern.regex);
    if (!match) continue;

    matched += 1;

    if (pattern.type === 'fraction') {
      stats.processedCompleted = Number(match[1]);
      stats.processedTotal = Number(match[2]);
    } else {
      stats[pattern.key] = Number(match[1]);
    }
  }

  if (matched === 0) {
    return {
      stats: null,
      error: 'Could not parse stats. Use format: Processed 25/25 - Normal 24 - Under hour 0 - Cancelled 1 - Skipped 0 - Failed 0',
    };
  }

  return { stats, error: null };
};

module.exports = { parseStatsText };
