import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useFCL } from '../context/FCLContext';
import { format } from 'date-fns';

interface TimeCapsuleDetailProps {
  route: {
    params: {
      capsule: {
        id: string;
        recipient: string;
        message: string;
        photoHash: string;
        unlockTime: Date;
        amount: number;
        isUnlocked: boolean;
      };
    };
  };
}

const TimeCapsuleDetailScreen: React.FC<TimeCapsuleDetailProps> = ({ route }) => {
  const { capsule } = route.params;
  const { user } = useFCL();
  const navigation = useNavigation();

  const handleUnlock = async () => {
    try {
      // TODO: Call Flow contract to unlock the time capsule
      Alert.alert('Success', 'Time capsule unlocked successfully!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to unlock time capsule');
    }
  };

  const isUnlockable = new Date() >= capsule.unlockTime && !capsule.isUnlocked;

  return (
    <ScrollView style={styles.container}>
      <Image
        source={{ uri: `https://ipfs.io/ipfs/${capsule.photoHash}` }}
        style={styles.image}
      />
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>Message</Text>
          <Text style={styles.message}>{capsule.message}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Recipient</Text>
          <Text style={styles.value}>{capsule.recipient}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Amount</Text>
          <Text style={styles.value}>{capsule.amount} FLOW</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Unlock Time</Text>
          <Text style={styles.value}>
            {format(capsule.unlockTime, 'MMMM dd, yyyy HH:mm')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Status</Text>
          <Text style={[
            styles.value,
            { color: capsule.isUnlocked ? '#4CAF50' : '#FFA000' }
          ]}>
            {capsule.isUnlocked ? 'Unlocked' : 'Locked'}
          </Text>
        </View>

        {isUnlockable && (
          <TouchableOpacity
            style={styles.unlockButton}
            onPress={handleUnlock}
          >
            <Text style={styles.unlockButtonText}>Unlock Time Capsule</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  message: {
    fontSize: 18,
    color: '#333',
    lineHeight: 24,
  },
  unlockButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  unlockButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TimeCapsuleDetailScreen; 