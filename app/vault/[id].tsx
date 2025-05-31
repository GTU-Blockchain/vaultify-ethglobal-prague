import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

interface Vault {
  id: string;
  sender: string;
  recipient: string;
  unlockDate: string;
  unlocked: boolean;
  mediaType: 'image' | 'video' | null;
  mediaUri: string;
  message: string;
  amount: string;
  createdAt: string;
}

type VaultMap = {
  [key: string]: Vault;
}

// Mock data - blockchain'den gelecek
const mockVaults: VaultMap = {
  '1': {
    id: '1',
    sender: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    recipient: '0xA1b2...C3d4',
    unlockDate: '2025-06-07',
    unlocked: true,
    mediaType: 'image', // 'image' | 'video' | null
    mediaUri: 'https://picsum.photos/500/300',
    message: 'Happy birthday! 🎉',
    amount: '0.5 ETH',
    createdAt: '2025-06-01',
  },
  '2': {
    id: '2',
    sender: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    recipient: '0xA1b2...C3d4',
    unlockDate: '2025-07-15',
    unlocked: false,
    mediaType: 'video',
    mediaUri: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    message: 'For our anniversary ❤️',
    amount: '1 ETH',
    createdAt: '2025-06-01',
  }
};

export default function VaultDetailScreen() {
  const params = useLocalSearchParams();
  const vaultId = typeof params.id === 'string' ? params.id : '';
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const vault = mockVaults[vaultId];
  if (!vault) return null;
  const remainingTime = () => {
    if (vault.unlocked) return null;
    const now = new Date();
    const unlock = new Date(vault.unlockDate);
    const diff = unlock.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return `${days} days remaining`;
  };

  const handleError = (message: string) => {
    Alert.alert(
      'Error',
      message,
      [{ text: 'OK' }],
      { cancelable: true }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />          <Text style={[styles.headerText, { color: colors.text }]}>Back</Text>
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
              <Text style={[styles.value, { color: colors.text }]}>#{vault.id}</Text>
            </View>
            <View style={[styles.statusBadge, { 
              backgroundColor: vault.unlocked ? '#A8E6CF' : '#FF8B94',
            }]}>              <Text style={{ 
                color: '#222',
                fontWeight: 'bold'
              }}>{vault.unlocked ? 'Open' : 'Locked'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.icon }]}>Sender</Text>
            <Text style={[styles.value, { color: colors.text }]}>{vault.sender}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.icon }]}>Recipient</Text>
            <Text style={[styles.value, { color: colors.text }]}>{vault.recipient}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.icon }]}>Amount</Text>
            <Text style={[styles.value, { color: colors.text }]}>{vault.amount}</Text>
          </View>          {!vault.unlocked && (
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: colors.icon }]}>Time Left</Text>
              <Text style={[styles.value, { color: colors.tint }]}>{remainingTime()}</Text>
            </View>
          )}

          {vault.unlocked && vault.message && (
            <View style={[styles.messageContainer, { 
              backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
            }]}>
              <Text 
                style={[styles.message, { 
                  color: colors.text 
                }]}
                numberOfLines={0} // Makes it multiline
                ellipsizeMode="tail"
              >
                {vault.message}
              </Text>
            </View>
          )}

          {vault.unlocked && vault.mediaType === 'image' && (
            <View style={styles.mediaContainer}>
              <Image 
                source={{ uri: vault.mediaUri }} 
                style={styles.media}
                resizeMode="contain"
              />
            </View>
          )}

          {vault.unlocked && vault.mediaType === 'video' && (
            <View style={styles.mediaContainer}>              <Video
                source={{ uri: vault.mediaUri }}
                style={styles.media}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={false}
                isLooping
              />
            </View>
          )}

          <View style={[styles.footer, { borderTopColor: colors.icon + '20' }]}>
            <Text style={[styles.date, { color: colors.icon }]}>
              <Text style={{ fontWeight: '500' }}>Created: </Text>
              {new Date(vault.createdAt).toLocaleDateString()}
            </Text>
            <Text style={[styles.date, { color: colors.icon }]}>
              <Text style={{ fontWeight: '500' }}>Unlocks: </Text>
              {new Date(vault.unlockDate).toLocaleDateString()}
            </Text>
          </View>
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
});
