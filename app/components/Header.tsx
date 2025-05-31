import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  onConnectWallet: () => void;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onConnectWallet, onToggleTheme }) => {
  const { theme, colors, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.header, 
      { 
        backgroundColor: colors.background,
        paddingTop: Platform.OS === 'ios' ? insets.top : StatusBar.currentHeight,
      }
    ]}>
      <View style={styles.leftSection}>
        <TouchableOpacity 
          style={styles.themeButton}
          onPress={toggleTheme}
        >
          <Ionicons 
            name={theme === 'dark' ? 'sunny-outline' : 'moon-outline'} 
            size={24} 
            color={colors.text} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.centerSection}>
        <Text style={[styles.title, { color: colors.text }]}>Vaultify</Text>
      </View>

      <View style={styles.rightSection}>
        <TouchableOpacity 
          style={[styles.walletButton, { borderColor: colors.icon }]}
          onPress={onConnectWallet}
        >
          <Ionicons name="wallet-outline" size={20} color={colors.text} />
          <Text style={[styles.walletText, { color: colors.text }]}>Connect</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    minHeight: 70,
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  walletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 80,
    justifyContent: 'center',
  },
  walletText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  themeButton: {
    padding: 8,
    borderRadius: 8,
    minWidth: 40,
    alignItems: 'center',
  },
});