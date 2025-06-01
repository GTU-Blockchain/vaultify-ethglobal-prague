import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useWalletConnect } from '../hooks/useWalletConnect';

export default function Index() {
  const { isConnected, isLoading } = useWalletConnect();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Redirect href={{ pathname: "/(tabs)/camera" as const }} />;
}