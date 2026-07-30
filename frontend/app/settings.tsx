import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { storage } from '@/src/utils/storage';
import {
  getGameSettings,
  updateSetting,
  GameSettings,
} from '@/src/utils/gameSettings';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<GameSettings>({
    sfxEnabled: true,
    musicEnabled: true,
  });
  const [username, setUsername] = useState<string>('');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const s = await getGameSettings();
    setSettings(s);
    const u = await storage.getItem('username', null);
    setUsername(u || '');
  };

  const handleToggleSfx = async (value: boolean) => {
    const updated = await updateSetting('sfxEnabled', value);
    setSettings(updated);
  };

  const handleToggleMusic = async (value: boolean) => {
    const updated = await updateSetting('musicEnabled', value);
    setSettings(updated);
  };

  const handleChangeUsername = () => {
    Alert.alert(
      'Change Username',
      `Current username: ${username}\n\nDo you want to log out and change your username? Your scores will remain on the leaderboard.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          style: 'destructive',
          onPress: async () => {
            await storage.removeItem('username');
            router.replace('/username');
          },
        },
      ]
    );
  };

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            testID="back-btn"
          >
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Player Info */}
          <View style={styles.playerCard}>
            <View style={styles.avatarContainer}>
              <MaterialIcons name="person" size={40} color="#fff" />
            </View>
            <View style={styles.playerInfo}>
              <Text style={styles.playerLabel}>Signed in as</Text>
              <Text style={styles.playerName} testID="player-name">
                {username}
              </Text>
            </View>
          </View>

          {/* Audio Settings */}
          <Text style={styles.sectionTitle}>Audio</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View
                style={[
                  styles.settingIcon,
                  { backgroundColor: 'rgba(233, 69, 96, 0.15)' },
                ]}
              >
                <MaterialIcons name="volume-up" size={24} color="#e94560" />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Sound Effects</Text>
                <Text style={styles.settingDescription}>
                  Haptic feedback for placement & matches
                </Text>
              </View>
            </View>
            <Switch
              value={settings.sfxEnabled}
              onValueChange={handleToggleSfx}
              trackColor={{ false: '#3d3d5c', true: '#e94560' }}
              thumbColor="#fff"
              ios_backgroundColor="#3d3d5c"
              testID="sfx-toggle"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View
                style={[
                  styles.settingIcon,
                  { backgroundColor: 'rgba(155, 89, 182, 0.15)' },
                ]}
              >
                <MaterialIcons name="music-note" size={24} color="#9b59b6" />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Music</Text>
                <Text style={styles.settingDescription}>
                  Background ambient soundtrack
                </Text>
              </View>
            </View>
            <Switch
              value={settings.musicEnabled}
              onValueChange={handleToggleMusic}
              trackColor={{ false: '#3d3d5c', true: '#9b59b6' }}
              thumbColor="#fff"
              ios_backgroundColor="#3d3d5c"
              testID="music-toggle"
            />
          </View>

          {/* Account Section */}
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleChangeUsername}
            testID="logout-btn"
          >
            <View style={styles.settingLeft}>
              <View
                style={[
                  styles.settingIcon,
                  { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
                ]}
              >
                <MaterialIcons name="logout" size={24} color="#ef4444" />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>
                  Log Out / Change Username
                </Text>
                <Text style={styles.settingDescription}>
                  Sign out and use a different name
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#a8b2d1" />
          </TouchableOpacity>

          {/* About Section */}
          <Text style={styles.sectionTitle}>About</Text>

          <View style={styles.aboutCard}>
            <MaterialIcons name="grid-on" size={40} color="#e94560" />
            <Text style={styles.aboutTitle}>Ancient Puzzle</Text>
            <Text style={styles.aboutVersion}>Version 1.0.0</Text>
            <Text style={styles.aboutDescription}>
              Match sacred symbols in this ancient mythological puzzle.
              Combine 3 or more same-colored blocks to unleash their power.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
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
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(233, 69, 96, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(233, 69, 96, 0.3)',
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e94560',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  playerInfo: {
    flex: 1,
  },
  playerLabel: {
    fontSize: 12,
    color: '#a8b2d1',
    letterSpacing: 0.5,
  },
  playerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e94560',
    letterSpacing: 1.5,
    marginBottom: 12,
    marginTop: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  settingDescription: {
    fontSize: 12,
    color: '#a8b2d1',
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  aboutCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(233, 69, 96, 0.15)',
  },
  aboutTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e94560',
    marginTop: 8,
  },
  aboutVersion: {
    fontSize: 12,
    color: '#a8b2d1',
    marginTop: 4,
    marginBottom: 12,
  },
  aboutDescription: {
    fontSize: 13,
    color: '#a8b2d1',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
