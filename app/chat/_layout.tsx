import { Stack } from 'expo-router';

import { useTheme } from '../context/ThemeContext';

export default function ChatLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        contentStyle: {
          backgroundColor: 'transparent'
        }}}
    />
  );
}