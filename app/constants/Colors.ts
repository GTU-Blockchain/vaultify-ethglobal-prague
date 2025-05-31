/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#2E8B57'; // Sea Green
const tintColorDark = '#00FF7F'; // Spring Green

export const Colors = {
  light: {
    text: '#1B3B4B', // Dark Blue
    background: '#F0FFF0', // Honeydew
    tint: tintColorLight,
    icon: '#2E8B57', // Sea Green
    tabIconDefault: '#4682B4', // Steel Blue
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#E0FFFF', // Light Cyan
    background: '#0A192F', // Dark Navy Blue
    tint: tintColorDark,
    icon: '#00FF7F', // Spring Green
    tabIconDefault: '#20B2AA', // Light Sea Green
    tabIconSelected: tintColorDark,
  },
};
