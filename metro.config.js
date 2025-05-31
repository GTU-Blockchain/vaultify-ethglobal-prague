const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add crypto polyfills for React Native
config.resolver.alias = {
  crypto: 'react-native-get-random-values',
  stream: 'react-native-stream',
  buffer: 'buffer',
};

// Add support for mjs files
config.resolver.sourceExts.push('mjs');

module.exports = config; 