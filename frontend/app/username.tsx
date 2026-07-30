import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { storage } from '@/src/utils/storage';

export default function UsernameScreen() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleStart = async () => {
    const trimmedUsername = username.trim();
    
    if (!trimmedUsername) {
      setError('Please enter a username');
      return;
    }

    if (trimmedUsername.length < 2) {
      setError('Username must be at least 2 characters');
      return;
    }

    if (trimmedUsername.length > 20) {
      setError('Username must be less than 20 characters');
      return;
    }

    // Save username locally
    await storage.setItem('username', trimmedUsername);
    
    // Navigate to home
    router.replace('/home');
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={Keyboard.dismiss}
          style={styles.content}
        >
          <View style={styles.logoContainer}>
            <MaterialIcons name="grid-on" size={80} color="#e94560" />
            <Text style={styles.title}>Ancient Puzzle</Text>
            <Text style={styles.subtitle}>Match the sacred symbols</Text>
          </View>

          <View style={styles.inputBox}>
            <Text style={styles.welcomeText}>Welcome, Adventurer!</Text>
            <Text style={styles.descriptionText}>
              Enter your name to begin your journey
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter your username"
              placeholderTextColor="#a8b2d1"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                setError('');
              }}
              maxLength={20}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleStart}
            />

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStart}
            >
              <MaterialIcons name="play-arrow" size={24} color="#fff" />
              <Text style={styles.startButtonText}>Start Playing</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footerText}>
            Your journey through ancient mysteries awaits
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#e94560',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#a8b2d1',
    marginTop: 8,
    textAlign: 'center',
  },
  inputBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(233, 69, 96, 0.2)',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#a8b2d1',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(233, 69, 96, 0.3)',
    marginBottom: 16,
  },
  errorText: {
    color: '#e94560',
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#e94560',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 12,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footerText: {
    fontSize: 12,
    color: '#a8b2d1',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
