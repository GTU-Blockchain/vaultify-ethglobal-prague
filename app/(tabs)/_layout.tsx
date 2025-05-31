import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { BottomNavBar } from '../components/BottomNavBar';
import { NavigationHeader } from '../components/NavigationHeader';
import { Colors } from '../constants/Colors';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NavigationHeader />
      <View style={styles.content}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: 'none' },
          }}
        >
          <Tabs.Screen
            name="chat"
            options={{
              tabBarIcon: ({ color }) => <Ionicons name="chatbubble-outline" size={24} color={color} />,
            }}
          />
          <Tabs.Screen
            name="camera"
            options={{
              tabBarIcon: ({ color }) => <Ionicons name="camera-outline" size={32} color={color} />,
            }}
          />
          <Tabs.Screen
            name="location"
            options={{
              tabBarIcon: ({ color }) => <Ionicons name="location-outline" size={24} color={color} />,
            }}
          />
        </Tabs>
      </View>
      <BottomNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});