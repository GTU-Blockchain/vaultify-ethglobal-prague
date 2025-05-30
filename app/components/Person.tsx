import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../constants/Colors';

interface PersonProps {
  name: string;
  imageUrl?: string;
  onPress?: () => void;
}

export default function Person({ name, imageUrl, onPress }: PersonProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
    >
      <View style={styles.personRow}>
        {imageUrl ? (
          <Image 
            source={{ uri: imageUrl }} 
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.tabIconDefault }]}>
            <Text style={[styles.avatarText, { color: colors.background }]}>
              {name.charAt(0)}
            </Text>
          </View>
        )}
        <View style={styles.textContainer}>
          <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
          <Text style={[styles.tapText, { color: colors.tabIconDefault }]}>Tap to view</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  textContainer: {
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
  },
  tapText: {
    fontSize: 14,
    marginTop: 2,
  },
});
