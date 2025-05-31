import { useRouter } from 'expo-router';
import React from 'react';
import { useColorScheme } from 'react-native';
import { Header } from './Header';

export const NavigationHeader = () => {
  const colorScheme = useColorScheme();
  const router = useRouter();

  const handleConnectWallet = () => {
    // Dashboard'a yönlendir
    router.push('/dashboard');
  };

  const handleToggleTheme = () => {
    // TODO: Implement theme toggle logic
    console.log('Toggle theme pressed');
  };

  return (
    <Header
      onConnectWallet={handleConnectWallet}
      onToggleTheme={handleToggleTheme}
    />
  );
};