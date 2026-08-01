import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { storage } from '@/src/utils/storage';
import { RANKS, getRankByScore, getNextRank, getProgressToNextRank, getPointsToNextRank } from '@/src/utils/ranks';

const BACKEND_URL = 'https://ancient-puzzl.onrender.com';

export default function RanksScreen() {
  const [username, setUsername] = useState<string>('');
  const [highScore, setHighScore] = useState<number>(0);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  const loadUserData = async () => {
    const savedUsername = await storage.getItem('username', null);
    if (savedUsername) {
      setUsername(savedUsername);
      fetchUserStats(savedUsername);
    }
  };

  const fetchUserStats = async (username: string) => {
  try {
    const response = await fetch(
      `${BACKEND_URL}/api/leaderboard/user/${encodeURIComponent(username)}`
    );

    if (response.ok) {
      const data = await response.json();

      console.log("API DATA:", data);

      setHighScore(Number(data.high_score));
    }
  } catch (error) {
    console.error(error);
  }
};

  const currentRank = getRankByScore(highScore);
  console.log("HIGH SCORE:", highScore);
  console.log("CURRENT RANK:", currentRank);
  const nextRank = getNextRank(highScore);
  const progress = getProgressToNextRank(highScore);
  const pointsToNext = getPointsToNextRank(highScore);
  console.log("RENDER HIGH SCORE:", highScore);
  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} testID="back-btn">
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ranks Overview</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Points Section */}
        <View style={styles.pointsCard}>
          <MaterialIcons name="stars" size={40} color="#e94560" />
          <Text style={styles.pointsLabel}>Your Total Points</Text>
          <Text style={styles.pointsValue} testID="total-points">{highScore}</Text>
          <Text style={styles.pointsUser}>{username}</Text>
        </View>

        {/* Current Rank Card */}
        <LinearGradient
          colors={currentRank.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.currentRankCard}
        >
          <View style={styles.currentRankHeader}>
            <View style={styles.currentRankIconContainer}>
              <MaterialIcons
                name={currentRank.icon as any}
                size={40}
                color={currentRank.textColor}
              />
            </View>
            <View style={styles.currentRankInfo}>
              <Text style={[styles.currentRankLabel, { color: currentRank.textColor }]}>
                CURRENT RANK
              </Text>
              <Text style={[styles.currentRankName, { color: currentRank.textColor }]}>
                {currentRank.name}
              </Text>
              <Text style={[styles.currentRankDesc, { color: currentRank.textColor }]}>
                {currentRank.description}
              </Text>
            </View>
          </View>

          {nextRank ? (
            <View style={styles.nextRankSection}>
              <View style={styles.progressBarBackground}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${progress * 100}%`, backgroundColor: currentRank.textColor },
                  ]}
                />
              </View>
              <View style={styles.progressLabels}>
                <Text style={[styles.progressText, { color: currentRank.textColor }]}>
                  {highScore} pts
                </Text>
                <Text style={[styles.progressText, { color: currentRank.textColor }]}>
                  {pointsToNext} to {nextRank.name}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.maxRankBadge}>
              <MaterialIcons name="emoji-events" size={20} color={currentRank.textColor} />
              <Text style={[styles.maxRankText, { color: currentRank.textColor }]}>
                MAXIMUM RANK ACHIEVED
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* All Ranks List */}
        <View style={styles.allRanksSection}>
          <Text style={styles.sectionTitle}>All Ranks</Text>
          <Text style={styles.sectionSubtitle}>
            Reach these point thresholds to unlock each rank
          </Text>

          {RANKS.map((rank, index) => {
            const isCurrent = rank.tier === currentRank.tier;
            const isUnlocked = highScore >= rank.minPoints;
            const pointsNeeded = rank.minPoints - highScore;

            return (
              <View
                key={rank.tier}
                style={[
                  styles.rankItem,
                  isCurrent && styles.rankItemCurrent,
                ]}
                testID={`rank-item-${rank.tier}`}
              >
                <LinearGradient
                  colors={rank.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.rankItemIconContainer}
                >
                  <MaterialIcons
                    name={rank.icon as any}
                    size={28}
                    color={rank.textColor}
                  />
                </LinearGradient>

                <View style={styles.rankItemContent}>
                  <View style={styles.rankItemHeader}>
                    <Text style={styles.rankItemName}>{rank.name}</Text>
                    {isCurrent && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>CURRENT</Text>
                      </View>
                    )}
                    {isUnlocked && !isCurrent && (
                      <MaterialIcons name="check-circle" size={18} color="#4ade80" />
                    )}
                  </View>
                  <Text style={styles.rankItemDescription}>{rank.description}</Text>
                  <View style={styles.rankItemRange}>
                    <MaterialIcons name="stars" size={14} color="#a8b2d1" />
                    <Text style={styles.rankItemRangeText}>
                      {rank.maxPoints !== null
                        ? `${rank.minPoints} - ${rank.maxPoints} points`
                        : `${rank.minPoints}+ points`}
                    </Text>
                  </View>
                  {!isUnlocked && (
                    <Text style={styles.rankItemLocked}>
                      {pointsNeeded} more points to unlock
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.footerNote}>
          <MaterialIcons name="info-outline" size={16} color="#a8b2d1" />
          <Text style={styles.footerNoteText}>
            Ranks are based on your highest score. Play more to reach higher tiers!
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  // Points Card
  pointsCard: {
    backgroundColor: 'rgba(233, 69, 96, 0.1)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(233, 69, 96, 0.3)',
  },
  pointsLabel: {
    fontSize: 12,
    color: '#a8b2d1',
    marginTop: 8,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  pointsValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#e94560',
    marginTop: 4,
  },
  pointsUser: {
    fontSize: 14,
    color: '#fff',
    marginTop: 4,
    fontWeight: '500',
  },
  // Current Rank Card
  currentRankCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  currentRankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  currentRankIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  currentRankInfo: {
    flex: 1,
  },
  currentRankLabel: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.9,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  currentRankName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  currentRankDesc: {
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.9,
  },
  nextRankSection: {
    marginTop: 4,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
  },
  maxRankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  maxRankText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  // All Ranks Section
  allRanksSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#a8b2d1',
    marginBottom: 16,
  },
  rankItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  rankItemCurrent: {
    borderColor: '#e94560',
    borderWidth: 2,
    backgroundColor: 'rgba(233, 69, 96, 0.08)',
  },
  rankItemIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rankItemContent: {
    flex: 1,
  },
  rankItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  rankItemName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#fff',
  },
  currentBadge: {
    backgroundColor: '#e94560',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  currentBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  rankItemDescription: {
    fontSize: 12,
    color: '#a8b2d1',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  rankItemRange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rankItemRangeText: {
    fontSize: 13,
    color: '#e94560',
    fontWeight: '600',
  },
  rankItemLocked: {
    fontSize: 11,
    color: '#a8b2d1',
    marginTop: 4,
    fontStyle: 'italic',
  },
  // Footer
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
  },
  footerNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#a8b2d1',
    lineHeight: 16,
  },
});
