import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { vaultService } from '../services/VaultService';
import { walletConnectService } from '../services/WalletConnectService';

interface Vault {
  id: string;
  name: string;
  date: string;
  content: string;
  isSent: boolean;
  status: 'pending' | 'completed';
}

export default function VaultListScreen() {
  const { id, name } = useLocalSearchParams();
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdownModalVisible, setCountdownModalVisible] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    if (walletConnectService.isWalletConnected()) {
      loadVaults();
    }
  }, []);

  const loadVaults = async () => {
    try {
      setLoading(true);
      console.log('📱 Loading vaults from blockchain...');
      
      // Get both received and sent vaults
      const [receivedVaults, sentVaults] = await Promise.all([
        vaultService.getReceivedVaults(),
        vaultService.getSentVaults()
      ]);
      
      console.log(`📥 Received ${receivedVaults.length} vaults`);
      console.log(`📤 Sent ${sentVaults.length} vaults`);

      // Filter vaults by the specific chat participant
      const filteredReceivedVaults = receivedVaults.filter(vault => 
        vault.senderUsername === name || vault.senderUsername === id
      );
      
      const filteredSentVaults = sentVaults.filter(vault => 
        vault.recipientUsername === name || vault.recipientUsername === id
      );

      console.log(`📥 Filtered received vaults: ${filteredReceivedVaults.length}`);
      console.log(`📤 Filtered sent vaults: ${filteredSentVaults.length}`);

      // Transform vaults into chat messages
      const transformedVaults = [
        ...filteredReceivedVaults.map(vault => ({
          id: vault.id,
          name: vault.senderUsername || 'Unknown Sender',
          date: new Date(vault.createdAt * 1000),
          content: vault.message,
          sent: false,
          opened: vault.isOpened
        })),
        ...filteredSentVaults.map(vault => ({
          id: vault.id,
          name: vault.recipientUsername || 'Unknown Recipient',
          date: new Date(vault.createdAt * 1000),
          content: vault.message,
          sent: true,
          opened: vault.isOpened
        }))
      ].sort((a, b) => a.date.getTime() - b.date.getTime());

      // Transform vault data
      const transformedVaultsData: Vault[] = transformedVaults.map(vault => ({
        id: vault.id.toString(),
        name: vault.name,
        date: new Date(vault.date).toISOString().split('T')[0],
        content: vault.content,
        isSent: vault.sent,
        status: vault.opened ? 'completed' as const : 'pending' as const
      }));

      setVaults(transformedVaultsData);
      console.log(`✅ Loaded ${transformedVaultsData.length} total vaults`);
    } catch (error: any) {
      console.error('❌ Error loading vaults:', error);
      Alert.alert(
        'Error Loading Vaults',
        error.message || 'Failed to load vaults from blockchain. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVault = () => {
    router.push({
      pathname: '/(tabs)/camera',
      params: { username: name, userId: id }
    });
  };

  const handleVaultPress = async (vault: Vault) => {
    try {
      const vaultData = await vaultService.getVault(Number(vault.id));
      if (!vaultData) {
        Alert.alert('Error', 'Could not load vault data');
        return;
      }

      if (vault.isSent && vaultData.recipientUsername !== name) {
        return;
      }

      const canOpen = await vaultService.canOpenVault(Number(vault.id));
      
      if (canOpen) {
        const metadata = await vaultService.getVaultMetadata(vaultData.ipfsCID);
        if (!metadata) {
          Alert.alert('Error', 'Could not load vault metadata');
          return;
        }

        router.push({
          pathname: '/vault/[id]',
          params: {
            id: vault.id,
            content: vaultData.message,
            mediaUrl: metadata.mediaHash ? vaultService.getMediaUrl(metadata.mediaHash) : undefined,
            isOpened: vaultData.isOpened.toString()
          }
        });
      } else {
        const unlockTime = new Date(vaultData.unlockAt * 1000);
        const now = new Date();
        const timeLeft = unlockTime.getTime() - now.getTime();
        
        if (timeLeft > 0) {
          const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
          const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
          
          setCountdown({ days, hours, minutes });
          setCountdownModalVisible(true);
        }
      }
    } catch (error: any) {
      console.error('Error handling vault press:', error);
      Alert.alert('Error', error.message || 'Failed to process vault');
    }
  };

  const CountdownModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={countdownModalVisible}
      onRequestClose={() => setCountdownModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <Ionicons name="lock-closed" size={48} color={colors.tint} style={styles.lockIcon} />
          <Text style={[styles.modalTitle, { color: colors.text }]}>Vault Locked</Text>
          <Text style={[styles.modalSubtitle, { color: colors.text + '80' }]}>
            This vault will unlock in:
          </Text>
          
          <View style={styles.countdownContainer}>
            <View style={styles.countdownItem}>
              <Text style={[styles.countdownNumber, { color: colors.tint }]}>{countdown.days}</Text>
              <Text style={[styles.countdownLabel, { color: colors.text + '80' }]}>Days</Text>
            </View>
            <View style={styles.countdownItem}>
              <Text style={[styles.countdownNumber, { color: colors.tint }]}>{countdown.hours}</Text>
              <Text style={[styles.countdownLabel, { color: colors.text + '80' }]}>Hours</Text>
            </View>
            <View style={styles.countdownItem}>
              <Text style={[styles.countdownNumber, { color: colors.tint }]}>{countdown.minutes}</Text>
              <Text style={[styles.countdownLabel, { color: colors.text + '80' }]}>Minutes</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.tint }]}
            onPress={() => setCountdownModalVisible(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading vaults from blockchain...
        </Text>
      </View>
    );
  }

  if (vaults.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="lock-closed-outline" size={64} color={colors.text + '60'} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          No Vaults Found
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.text + '80' }]}>
          Start creating vaults to see them here
        </Text>
        <TouchableOpacity 
          style={[styles.fab, { backgroundColor: colors.tint }]}
          onPress={handleCreateVault}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>
    );
  }

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
              { 
                backgroundColor: theme === 'dark' 
                  ? vault.isSent ? 'rgba(0, 255, 127, 0.1)' : 'rgba(70, 130, 180, 0.1)'
                  : vault.isSent ? 'rgba(46, 139, 87, 0.08)' : 'rgba(70, 130, 180, 0.08)'
              }
            ]}
            onPress={() => handleVaultPress(vault)}
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
      <CountdownModal />
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
    backgroundColor: 'rgba(46, 139, 87, 0.08)',
  },
  receivedVault: {
    backgroundColor: 'rgba(70, 130, 180, 0.08)',
  },
  vaultContent: {
    flex: 1,
  },
  vaultName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  vaultInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vaultDate: {
    fontSize: 14,
  },
  statusIcon: {
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  lockIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  countdownContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 24,
  },
  countdownItem: {
    alignItems: 'center',
  },
  countdownNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  countdownLabel: {
    fontSize: 14,
  },
  closeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
