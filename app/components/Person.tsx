import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface PersonProps {
  name: string;
  imageUrl?: string;
  subtitle?: string;
  lastInteraction?: string;
  transactionCount?: number;
  isIncoming?: boolean;
  isOutgoing?: boolean;
  onPress?: () => void;
}

export default function Person({ 
  name, 
  imageUrl, 
  subtitle, 
  lastInteraction, 
  transactionCount, 
  isIncoming, 
  isOutgoing, 
  onPress 
}: PersonProps) {
  const { colors } = useTheme();

  const getInteractionIcons = () => {
    const icons = [];
    if (isIncoming) {
      icons.push(
        <Ionicons 
          key="incoming" 
          name="arrow-down" 
          size={12} 
          color="#8AAFDE" 
          style={styles.interactionIcon}
        />
      );
    }
    if (isOutgoing) {
      icons.push(
        <Ionicons 
          key="outgoing" 
          name="arrow-up" 
          size={12} 
          color="#FF9800" 
          style={styles.interactionIcon}
        />
      );
    }
    return icons;
  };

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
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.textContainer}>
          <View style={styles.nameRow}>
            <View style={styles.nameContainer}>
              <Text 
                style={[styles.name, { color: colors.text }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {name}
              </Text>
              {/* Show username badge if available and different from name */}
              {subtitle && subtitle.includes('0x') && name !== subtitle && (
                <View style={[styles.usernameBadge, { backgroundColor: colors.tint + '20' }]}>
                  <Text style={[styles.usernameBadgeText, { color: colors.tint }]}>
                    @{name}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.interactionIcons}>
              {getInteractionIcons()}
            </View>
          </View>
          
          {subtitle && (
            <Text 
              style={[styles.subtitle, { color: colors.text + '80' }]}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {subtitle}
            </Text>
          )}
          
          <View style={styles.bottomRow}>
            {transactionCount && (
              <Text style={[styles.transactionCount, { color: colors.text + '60' }]}>
                {transactionCount} transaction{transactionCount !== 1 ? 's' : ''}
              </Text>
            )}
            {lastInteraction && (
              <Text 
                style={[styles.lastInteraction, { color: colors.text + '60' }]}
                numberOfLines={1}
              >
                {lastInteraction}
              </Text>
            )}
          </View>
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
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  interactionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  interactionIcon: {
    marginLeft: 4,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  transactionCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  lastInteraction: {
    fontSize: 12,
    flex: 1,
    textAlign: 'right',
  },
  usernameBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  usernameBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
