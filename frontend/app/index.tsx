import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { router } from "expo-router";
import { storage } from "@/src/utils/storage";

export default function Index() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUsername();
  }, []);

  const checkUsername = async () => {
    try {
      const username = await storage.getItem('username', null);
      
      if (username) {
        router.replace('/home');
      } else {
        router.replace('/username');
      }
    } catch (error) {
      console.error('Error checking username:', error);
      router.replace('/username');
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner while checking username
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#e94560" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
    justifyContent: "center",
  },
});
