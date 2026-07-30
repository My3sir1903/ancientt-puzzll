// Rank system based on player's high score

export interface RankInfo {
  name: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  icon: string; // MaterialIcons name
  colors: [string, string]; // gradient colors [start, end]
  textColor: string;
  minPoints: number;
  maxPoints: number | null; // null means no upper limit
  description: string;
}

export const RANKS: RankInfo[] = [
  {
    name: 'Bronze',
    tier: 'bronze',
    icon: 'military-tech',
    colors: ['#cd7f32', '#8b4513'],
    textColor: '#ffd7a8',
    minPoints: 0,
    maxPoints: 99,
    description: 'The path of the initiate',
  },
  {
    name: 'Silver',
    tier: 'silver',
    icon: 'military-tech',
    colors: ['#c0c0c0', '#808080'],
    textColor: '#ffffff',
    minPoints: 100,
    maxPoints: 299,
    description: 'Rising through the ranks',
  },
  {
    name: 'Gold',
    tier: 'gold',
    icon: 'workspace-premium',
    colors: ['#ffd700', '#b8860b'],
    textColor: '#fff8dc',
    minPoints: 300,
    maxPoints: 599,
    description: 'A worthy warrior',
  },
  {
    name: 'Platinum',
    tier: 'platinum',
    icon: 'diamond',
    colors: ['#00ced1', '#008b8b'],
    textColor: '#e0ffff',
    minPoints: 600,
    maxPoints: 999,
    description: 'Master of the ancient arts',
  },
  {
    name: 'Ancient Master',
    tier: 'diamond',
    icon: 'auto-awesome',
    colors: ['#9b59b6', '#5b2c6f'],
    textColor: '#f5eef8',
    minPoints: 1000,
    maxPoints: null,
    description: 'Legend of the ancients',
  },
];

export const getRankByScore = (score: number): RankInfo => {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (score >= RANKS[i].minPoints) {
      return RANKS[i];
    }
  }
  return RANKS[0];
};

export const getNextRank = (score: number): RankInfo | null => {
  const currentRank = getRankByScore(score);
  const currentIndex = RANKS.findIndex((r) => r.tier === currentRank.tier);
  if (currentIndex === RANKS.length - 1) {
    return null; // Already at max rank
  }
  return RANKS[currentIndex + 1];
};

export const getProgressToNextRank = (score: number): number => {
  const currentRank = getRankByScore(score);
  const nextRank = getNextRank(score);
  
  if (!nextRank) {
    return 1; // 100% - at max rank
  }
  
  const rangeSize = nextRank.minPoints - currentRank.minPoints;
  const currentProgress = score - currentRank.minPoints;
  return Math.min(currentProgress / rangeSize, 1);
};

export const getPointsToNextRank = (score: number): number => {
  const nextRank = getNextRank(score);
  if (!nextRank) return 0;
  return nextRank.minPoints - score;
};
