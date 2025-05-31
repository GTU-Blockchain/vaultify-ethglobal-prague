import { router } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
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

  // Mock vault data (will be fetched from blockchain later)
  const vaults = [
    { date: '2025-06-01', unlocked: true },
    { date: '2025-06-03', unlocked: false },
    { date: '2025-06-07', unlocked: true },
  ];
  // Months and years
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [showArchiveCalendar, setShowArchiveCalendar] = useState(false);

  // Yıl aralığı (örnek: son 3 yıl)
  const yearRange = Array.from({ length: 3 }, (_, i) => today.getFullYear() - i).reverse();

  // Takvimde işaretlenecek günler (açık: pastel yeşil, kapalı: pastel kırmızı)
  const markedDates = vaults.reduce((acc, v) => {
    acc[v.date] = {
      selected: true,
      selectedColor: theme === 'dark' ? '#A8E6CF' : '#4A90E2',
      selectedTextColor: theme === 'dark' ? '#333' : '#fff',
    };
    return acc;
  }, {} as Record<string, any>);

  // Seçili ay ve yıl için takvim başlangıcı
  const calendarMonth = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;

  // Ay başlığına tıklayınca modal açılır
  const handleMonthTitlePress = () => setShowArchiveCalendar(true);

  // Modal kapatılır ve ay seçilirse ana takvim güncellenir
  const handleSelectMonth = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
    setShowArchiveCalendar(false);
  };
  // Create calendar days (week starts on Monday)
  function getMonthMatrix(year: number, month: number) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const matrix = [];
    let week = [];
    let dayOfWeek = (firstDay.getDay() + 6) % 7; // Monday=0
    for (let i = 0; i < dayOfWeek; i++) week.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      week.push(d);
      if (week.length === 7) {
        matrix.push(week);
        week = [];
      }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      matrix.push(week);
    }
    return matrix;
  }
  // Group vault days by month
  function getVaultDaysByMonth(year: number, month: number) {
    // Return the days in the given year and month from the vaults array
    return vaults
      .filter(v => {
        const d = new Date(v.date);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .map(v => ({
        day: new Date(v.date).getDate(),
        unlocked: v.unlocked
      }));
  }

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
          {/* Takvim başlığı */}
          <TouchableWithoutFeedback onPress={handleMonthTitlePress}>
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>
                {monthNames[selectedMonth]} {selectedYear}
              </Text>
            </View>
          </TouchableWithoutFeedback>
          <Calendar
            current={calendarMonth}
            markedDates={markedDates}
            style={{ width: '100%', alignSelf: 'center', minHeight: 320, flexGrow: 1 }}
            theme={{
              backgroundColor: colors.background,
              calendarBackground: colors.background,
              textSectionTitleColor: colors.text,
              selectedDayBackgroundColor: theme === 'dark' ? '#A8E6CF' : '#4A90E2',
              selectedDayTextColor: theme === 'dark' ? '#333' : '#fff',
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
            onMonthChange={date => {
              setSelectedMonth(date.month - 1);
              setSelectedYear(date.year);
            }}
            hideExtraDays={false}
            enableSwipeMonths={true}
          />
        </View>
        {/* Instagram arşiv takvimi modalı */}
        <Modal
          visible={showArchiveCalendar}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowArchiveCalendar(false)}
        >
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{ flex: 1, paddingTop: insets.top }}>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, marginBottom: 8 }}>
                <TouchableOpacity onPress={() => setShowArchiveCalendar(false)} style={{ padding: 8 }}>
                  <Text style={{ color: colors.text, fontSize: 24 }}>×</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={yearRange.flatMap(year => monthNames.map((m, idx) => ({ year, month: idx, name: m })))}
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
                showsVerticalScrollIndicator={false}
                initialScrollIndex={yearRange.findIndex(y => y === selectedYear) * 12 + selectedMonth}
                getItemLayout={(_, index) => ({ length: 300, offset: 300 * index, index })}
                keyExtractor={item => `${item.year}-${item.month}`}
                renderItem={({ item }) => {
                  const vaultDays = getVaultDaysByMonth(item.year, item.month);
                  const matrix = getMonthMatrix(item.year, item.month);

                  return (
                    <View style={{ 
                      paddingVertical: 16, 
                      backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      marginHorizontal: 16, 
                      marginBottom: 16, 
                      borderRadius: 12,
                      borderWidth: (item.year === selectedYear && item.month === selectedMonth) ? 1 : 0,
                      borderColor: colors.tint,
                    }}>
                      <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 20, textAlign: 'center', marginBottom: 8 }}>{item.name} {item.year}</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, paddingHorizontal: 12 }}>
                        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => (
                          <Text key={day} style={{ color: colors.tabIconDefault, width: 32, textAlign: 'center', fontWeight: 'bold' }}>{day}</Text>
                        ))}
                      </View>
                      {matrix.map((week, wIdx) => (
                        <View key={wIdx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 2 }}>
                          {week.map((day, dIdx) => {
                            const vault = day ? vaultDays.find(v => v.day === day) : null;
                            return (
                              <TouchableOpacity
                                key={dIdx}
                                style={{
                                  width: 32,
                                  height: 32,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: 16,
                                  backgroundColor: vault
                                    ? (vault.unlocked ? '#A8E6CF' : '#FF8B94')
                                    : 'transparent',
                                }}
                                disabled={!vault}
                                onPress={() => vault && handleSelectMonth(item.year, item.month)}
                              >
                                {day && <Text style={{ 
                                  color: vault ? '#222' : colors.text, 
                                  fontWeight: vault ? 'bold' : 'normal',
                                  opacity: vault ? 1 : 0.5 
                                }}>{day}</Text>}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ))}
                    </View>
                  );
                }}
              />
            </View>
          </View>
        </Modal>
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
