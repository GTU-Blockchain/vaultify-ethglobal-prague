import { router } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNavBar } from './components/BottomNavBar';
import { NavigationHeader } from './components/NavigationHeader';
import { Colors } from './constants/Colors';

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  // Demo user data
  const user = {
    username: 'jessica.w',
    displayName: 'Jessica',
    wallet: '0xA1b2...C3d4',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>  
      {/* Header kaldırıldı, sadece NavigationHeader kullanılacak */}
      <NavigationHeader />
      {/* Dashboard Image */}
      <View style={styles.imageContainer}>
        <Image
          source={require('../assets/images/vault-illustration.png')}
          style={[styles.dashboardImage, { width: '100%', maxWidth: 400, height: 180 }]}
          resizeMode="contain"
        />
      </View>
      {/* Account Info */}
      <View style={styles.infoRow}>
        <Text style={[styles.infoLabel, { color: colors.text }]}>Display Name</Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>{user.displayName}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={[styles.infoLabel, { color: colors.text }]}>Username</Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>{user.username}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={[styles.infoLabel, { color: colors.text }]}>Wallet</Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>{user.wallet}</Text>
      </View>
      {/* Disconnect Wallet Button */}
      <View style={styles.disconnectButtonContainer}>
        <TouchableOpacity style={[styles.disconnectButton, { backgroundColor: colors.tabIconDefault }]}
          onPress={() => router.push('/dashboard')}
        >  
          <Text style={[styles.disconnectText, { color: colors.text }]}>Disconnect Wallet</Text>
        </TouchableOpacity>
      </View>
      <BottomNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  headerRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  dashboardImage: {
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    height: 180,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '400',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  avatarContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 22,
  },
  disconnectButtonContainer: {
    width: '100%',
    alignItems: 'center',
    position: 'absolute',
    bottom: 100, // BottomNavBar'ın üstünde kalacak şekilde
    left: 0,
    right: 0,
    zIndex: 2,
  },
  disconnectButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    minWidth: 180,
    alignItems: 'center',
  },
  disconnectText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
});
