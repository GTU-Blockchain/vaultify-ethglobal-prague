import { getRandomValues } from 'expo-crypto';
import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { walletConnectService } from './services/WalletConnectService';

// Polyfill crypto.getRandomValues
if (typeof global.crypto === 'undefined') {
  (global as any).crypto = {
    getRandomValues: getRandomValues,
    subtle: undefined,
    randomUUID: undefined
  };
}

export default function RootLayout() {
  const [walletConnectInitialized, setWalletConnectInitialized] = useState(false);

  // Deep link handler for MetaMask return
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      console.log('Received deep link:', url);
      // TODO: Parse the URL and handle WalletConnect return here if needed
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

  useEffect(() => {
    if (!walletConnectInitialized) {
      initializeWalletConnect();
    }
  }, [walletConnectInitialized]);

  const initializeWalletConnect = async () => {
    try {
      await walletConnectService.initializeWalletConnect();
      console.log('WalletConnect initialized');
      setWalletConnectInitialized(true);
    } catch (error) {
      console.error('WalletConnect initialization failed:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen 
          name="(tabs)" 
          options={{ 
            headerShown: false,
          }} 
        />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 