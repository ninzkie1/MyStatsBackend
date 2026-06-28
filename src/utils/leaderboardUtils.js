const StatsEntry = require('../models/StatsEntry');
const { getTodayDateString, getDayRange } = require('./dateUtils');

const buildLeaderboard = async () => {
  const today = getTodayDateString();
  const { start, end } = getDayRange(today);

  const aggregated = await StatsEntry.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: '$user',
        totalProcessed: { $sum: '$processedCompleted' },
        totalNormal: { $sum: '$normal' },
        entryCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'userInfo',
      },
    },
    { $unwind: '$userInfo' },
    {
      $project: {
        userId: '$_id',
        username: '$userInfo.username',
        totalProcessed: 1,
        totalNormal: 1,
        entryCount: 1,
        accuracy: {
          $cond: [
            { $gt: ['$totalProcessed', 0] },
            {
              $round: [
                { $multiply: [{ $divide: ['$totalNormal', '$totalProcessed'] }, 100] },
                1,
              ],
            },
            0,
          ],
        },
      },
    },
  ]);

  const byProcessed = [...aggregated]
    .sort((a, b) => b.totalProcessed - a.totalProcessed)
    .map((item, index) => ({ rank: index + 1, ...item }));

  const byNormal = [...aggregated]
    .sort((a, b) => b.totalNormal - a.totalNormal)
    .map((item, index) => ({ rank: index + 1, ...item }));

  return { byProcessed, byNormal };
};

const getUserRank = (leaderboard, userId) => {
  const id = userId.toString();
  const processed = leaderboard.byProcessed.find((item) => item.userId.toString() === id);
  const normal = leaderboard.byNormal.find((item) => item.userId.toString() === id);

  return {
    processed: processed
      ? {
          rank: processed.rank,
          totalUsers: leaderboard.byProcessed.length,
          totalProcessed: processed.totalProcessed,
          totalNormal: processed.totalNormal,
          accuracy: processed.accuracy,
        }
      : null,
    normal: normal
      ? {
          rank: normal.rank,
          totalUsers: leaderboard.byNormal.length,
          totalProcessed: normal.totalProcessed,
          totalNormal: normal.totalNormal,
          accuracy: normal.accuracy,
        }
      : null,
  };
};

module.exports = {
  buildLeaderboard,
  getUserRank,
};
