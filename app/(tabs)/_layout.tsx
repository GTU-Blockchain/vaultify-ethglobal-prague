import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import 'react-native-get-random-values';
import { BottomNavBar } from '../components/BottomNavBar';
import { NavigationHeader } from '../components/NavigationHeader';
import { useTheme } from '../context/ThemeContext';

export default function TabLayout() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NavigationHeader />
      <View style={[styles.content, { backgroundColor: colors.background }]}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: { 
              display: 'none'
            }
          }}
        >
          <Tabs.Screen name="chat" />
          <Tabs.Screen name="camera" />
          <Tabs.Screen name="location" />
          <Tabs.Screen name="dashboard" />
        </Tabs>
      </View>
      <BottomNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    flex: 1
  }
});