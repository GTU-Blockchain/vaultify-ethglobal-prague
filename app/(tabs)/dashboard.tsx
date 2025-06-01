import React, { useEffect, useState } from 'react';
import { FlatList, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { blockscoutService } from '../services/BlockscoutService';
import { vaultService } from '../services/VaultService';
import { walletConnectService } from '../services/WalletConnectService';

interface VaultData {
  id: number;
  senderUsername: string;
  recipientUsername: string;
  ipfsCID: string;
  message: string;
  flowAmount: string;
  createdAt: number;
  unlockAt: number;
  isOpened: boolean;
  snapType: number;
}

export default function DashboardScreen() {
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({
    username: '',
    displayName: '',
    wallet: '',
  });
  const [vaults, setVaults] = useState<VaultData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showArchiveCalendar, setShowArchiveCalendar] = useState(false);

  // Months and years
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const today = new Date();
  const yearRange = Array.from({ length: 3 }, (_, i) => today.getFullYear() - i).reverse();

  useEffect(() => {
    if (walletConnectService.isWalletConnected()) {
      loadData();
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const address = walletConnectService.getCurrentAddress();
      if (!address) return;

      // Get user data
      const username = await vaultService.getCurrentUsername();
      setUser({
        username: username || '',
        displayName: username || '',
        wallet: blockscoutService.formatAddress(address),
      });

      // Get vaults
      const [receivedVaults, sentVaults] = await Promise.all([
        vaultService.getReceivedVaults(),
        vaultService.getSentVaults()
      ]);

      console.log(`📥 Found ${receivedVaults.length} received vaults`);
      console.log(`📤 Found ${sentVaults.length} sent vaults`);

      // Combine and sort vaults
      const allVaults = [...receivedVaults, ...sentVaults].sort((a, b) => b.createdAt - a.createdAt);
      setVaults(allVaults);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create marked dates for calendar
  const markedDates = vaults.reduce((acc, vault) => {
    const isSent = vault.senderUsername.toLowerCase() === user.username.toLowerCase();
    const isReceived = !isSent;
    const isLocked = !vault.isOpened;

    // For sent vaults, use creation date
    // For received vaults, use unlock date if locked, creation date if unlocked
    const date = new Date(
      (isReceived && isLocked ? vault.unlockAt : vault.createdAt) * 1000
    ).toISOString().split('T')[0];

    // If we already have a vault for this date, keep the existing one
    if (acc[date]) return acc;

    acc[date] = {
      selected: true,
      selectedColor: isSent 
        ? '#4A90E2' // Blue for sent
        : isLocked 
          ? '#FF8B94' // Red for locked received
          : '#A8E6CF', // Green for unlocked received
      selectedTextColor: '#222',
      dotColor: isSent 
        ? '#4A90E2' // Blue for sent
        : isLocked 
          ? '#FF8B94' // Red for locked received
          : '#A8E6CF', // Green for unlocked received
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
    return vaults
      .filter(vault => {
        const isSent = vault.senderUsername.toLowerCase() === user.username.toLowerCase();
        const isLocked = !vault.isOpened;
        const date = new Date(
          (!isSent && isLocked ? vault.unlockAt : vault.createdAt) * 1000
        );
        return date.getFullYear() === year && date.getMonth() === month;
      })
      .map(vault => {
        const isSent = vault.senderUsername.toLowerCase() === user.username.toLowerCase();
        const isLocked = !vault.isOpened;
        const date = new Date(
          (!isSent && isLocked ? vault.unlockAt : vault.createdAt) * 1000
        );
        return {
          day: date.getDate(),
          isSent,
          isLocked,
          vaultId: vault.id,
          unlockAt: vault.unlockAt,
          createdAt: vault.createdAt
        };
      });
  }

  const WeekDayHeader = () => {
    const { colors } = useTheme();
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 8 }}>
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => (
          <Text 
            key={day} 
            style={{ 
              color: colors.text, 
              width: 32, 
              textAlign: 'center', 
              fontWeight: '500',
              fontSize: 12,
              opacity: 0.8
            }}
            numberOfLines={1}
          >
            {day}
          </Text>
        ))}
      </View>
    );
  };

  interface CalendarDayProps {
    date?: DateData;
    state?: string;
    marking?: {
      selected?: boolean;
      selectedColor?: string;
      selectedTextColor?: string;
    };
    theme?: {
      textDisabledColor?: string;
      todayTextColor?: string;
      dayTextColor?: string;
      textDayFontSize?: number;
    };
    onPress?: () => void;
  }

  const CalendarDay: React.FC<CalendarDayProps> = ({ date, state, marking, theme, onPress }) => {
    if (!date) return null;
    
    return (
      <TouchableOpacity
        onPress={onPress}
        style={{
          width: 32,
          height: 32,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 16,
          backgroundColor: marking?.selected ? marking.selectedColor : 'transparent'
        }}
      >
        <Text style={{
          color: marking?.selected ? marking.selectedTextColor : 
                 state === 'disabled' ? theme?.textDisabledColor :
                 state === 'today' ? theme?.todayTextColor : 
                 theme?.dayTextColor,
          fontWeight: marking?.selected ? 'bold' : 'normal',
          fontSize: theme?.textDayFontSize || 16
        }}>
          {date.day}
        </Text>
      </TouchableOpacity>
    );
  };

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
          <Text style={[styles.headerTitle, { color: colors.text }]}>{user.displayName}'s Dashboard</Text>
        </View>
        {/* Account Info */}
        <View style={[styles.infoContainer, { 
          backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          borderColor: colors.icon + '20'
        }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.text }]}>Wallet</Text>
            <Text 
              style={[styles.infoValue, { color: colors.text }]}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {user.wallet}
            </Text>
          </View>
        </View>
        {/* Calendar */}
        <View style={[styles.calendarContainer, { 
          backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          borderColor: colors.icon + '20'
        }]}>  
          {/* Calendar header */}
          <TouchableWithoutFeedback onPress={handleMonthTitlePress}>
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}> 
                Memory Lane
              </Text>
            </View>
          </TouchableWithoutFeedback>
          <Calendar
            current={calendarMonth}
            markedDates={markedDates}
            style={{ 
              width: '100%', 
              alignSelf: 'center', 
              minHeight: 320, 
              flexGrow: 1,
              backgroundColor: 'transparent'
            }}
            theme={{
              backgroundColor: 'transparent',
              calendarBackground: 'transparent',
              textSectionTitleColor: colors.text,
              selectedDayBackgroundColor: theme === 'dark' ? '#A8E6CF' : '#4A90E2',
              selectedDayTextColor: theme === 'dark' ? '#333' : '#fff',
              todayTextColor: colors.tint,
              dayTextColor: theme === 'dark' ? '#fff' : colors.text,
              textDisabledColor: theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)',
              dotColor: 'transparent',
              arrowColor: theme === 'dark' ? '#fff' : colors.text,
              monthTextColor: colors.text,
              indicatorColor: colors.tint,
              textDayFontWeight: 'bold',
              textDayFontSize: 18,
              textMonthFontSize: 24,
              textMonthFontWeight: '800',
              textDayHeaderFontSize: 14,
              textDayHeaderFontWeight: '600',
            }}
            renderHeader={(date?: any) => {
              if (!date) return null;
              const month = monthNames[date.getMonth()];
              const year = date.getFullYear();
              return (
                <View style={{ 
                  flexDirection: 'row', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  paddingVertical: 8
                }}>
                  <Text style={{ 
                    fontSize: 24, 
                    fontWeight: '800', 
                    color: theme === 'dark' ? '#fff' : colors.text 
                  }}>
                    {month} {year}
                  </Text>
                </View>
              );
            }}
            dayComponent={({ date, state, marking }) => (
              <CalendarDay
                date={date}
                state={state}
                marking={marking}
                theme={{
                  textDisabledColor: theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)',
                  todayTextColor: colors.tint,
                  dayTextColor: theme === 'dark' ? '#fff' : colors.text,
                  textDayFontSize: 18
                }}
              />
            )}
            onMonthChange={date => {
              setSelectedMonth(date.month - 1); 
              setSelectedYear(date.year);
            }}
            hideExtraDays={false}
            enableSwipeMonths={true}
          />
        </View>
        {/* Archive calendar modal */}
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
                  <Text style={[{ color: colors.text, fontSize: 24, fontWeight: '300' }]}>✕</Text>
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
                  const monthDate = `${item.year}-${String(item.month + 1).padStart(2, '0')}-01`;
                  const monthMarkedDates = Object.entries(markedDates)
                    .filter(([date]) => date.startsWith(`${item.year}-${String(item.month + 1).padStart(2, '0')}`))
                    .reduce((acc, [date, marking]) => ({ ...acc, [date]: marking }), {});

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
                      <WeekDayHeader />
                      <Calendar
                        current={monthDate}
                        markedDates={monthMarkedDates}
                        style={{ 
                          width: '100%', 
                          alignSelf: 'center',
                          backgroundColor: 'transparent'
                        }}
                        theme={{
                          backgroundColor: 'transparent',
                          calendarBackground: 'transparent',
                          textSectionTitleColor: colors.text,
                          selectedDayBackgroundColor: theme === 'dark' ? '#A8E6CF' : '#4A90E2',
                          selectedDayTextColor: theme === 'dark' ? '#333' : '#fff',
                          todayTextColor: colors.tint,
                          dayTextColor: colors.text,
                          textDisabledColor: theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                          dotColor: 'transparent',
                          arrowColor: colors.text,
                          monthTextColor: 'transparent',
                          indicatorColor: colors.tint,
                          textDayFontWeight: 'bold',
                          textDayFontSize: 18,
                          textMonthFontSize: 18,
                          textMonthFontWeight: 'bold',
                          textDayHeaderFontSize: 14,
                          textDayHeaderFontWeight: '600',
                        }}
                        dayComponent={({ date, state, marking }) => (
                          <CalendarDay
                            date={date}
                            state={state}
                            marking={marking}
                            theme={{
                              textDisabledColor: theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                              todayTextColor: colors.tint,
                              dayTextColor: colors.text,
                              textDayFontSize: 18
                            }}
                          />
                        )}
                        hideExtraDays={false}
                        disableAllTouchEventsForDisabledDays={true}
                        disableAllTouchEventsForInactiveDays={true}
                        hideArrows={true}
                        hideDayNames={true}
                      />
                    </View>
                  );
                }}
              />
            </View>
          </View>
        </Modal>
      </ScrollView>
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
    maxWidth: '70%',
  },
  calendarContainer: {
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 16,
    borderWidth: 1,
  },
});
