import { getRandomValues } from 'expo-crypto';
import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from './constants/Colors';
import { ThemeProvider } from './context/ThemeContext';

// Polyfill crypto.getRandomValues
if (typeof global.crypto === 'undefined') {
  (global as any).crypto = {
    getRandomValues: getRandomValues,
    subtle: undefined,
    randomUUID: undefined
  };
}

// Singleton to prevent multiple initializations
let walletConnectInitialized = false;

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Deep link handler for MetaMask return
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      console.log('Received deep link:', url);
      // Handle the deep link here if needed
    };

    // Add listener for when app is already open
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Handle deep link when app is opened from closed state
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Initialize WalletConnect only once
  useEffect(() => {
    const initializeApp = async () => {
      if (walletConnectInitialized) {
        setIsReady(true);
        return;
      }

      try {
        // Import the service dynamically to avoid circular imports
        const { walletConnectService } = await import('./services/WalletConnectService');
        await walletConnectService.initializeWalletConnect();
        console.log('WalletConnect initialized successfully');
        walletConnectInitialized = true;
      } catch (error) {
        console.error('WalletConnect initialization failed:', error);
        // Continue anyway, user can try to connect manually
        walletConnectInitialized = true;
      } finally {
        setIsReady(true);
      }
    };

    initializeApp();
  }, []);

  if (!isReady) {
    return (
      <ThemeProvider>
        <SafeAreaProvider>
          <View style={styles.container}>
            {/* Add a loading spinner or splash screen here if needed */}
          </View>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <Stack 
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: colors.background
            }
          }}
        />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});