import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomNavBar } from '../components/BottomNavBar';
import { NavigationHeader } from '../components/NavigationHeader';
import { Colors } from '../constants/Colors';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <SafeAreaProvider>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <NavigationHeader />
        <Tabs
          screenOptions={{
            tabBarStyle: { display: 'none' },
            headerShown: false,
          }}
          initialRouteName="camera"
        >
          <Tabs.Screen
            name="chat"
            options={{
              title: 'Chat',
              tabBarIcon: ({ color }) => <Ionicons name="chatbubble-outline" size={24} color={color} />,
            }}
          />
          <Tabs.Screen
            name="camera"
            options={{
              title: 'Camera',
              tabBarIcon: ({ color }) => <Ionicons name="camera-outline" size={32} color={color} />,
            }}
          />
          <Tabs.Screen
            name="location"
            options={{
              title: 'Location',
              tabBarIcon: ({ color }) => <Ionicons name="location-outline" size={24} color={color} />,
            }}
          />
        </Tabs>
        <BottomNavBar />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 