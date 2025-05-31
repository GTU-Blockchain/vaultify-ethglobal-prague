import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface PersonProps {
  name: string;
  imageUrl?: string;
  onPress?: () => void;
}

export default function Person({ name, imageUrl, onPress }: PersonProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: colors.background }]} 
      onPress={onPress}
    >
      <View style={styles.personRow}>
        {imageUrl ? (
          <Image 
            source={{ uri: imageUrl }} 
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.tint }]}>
            <Text style={[styles.avatarText, { color: colors.background }]}>
              {name.charAt(0)}
            </Text>
          </View>
        )}
        <View style={styles.textContainer}>
          <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
          <Text style={[styles.tapText, { color: colors.icon }]}>Tap to view</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
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
    fontWeight: '600',
  },
  tapText: {
    fontSize: 14,
    marginTop: 2,
  },
});
