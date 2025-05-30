import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { useFCL } from '../context/FCLContext';

interface NearbyUser {
  id: string;
  address: string;
  distance: number;
  lastActive: Date;
}

const LocationScreen: React.FC = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const { user } = useFCL();

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to see nearby users.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setLocation(location);

      // TODO: Fetch nearby users from backend
      // This is mock data for now
      setNearbyUsers([
        {
          id: '1',
          address: '0x123...',
          distance: 0.5,
          lastActive: new Date(),
        },
        {
          id: '2',
          address: '0x456...',
          distance: 1.2,
          lastActive: new Date(),
        },
      ]);
    })();
  }, []);

  const renderNearbyUser = ({ item }: { item: NearbyUser }) => (
    <TouchableOpacity style={styles.userItem}>
      <View style={styles.userContent}>
        <View style={styles.userInfo}>
          <Text style={styles.address}>{item.address}</Text>
          <Text style={styles.distance}>{item.distance.toFixed(1)} km away</Text>
        </View>
        <TouchableOpacity
          style={styles.sendButton}
          onPress={() => {
            // Navigate to camera screen with pre-filled recipient
          }}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nearby Users</Text>
        <Text style={styles.subtitle}>
          {location ? 'Location services active' : 'Getting location...'}
        </Text>
      </View>
      <FlatList
        data={nearbyUsers}
        renderItem={renderNearbyUser}
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
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
  },
  userItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flex: 1,
  },
  address: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  distance: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LocationScreen; 