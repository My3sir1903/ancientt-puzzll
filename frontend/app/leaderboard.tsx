import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { storage } from '@/src/utils/storage';
import { getRankByScore } from '@/src/utils/ranks';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface LeaderboardEntry {
  username: string;
  score: number;
  timestamp: string;
  rank?: number;
}

export default function LeaderboardScreen() {
  const [scores, setScores] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);

  useEffect(() => {
    loadUsername();
    fetchLeaderboard();
  }, []);

  const loadUsername = async () => {
    const username = await storage.getItem('username', null);
    setCurrentUsername(username);
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/leaderboard/top?limit=50`);
      if (response.ok) {
        const data = await response.json();
        // Add rank to each entry
        const rankedData = data.map((entry: LeaderboardEntry, index: number) => ({
          ...entry,
          rank: index + 1,
        }));
        setScores(rankedData);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard();
  };

  const renderRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}`;
  };

  const renderItem = ({ item }: { item: LeaderboardEntry }) => {
    const isCurrentUser = item.username === currentUsername;
    const playerRank = getRankByScore(item.score);

    return (
      <View
        style={[
          styles.scoreItem,
          isCurrentUser && styles.currentUserItem,
        ]}
        testID={`leaderboard-entry-${item.rank}`}
      >
        <View style={styles.rankContainer}>
          <Text
            style={[
              styles.rankText,
              item.rank && item.rank <= 3 && styles.topRankText,
            ]}
          >
            {renderRankIcon(item.rank!)}
          </Text>
        </View>

        <View style={styles.playerInfo}>
          <View style={styles.usernameRow}>
            <Text
              style={[
                styles.username,
                isCurrentUser && styles.currentUserText,
              ]}
              numberOfLines={1}
            >
              {item.username}
              {isCurrentUser && ' (You)'}
            </Text>
          </View>

          {/* Rank Badge */}
          <View style={styles.rankBadgeContainer}>
            <LinearGradient
              colors={playerRank.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.rankBadge}
            >
              <MaterialIcons
                name={playerRank.icon as any}
                size={12}
                color={playerRank.textColor}
              />
              <Text
                style={[
                  styles.rankBadgeText,
                  { color: playerRank.textColor },
                ]}
              >
                {playerRank.name}
              </Text>
            </LinearGradient>
            <Text style={styles.timestamp}>
              {new Date(item.timestamp).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={styles.scoreValue}>{item.score}</Text>
          <Text style={styles.scoreLabel}>blocks</Text>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} testID="back-btn">
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton} testID="refresh-btn">
          <MaterialIcons name="refresh" size={24} color="#e94560" />
        </TouchableOpacity>
      </View>

      <View style={styles.titleContainer}>
        <MaterialIcons name="emoji-events" size={48} color="#e94560" />
        <Text style={styles.title}>Top Players</Text>
        <Text style={styles.subtitle}>Compete for the highest score!</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e94560" />
        </View>
      ) : scores.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="sports-esports" size={64} color="#a8b2d1" />
          <Text style={styles.emptyText}>No scores yet!</Text>
          <Text style={styles.emptySubtext}>Be the first to play and set a high score</Text>
        </View>
      ) : (
        <FlatList
          data={scores}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.username}-${index}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#e94560"
            />
          }
        />
      )}
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
  refreshButton: {
    padding: 8,
  },
  titleContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e94560',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#a8b2d1',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#a8b2d1',
    marginTop: 8,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(233, 69, 96, 0.2)',
  },
  currentUserItem: {
    backgroundColor: 'rgba(233, 69, 96, 0.15)',
    borderColor: '#e94560',
  },
  rankContainer: {
    width: 44,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#a8b2d1',
  },
  topRankText: {
    fontSize: 28,
  },
  playerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  usernameRow: {
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  currentUserText: {
    color: '#e94560',
  },
  rankBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  rankBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  timestamp: {
    fontSize: 11,
    color: '#a8b2d1',
  },
  scoreContainer: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#e94560',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#a8b2d1',
  },
});
