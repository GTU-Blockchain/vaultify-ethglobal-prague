import { router } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNavBar } from '../components/BottomNavBar';
import { Colors } from '../constants/Colors';

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

  // Mock vault data (sonra blockchain'den alınacak)
  const vaults = [
    { date: '2025-06-01', unlocked: true },
    { date: '2025-06-03', unlocked: false },
    { date: '2025-06-07', unlocked: true },
  ];

  // Takvimde işaretlenecek günler (açık: pastel yeşil, kapalı: pastel kırmızı)
  const markedDates = vaults.reduce((acc, v) => {
    acc[v.date] = {
      selected: true,
      selectedColor: v.unlocked ? '#A8E6CF' : '#FF8B94',
      selectedTextColor: '#333',
      // marked ve dotColor kaldırıldı, nokta çıkmasın diye
    };
    return acc;
  }, {} as Record<string, any>);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>  
     
      {/* Dashboard Image */}
      <View style={styles.imageContainer}>
        <Image
          source={require('../../assets/images/vault-illustration.png')}
          style={[styles.dashboardImage, { width: '100%', maxWidth: 400, height: 180 }]}
          resizeMode="contain"
        />
      </View>
    {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Jessica's Dashboard</Text>
      </View>
      {/* Account Info */}
      <View style={styles.infoRow}>
        <Text style={[styles.infoLabel, { color: colors.text }]}>Wallet</Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>{user.wallet}</Text>
      </View>
    {/* Takvim */}
      <View style={styles.calendarContainer}>
        <Calendar
          markedDates={markedDates}
          theme={{
            backgroundColor: colors.background,
            calendarBackground: colors.background,
            textSectionTitleColor: colors.text,
            selectedDayBackgroundColor: '#A8E6CF',
            selectedDayTextColor: '#333',
            todayTextColor: colors.tint,
            dayTextColor: colors.text,
            textDisabledColor: '#d9e1e8',
            dotColor: 'transparent',
            arrowColor: colors.tint,
            monthTextColor: colors.text,
            indicatorColor: colors.tint,
            textDayFontWeight: 'bold',
            textDayFontSize: 18,
            textDayStyle: { textAlign: 'center', alignSelf: 'center', justifyContent: 'center', marginTop: 2 },
            // marginTop ile yuvarlakları aşağı kaydırdık
            selectedDotColor: 'transparent',
          }}
        />
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
    marginBottom: 16,
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
  calendarContainer: {
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
});
