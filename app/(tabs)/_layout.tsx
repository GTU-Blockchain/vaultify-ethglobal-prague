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
          <Tabs.Screen name="chat" />
          <Tabs.Screen name="camera" />
          <Tabs.Screen name="location" />
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