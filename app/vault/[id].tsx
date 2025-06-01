import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MediaComponent from '../components/MediaComponent';
import { useTheme } from '../context/ThemeContext';
import { VaultMetadata } from '../services/IPFSService';
import { VaultData, vaultService } from '../services/VaultService';

export default function VaultDetailScreen() {
  const params = useLocalSearchParams();
  const vaultId = typeof params.id === 'string' ? params.id : '';
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [vaultData, setVaultData] = useState<VaultData | null>(null);
  const [metadata, setMetadata] = useState<VaultMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessInfo, setAccessInfo] = useState<{
    canAccess: boolean;
    reason: 'sender' | 'unlocked' | 'locked' | 'not_authorized';
    unlockDate?: Date;
  } | null>(null);

  useEffect(() => {
    loadVaultData();
  }, [vaultId]);

  const loadVaultData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📱 Loading vault data for ID:', vaultId);
      
      if (!vaultId) {
        throw new Error('Invalid vault ID');
      }

      // Load vault data from blockchain
      const vault = await vaultService.getVault(Number(vaultId));
      if (!vault) {
        throw new Error('Vault not found');
      }

      console.log('📦 Vault data loaded:', vault);
      setVaultData(vault);

      // Check access permissions
      const access = await vaultService.canAccessVault(Number(vaultId));
      console.log('🔒 Access info:', access);
      setAccessInfo(access);

      // If user can access vault, load metadata
      if (access.canAccess) {
        console.log('✅ Loading IPFS metadata...');
        const vaultMetadata = await vaultService.getVaultMetadata(vault.ipfsCID);
        
        if (vaultMetadata) {
          console.log('📄 Metadata loaded:', vaultMetadata);
          setMetadata(vaultMetadata);
        } else {
          console.log('⚠️ No metadata found');
        }
      } else {
        console.log('🚫 Access denied, not loading metadata');
      }

    } catch (error: any) {
      console.error('❌ Error loading vault data:', error);
      setError(error.message || 'Failed to load vault data');
    } finally {
      setLoading(false);
    }
  };

  const remainingTime = () => {
    if (!accessInfo || accessInfo.reason !== 'locked' || !accessInfo.unlockDate) {
      return null;
    }
    
    const now = new Date();
    const unlock = accessInfo.unlockDate;
    const diff = unlock.getTime() - now.getTime();
    
    if (diff <= 0) return null;
    
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return `${days} days remaining`;
  };

  const getStatusInfo = () => {
    if (!accessInfo) return { text: 'Loading...', color: '#888' };
    
    switch (accessInfo.reason) {
      case 'sender':
        return { text: 'Sent by You', color: '#4CAF50' };
      case 'unlocked':
        return { text: 'Unlocked', color: '#4CAF50' };
      case 'locked':
        return { text: 'Locked', color: '#FF9800' };
      default:
        return { text: 'No Access', color: '#F44336' };
    }
  };

  const handleOpenVault = async () => {
    try {
      if (!vaultData) return;
      
      const canOpen = await vaultService.canOpenVault(Number(vaultId));
      if (!canOpen) {
        Alert.alert('Cannot Open', 'This vault cannot be opened yet or has already been opened.');
        return;
      }

      Alert.alert(
        'Open Vault',
        `This will open the vault and transfer ${vaultData.flowAmount} FLOW to your wallet. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open', 
            onPress: async () => {
              try {
                setLoading(true);
                const result = await vaultService.openVault(Number(vaultId));
                Alert.alert('Success', `Vault opened! You received ${result.flowAmount} FLOW`);
                // Reload vault data to update status
                await loadVaultData();
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to open vault');
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process vault opening');
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading vault data...
        </Text>
      </View>
    );
  }

  if (error || !vaultData) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.text + '60'} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>
          Error Loading Vault
        </Text>
        <Text style={[styles.errorMessage, { color: colors.text + '80' }]}>
          {error || 'Vault not found'}
        </Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: colors.tint }]}
          onPress={loadVaultData}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusInfo = getStatusInfo();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
          <Text style={[styles.headerText, { color: colors.text }]}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <View style={[styles.card, { 
          backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          borderColor: colors.icon + '20'
        }]}>
          <View style={styles.cardHeader}>
            <View style={styles.idContainer}>
              <Text style={[styles.label, { color: colors.icon }]}>Vault ID</Text>
              <Text style={[styles.value, { color: colors.text }]}>#{vaultData.id}</Text>
            </View>
            <View style={[styles.statusBadge, { 
              backgroundColor: statusInfo.color + '20',
              borderColor: statusInfo.color,
              borderWidth: 1
            }]}>
              <Text style={{ 
                color: statusInfo.color,
                fontWeight: 'bold'
              }}>{statusInfo.text}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.icon }]}>From</Text>
            <Text style={[styles.value, { color: colors.text }]}>{vaultData.senderUsername}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.icon }]}>To</Text>
            <Text style={[styles.value, { color: colors.text }]}>{vaultData.recipientUsername}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.icon }]}>Amount</Text>
            <Text style={[styles.value, { color: colors.text }]}>{vaultData.flowAmount} FLOW</Text>
          </View>

          {metadata && (
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: colors.icon }]}>Vault Name</Text>
              <Text style={[styles.value, { color: colors.text }]}>{metadata.vaultName}</Text>
            </View>
          )}

          {accessInfo?.reason === 'locked' && remainingTime() && (
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: colors.icon }]}>Time Left</Text>
              <Text style={[styles.value, { color: colors.tint }]}>{remainingTime()}</Text>
            </View>
          )}

          {/* Show content if user can access */}
          {accessInfo?.canAccess && (
            <>
              {vaultData.message && (
                <View style={[styles.messageContainer, { 
                  backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                }]}>
                  <Text style={[styles.label, { color: colors.icon, marginBottom: 8 }]}>Message</Text>
                  <Text 
                    style={[styles.message, { 
                      color: colors.text 
                    }]}
                    numberOfLines={0}
                    ellipsizeMode="tail"
                  >
                    {vaultData.message}
                  </Text>
                </View>
              )}

              {metadata?.mediaHash && metadata.mediaType === 'photo' && (
                <View style={styles.mediaContainer}>
                  <Text style={[styles.label, { color: colors.icon, marginBottom: 8 }]}>Photo</Text>
                  <MediaComponent 
                    mediaHash={metadata.mediaHash}
                    mediaType="photo"
                    style={styles.media}
                  />
                </View>
              )}

              {metadata?.mediaHash && metadata.mediaType === 'video' && (
                <View style={styles.mediaContainer}>
                  <Text style={[styles.label, { color: colors.icon, marginBottom: 8 }]}>Video</Text>
                  <MediaComponent 
                    mediaHash={metadata.mediaHash}
                    mediaType="video"
                    style={styles.media}
                  />
                </View>
              )}
            </>
          )}

          {/* Show locked message if no access */}
          {!accessInfo?.canAccess && accessInfo?.reason === 'locked' && (
            <View style={[styles.lockedContainer, { 
              backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
            }]}>
              <Ionicons name="lock-closed" size={48} color={colors.icon} />
              <Text style={[styles.lockedTitle, { color: colors.text }]}>Vault Locked</Text>
              <Text style={[styles.lockedMessage, { color: colors.text + '80' }]}>
                This vault will unlock on {new Date(vaultData.unlockAt * 1000).toLocaleDateString()}
              </Text>
            </View>
          )}

          <View style={[styles.footer, { borderTopColor: colors.icon + '20' }]}>
            <Text style={[styles.date, { color: colors.icon }]}>
              <Text style={{ fontWeight: '500' }}>Created: </Text>
              {new Date(vaultData.createdAt * 1000).toLocaleDateString()}
            </Text>
            <Text style={[styles.date, { color: colors.icon }]}>
              <Text style={{ fontWeight: '500' }}>Unlocks: </Text>
              {new Date(vaultData.unlockAt * 1000).toLocaleDateString()}
            </Text>
          </View>

          {/* Open Vault Button for Recipients */}
          {accessInfo?.reason === 'unlocked' && !vaultData.isOpened && (
            <TouchableOpacity 
              style={[styles.openButton, { backgroundColor: colors.tint }]}
              onPress={handleOpenVault}
            >
              <Ionicons name="lock-open" size={20} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.openButtonText}>Open Vault & Claim {vaultData.flowAmount} FLOW</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 16,
    marginLeft: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  idContainer: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  infoRow: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '400',
  },
  messageContainer: {
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  mediaContainer: {
    marginTop: 16,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  media: {
    width: '100%',
    height: '100%',
    backgroundColor: 'black',
  },
  footer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  date: {
    fontSize: 12,
    lineHeight: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: 'bold',
  },
  errorMessage: {
    marginTop: 8,
    fontSize: 16,
  },
  retryButton: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  lockedContainer: {
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  lockedMessage: {
    fontSize: 16,
    textAlign: 'center',
  },
  openButton: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  openButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});
