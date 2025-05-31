import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';


interface Vault {
  id: string;
  name: string;
  date: string;
  content: string;
  isSent: boolean;
  status?: 'pending' | 'completed';
}

export default function VaultListScreen() {
  const { id, name } = useLocalSearchParams();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();


  // Bu kısım blockchain'den gelecek
  const vaults: Vault[] = [
    { 
      id: '1', 
      name: 'Document Vault', 
      date: '2023-05-31', 
      content: 'Encrypted document data',
      isSent: true,
      status: 'completed'
    },
    { 
      id: '2', 
      name: 'Image Vault', 
      date: '2023-05-30', 
      content: 'Encrypted image data',
      isSent: false,
      status: 'completed'
    },
    { 
      id: '3', 
      name: 'Contract Vault', 
      date: '2023-05-31', 
      content: 'Encrypted contract data',
      isSent: true,
      status: 'pending'
    },
  ];

  const handleCreateVault = () => {
    // Yeni vault oluşturma işlemi burada yapılacak
    console.log('Creating new vault for:', name);
  };

  return (
<View style={[styles.container, { backgroundColor: colors.background }]}>
  <View style={[
    styles.header,
    { borderBottomColor: colors.icon + '20', paddingTop: insets.top }
  ]}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{name}</Text>
      </View>
      
      <ScrollView style={styles.scrollView}>
        {vaults.map((vault) => (
          <TouchableOpacity 
            key={vault.id}
            style={[
              styles.vaultItem, 
              vault.isSent ? styles.sentVault : styles.receivedVault,
              { backgroundColor: colors.tint + '20' }
            ]}
            onPress={() => console.log('Opening vault:', vault.id)}
          >
            <View style={styles.vaultContent}>
              <Text style={[styles.vaultName, { color: colors.text }]}>{vault.name}</Text>
              <View style={styles.vaultInfo}>
                <Text style={[styles.vaultDate, { color: colors.icon }]}>{vault.date}</Text>
                {vault.status === 'pending' && (
                  <Ionicons name="time" size={16} color={colors.icon} style={styles.statusIcon} />
                )}
                {vault.status === 'completed' && (
                  <Ionicons name="checkmark-done" size={16} color={colors.icon} style={styles.statusIcon} />
                )}
              </View>
            </View>
            <Ionicons name="lock-closed" size={24} color={colors.tint} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.tint, bottom: insets.bottom + 20 }]}
        onPress={handleCreateVault}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  vaultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    maxWidth: '75%',
    minWidth: 280,
  },
  sentVault: {
    alignSelf: 'flex-end',
    borderTopRightRadius: 4,
  },
  receivedVault: {
    alignSelf: 'flex-start',
    borderTopLeftRadius: 4,
  },
  vaultContent: {
    flex: 1,
    marginRight: 12,
    minWidth: 0,
  },
  vaultName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    flexShrink: 1,
  },
  vaultInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  vaultDate: {
    fontSize: 12,
    flexShrink: 1,
  },
  statusIcon: {
    marginLeft: 4,
    marginVertical: 2,
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 20,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
