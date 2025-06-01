/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#2E8B57'; // Sea Green
const tintColorDark = '#1756A3'; // Spring Green

export const Colors = {
  light: {
    text: '#1B3B4B', // Dark Blue
    background: '#F0FFF0', // Honeydew
    tint: '#9ED5AC',
    icon: '#2E8B57', // Sea Green
    tabIconDefault: '#4682B4', // Steel Blue
    tabIconSelected: tintColorLight,
      error: '#FFA5A5', // Pastel Red
    success: '#9ED5AC', // Pastel Green'
  },
  dark: {
    text: '#E0FFFF', // Light Cyan
    background: '#0A192F', // Dark Navy Blue
    tint:'#8AAFDE', // Light Sea Green
    icon:'rgb(86, 158, 230)', // Spring Green
    tabIconDefault: '#20B2AA', // Light Sea Green
    tabIconSelected: tintColorDark,
      error: '#FFA5A5', // Pastel Red
    success: '#00FF7F', // Pastel Green
    warning: '#FFD1A1',
  },
};

