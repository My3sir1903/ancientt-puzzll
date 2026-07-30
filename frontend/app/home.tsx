import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { storage } from '@/src/utils/storage';
import { getRankByScore, getNextRank, getProgressToNextRank, getPointsToNextRank } from '@/src/utils/ranks';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function HomeScreen() {
  const [username, setUsername] = useState<string>('');
  const [userStats, setUserStats] = useState({
    highScore: 0,
    gamesPlayed: 0,
    rank: '-' as string | number,
  });

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
    } else {
      router.replace('/username');
    }
  };

  const fetchUserStats = async (username: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/leaderboard/user/${encodeURIComponent(username)}`);
      if (response.ok) {
        const data = await response.json();
        setUserStats({
          highScore: data.high_score || 0,
          gamesPlayed: data.games_played || 0,
          rank: data.rank || '-',
        });
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const handleChangeUsername = async () => {
    Alert.alert(
      'Change Username',
      'Do you want to change your username? Your scores will remain saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: async () => {
            await storage.removeItem('username');
            router.replace('/username');
          },
        },
      ]
    );
  };

  const handlePlayGame = () => {
    router.push('/game');
  };

  const handleViewLeaderboard = () => {
    router.push('/leaderboard');
  };

  const handleOpenSettings = () => {
    router.push('/settings');
  };

  // Calculate rank info based on high score
  const currentRank = getRankByScore(userStats.highScore);
  const nextRank = getNextRank(userStats.highScore);
  const progress = getProgressToNextRank(userStats.highScore);
  const pointsToNext = getPointsToNextRank(userStats.highScore);

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatarPlaceholder}>
            <MaterialIcons name="person" size={32} color="#fff" />
          </View>
          <View style={styles.userText}>
            <Text style={styles.userName} testID="home-username">{username}</Text>
            <TouchableOpacity onPress={handleChangeUsername} testID="change-username-btn">
              <Text style={styles.changeText}>Change Username</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleContainer}>
          <MaterialIcons name="grid-on" size={60} color="#e94560" />
          <Text style={styles.title}>Ancient Puzzle</Text>
          <Text style={styles.subtitle}>Match the sacred symbols</Text>
        </View>

        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuButton} onPress={handlePlayGame} testID="play-game-btn">
            <LinearGradient
              colors={['#e94560', '#c0392b']}
              style={styles.menuButtonGradient}
            >
              <MaterialIcons name="play-arrow" size={32} color="#fff" />
              <Text style={styles.menuButtonText}>Play Game</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuButton} onPress={handleViewLeaderboard} testID="leaderboard-btn">
            <View style={styles.menuButtonOutline}>
              <MaterialIcons name="leaderboard" size={28} color="#e94560" />
              <Text style={styles.menuButtonTextOutline}>Leaderboard</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuButton} onPress={handleOpenSettings} testID="settings-btn">
            <View style={styles.menuButtonOutline}>
              <MaterialIcons name="settings" size={28} color="#e94560" />
              <Text style={styles.menuButtonTextOutline}>Settings</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue} testID="stat-high-score">{userStats.highScore}</Text>
            <Text style={styles.statLabel}>High Score</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue} testID="stat-games-played">{userStats.gamesPlayed}</Text>
            <Text style={styles.statLabel}>Games Played</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue} testID="stat-rank">{userStats.rank}</Text>
            <Text style={styles.statLabel}>Rank</Text>
          </View>
        </View>

        {/* Rank Display Card - Clickable */}
        <TouchableOpacity
          style={styles.rankCardContainer}
          onPress={() => router.push('/ranks')}
          activeOpacity={0.8}
          testID="rank-card"
        >
          <LinearGradient
            colors={currentRank.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.rankCard}
          >
            <View style={styles.rankHeader}>
              <View style={styles.rankIconContainer}>
                <MaterialIcons
                  name={currentRank.icon as any}
                  size={48}
                  color={currentRank.textColor}
                />
              </View>
              <View style={styles.rankInfo}>
                <Text style={[styles.rankLabel, { color: currentRank.textColor }]}>
                  Current Rank
                </Text>
                <Text style={[styles.rankName, { color: currentRank.textColor }]} testID="rank-name">
                  {currentRank.name}
                </Text>
                <Text style={[styles.rankDescription, { color: currentRank.textColor }]}>
                  {currentRank.description}
                </Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={28}
                color={currentRank.textColor}
                style={{ opacity: 0.7 }}
              />
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBackground}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${progress * 100}%`,
                      backgroundColor: currentRank.textColor,
                    },
                  ]}
                />
              </View>
              <View style={styles.progressLabels}>
                <Text style={[styles.progressText, { color: currentRank.textColor }]}>
                  {userStats.highScore} pts
                </Text>
                {nextRank ? (
                  <Text style={[styles.progressText, { color: currentRank.textColor }]}>
                    {pointsToNext} to {nextRank.name}
                  </Text>
                ) : (
                  <Text style={[styles.progressText, { color: currentRank.textColor }]}>
                    MAX RANK
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.tapHint}>
              <Text style={[styles.tapHintText, { color: currentRank.textColor }]}>
                Tap to view all ranks
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
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
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e94560',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userText: {
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  changeText: {
    fontSize: 12,
    color: '#e94560',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#e94560',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#a8b2d1',
    marginTop: 4,
  },
  menuContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  menuButton: {
    width: '100%',
  },
  menuButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 12,
  },
  menuButtonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e94560',
    backgroundColor: 'rgba(233, 69, 96, 0.1)',
    gap: 12,
  },
  menuButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  menuButtonTextOutline: {
    color: '#e94560',
    fontSize: 18,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(233, 69, 96, 0.2)',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#e94560',
  },
  statLabel: {
    fontSize: 11,
    color: '#a8b2d1',
    marginTop: 4,
    textAlign: 'center',
  },
  // Rank Card Styles
  rankCardContainer: {
    width: '100%',
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  rankCard: {
    padding: 20,
  },
  rankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  rankIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rankInfo: {
    flex: 1,
  },
  rankLabel: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.9,
    marginBottom: 2,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  rankName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  rankDescription: {
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.9,
  },
  progressContainer: {
    marginTop: 8,
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
  tapHint: {
    marginTop: 12,
    alignItems: 'center',
  },
  tapHintText: {
    fontSize: 11,
    opacity: 0.85,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
