import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { FCLProvider } from './context/FCLContext';
import { Ionicons } from '@expo/vector-icons';

// Screens
import LandingPage from './screens/LandingPage';
import CameraScreen from './screens/CameraScreen';
import ChatScreen from './screens/ChatScreen';
import LocationScreen from './screens/LocationScreen';
import TimeCapsuleDetailScreen from './screens/TimeCapsuleDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Chat Stack Navigator
const ChatStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="ChatList" 
      component={ChatScreen}
      options={{ title: 'Time Capsules' }}
    />
    <Stack.Screen 
      name="TimeCapsuleDetail" 
      component={TimeCapsuleDetailScreen}
      options={{ title: 'Time Capsule Details' }}
    />
  </Stack.Navigator>
);

export default function App() {
  return (
    <FCLProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;

              if (route.name === 'Camera') {
                iconName = focused ? 'camera' : 'camera-outline';
              } else if (route.name === 'Chat') {
                iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              } else if (route.name === 'Location') {
                iconName = focused ? 'location' : 'location-outline';
              }

              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#007AFF',
            tabBarInactiveTintColor: 'gray',
          })}
        >
          <Tab.Screen 
            name="Camera" 
            component={CameraScreen}
            options={{ 
              headerShown: false,
              tabBarLabel: 'Send'
            }}
          />
          <Tab.Screen 
            name="Chat" 
            component={ChatStack}
            options={{ 
              headerShown: false,
              tabBarLabel: 'Time Capsules'
            }}
          />
          <Tab.Screen 
            name="Location" 
            component={LocationScreen}
            options={{ 
              headerShown: false,
              tabBarLabel: 'Nearby'
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </FCLProvider>
  );
} 