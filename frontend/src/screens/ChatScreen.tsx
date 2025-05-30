import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFCL } from '../context/FCLContext';
import { format } from 'date-fns';

interface TimeCapsule {
  id: string;
  recipient: string;
  message: string;
  photoHash: string;
  unlockTime: Date;
  amount: number;
  isUnlocked: boolean;
}

const ChatScreen: React.FC = () => {
  const [timeCapsules, setTimeCapsules] = useState<TimeCapsule[]>([]);
  const navigation = useNavigation();
  const { user } = useFCL();

  useEffect(() => {
    // TODO: Fetch time capsules from Flow blockchain
    // This is a mock data for now
    setTimeCapsules([
      {
        id: '1',
        recipient: '0x123...',
        message: 'Happy Birthday!',
        photoHash: 'Qm...',
        unlockTime: new Date('2024-12-31'),
        amount: 0.1,
        isUnlocked: false,
      },
      // Add more mock data as needed
    ]);
  }, []);

  const renderTimeCapsule = ({ item }: { item: TimeCapsule }) => (
    <TouchableOpacity
      style={styles.capsuleItem}
      onPress={() => navigation.navigate('TimeCapsuleDetail', { capsule: item })}
    >
      <View style={styles.capsuleContent}>
        <Image
          source={{ uri: `https://ipfs.io/ipfs/${item.photoHash}` }}
          style={styles.thumbnail}
        />
        <View style={styles.capsuleInfo}>
          <Text style={styles.recipient}>To: {item.recipient}</Text>
          <Text style={styles.message} numberOfLines={1}>
            {item.message}
          </Text>
          <Text style={styles.unlockTime}>
            Unlocks: {format(item.unlockTime, 'MMM dd, yyyy')}
          </Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={styles.amount}>{item.amount} FLOW</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={timeCapsules}
        renderItem={renderTimeCapsule}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    padding: 16,
  },
  capsuleItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  capsuleContent: {
    flexDirection: 'row',
    padding: 12,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  capsuleInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  recipient: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  message: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  unlockTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  amountContainer: {
    justifyContent: 'center',
    marginLeft: 12,
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});

export default ChatScreen; 