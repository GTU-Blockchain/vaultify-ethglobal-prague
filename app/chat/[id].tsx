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
  const { colors, theme } = useTheme();
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
    // Kameraya yönlendir, kullanıcı bilgilerini gönder
    router.push({
      pathname: '/(tabs)/camera',
      params: { username: name, userId: id }
    });
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
        {vaults.map((vault) => (          <TouchableOpacity 
            key={vault.id}
            style={[
              styles.vaultItem, 
              vault.isSent ? styles.sentVault : styles.receivedVault,
              { 
                backgroundColor: theme === 'dark' 
                  ? vault.isSent ? 'rgba(0, 255, 127, 0.1)' : 'rgba(70, 130, 180, 0.1)'
                  : vault.isSent ? 'rgba(46, 139, 87, 0.08)' : 'rgba(70, 130, 180, 0.08)'
              }
            ]}
            onPress={() => router.push(`/vault/${vault.id}`)}
          >
            <View style={styles.vaultContent}>
              <Text style={[styles.vaultName, { color: colors.text }]}>{vault.name}</Text>
              <View style={styles.vaultInfo}>
                <Text style={[styles.vaultDate, { color: colors.icon }]}>{vault.date}</Text>
                {vault.status === 'pending' && (
                  <Ionicons name="time" size={18} color={colors.icon} style={styles.statusIcon} />
                )}
                {vault.status === 'completed' && (
                  <Ionicons name="checkmark-done" size={18} color={colors.icon} style={styles.statusIcon} />
                )}
              </View>
            </View>
            <View style={{ opacity: 0.9 }}>
              <Ionicons 
                name={vault.status === 'completed' ? "lock-closed" : "time-outline"} 
                size={28} 
                color={colors.icon} 
              />
            </View>
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
  },  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  vaultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    marginVertical: 8,
    borderRadius: 12,
    width: '95%',
    alignSelf: 'center',
  },
  sentVault: {
    backgroundColor: 'rgba(46, 139, 87, 0.08)', // Sea Green with opacity
  },
  receivedVault: {
    backgroundColor: 'rgba(70, 130, 180, 0.08)', // Steel Blue with opacity
  },
  vaultContent: {
    flex: 1,
    marginRight: 16,
  },
  vaultName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  vaultInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vaultDate: {
    fontSize: 13,
    opacity: 0.8,
  },
  statusIcon: {
    marginLeft: 8,
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
