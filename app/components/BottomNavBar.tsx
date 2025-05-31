import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

export const BottomNavBar = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isActive = (path: string) => pathname === path;

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: colors.background,
        paddingBottom: Platform.OS === 'ios' ? insets.bottom : 30,
        borderTopColor: colors.icon,
      }
    ]}>
      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => router.push('/(tabs)/chat')}
      >
        <Ionicons 
          name="chatbubble-outline" 
          size={24} 
          color={isActive('/(tabs)/chat') ? colors.tint : colors.icon} 
        />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => router.push('/(tabs)/camera')}
      >
        <Ionicons 
          name="camera-outline" 
          size={32} 
          color={isActive('/(tabs)/camera') ? colors.tint : colors.icon} 
        />
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navItem}
        onPress={() => router.push('/(tabs)/location')}
      >
        <Ionicons 
          name="location-outline" 
          size={24} 
          color={isActive('/(tabs)/location') ? colors.tint : colors.icon} 
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: '2%',
    borderTopWidth: 1,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: 60,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  navItem: {
    padding: '2%',
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
  },
});