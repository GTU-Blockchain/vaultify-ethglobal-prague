import { router } from 'expo-router';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNavBar } from '../components/BottomNavBar';
import { useTheme } from '../context/ThemeContext';

export default function DashboardScreen() {
  const { colors, theme } = useTheme();
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
    };
    return acc;
  }, {} as Record<string, any>);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>  
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        {/* Dashboard Image */}
        <View style={[styles.imageContainer, { paddingTop: 8 }]}>
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
        <View style={[styles.infoContainer, { 
          backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          borderColor: colors.icon + '20'
        }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.text }]}>Wallet</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{user.wallet}</Text>
          </View>
        </View>
        {/* Takvim */}
        <View style={[styles.calendarContainer, { 
          backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          borderColor: colors.icon + '20'
        }]}>
          <Calendar
            markedDates={markedDates}
            style={{ width: '100%', alignSelf: 'center', minHeight: 320, flexGrow: 1 }}
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
              selectedDotColor: 'transparent',
            }}
          />
        </View>
        {/* Disconnect Wallet Button */}
        <View style={[styles.disconnectButtonContainerFixed, { marginBottom: insets.bottom + 16 }]}> 
          <TouchableOpacity 
            style={[
              styles.disconnectButton, 
              { 
                backgroundColor: theme === 'dark' ? colors.tint + '20' : '#4A90E2',
                borderColor: colors.icon + '30'
              }
            ]}
            onPress={() => router.push('/dashboard')}
          >  
            <Text style={[styles.disconnectText, { color: 'white' }]}>Disconnect Wallet</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <BottomNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  dashboardImage: {
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    height: 180,
  },
  infoContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '400',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  disconnectButtonContainerFixed: {
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 90,
  },
  disconnectButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    minWidth: 180,
    alignItems: 'center',
    borderWidth: 1,
  },
  disconnectText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  calendarContainer: {
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 16,
    borderWidth: 1,
  },
});
