import React from 'react';
import { useColorScheme } from 'react-native';
import { Header } from './Header';

export const NavigationHeader = () => {
  const colorScheme = useColorScheme();

  const handleConnectWallet = () => {
    // TODO: Implement wallet connection logic
    console.log('Connect wallet pressed');
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