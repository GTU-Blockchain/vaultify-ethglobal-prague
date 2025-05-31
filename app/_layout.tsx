import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './context/ThemeContext';

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
    <ThemeProvider>
      <SafeAreaProvider>
        <Slot />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}