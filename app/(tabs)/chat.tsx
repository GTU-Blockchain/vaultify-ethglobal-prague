import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Person from '../components/Person';
import { useTheme } from '../context/ThemeContext';
import { ChatContact, chatService } from '../services/ChatService';
import { walletConnectService } from '../services/WalletConnectService';

export default function ChatScreen() {
  const { colors } = useTheme();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  useEffect(() => {
    checkWalletConnection();
    if (walletConnectService.isWalletConnected()) {
      loadContacts();
    }
  }, []);

  const checkWalletConnection = () => {
    const connected = walletConnectService.isWalletConnected();
    setIsWalletConnected(connected);
    
    if (!connected) {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    try {
      setLoading(true);
      console.log('📱 Loading contacts from blockchain...');
      
      const contactList = await chatService.getContacts();
      setContacts(contactList);
      
      console.log(`✅ Loaded ${contactList.length} contacts`);
    } catch (error: any) {
      console.error('❌ Error loading contacts:', error);
      Alert.alert(
        'Error Loading Contacts',
        error.message || 'Failed to load contacts from blockchain. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadContacts();
    } catch (error) {
      console.error('❌ Error refreshing contacts:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleContactPress = (contact: ChatContact) => {
    router.push(`/chat/${contact.id}?name=${contact.username || contact.formattedAddress}&address=${contact.address}`);
  };

  const handleConnectWallet = () => {
    // Navigate to wallet connection or trigger connection
    Alert.alert(
      'Connect Wallet',
      'Please connect your wallet to view your chat contacts.',
      [{ text: 'OK' }]
    );
  };

  if (!isWalletConnected) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="wallet-outline" size={64} color={colors.text + '60'} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          Wallet Not Connected
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.text + '80' }]}>
          Connect your wallet to view your blockchain interactions and start chatting
        </Text>
        <TouchableOpacity 
          style={[styles.connectButton, { backgroundColor: colors.tint }]}
          onPress={handleConnectWallet}
        >
          <Text style={[styles.connectButtonText, { color: '#FFFFFF' }]}>
            Connect Wallet
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading contacts from blockchain...
        </Text>
        <Text style={[styles.subLoadingText, { color: colors.text + '60' }]}>
          Resolving usernames and transaction history
        </Text>
      </View>
    );
  }

  if (contacts.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="people-outline" size={64} color={colors.text + '60'} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          No Contacts Found
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.text + '80' }]}>
          Start making transactions to see your contacts here
        </Text>
        <TouchableOpacity 
          style={[styles.refreshButton, { borderColor: colors.tint }]}
          onPress={handleRefresh}
        >
          <Ionicons name="refresh" size={20} color={colors.tint} />
          <Text style={[styles.refreshButtonText, { color: colors.tint }]}>
            Refresh
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.tint]}
          tintColor={colors.tint}
        />
      }
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Blockchain Contacts
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.text + '80' }]}>
          {contacts.length} contact{contacts.length !== 1 ? 's' : ''} from your transactions
        </Text>
      </View>

      {contacts.map((contact) => (
        <Person
          key={contact.id}
          name={contact.username || contact.formattedAddress}
          subtitle={contact.username ? contact.formattedAddress : `${contact.transactionCount} transactions`}
          lastInteraction={contact.formattedLastInteraction}
          transactionCount={contact.transactionCount}
          isIncoming={contact.isIncoming}
          isOutgoing={contact.isOutgoing}
          onPress={() => handleContactPress(contact)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
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
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  subLoadingText: {
    fontSize: 14,
    marginTop: 8,
  },
  connectButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
    marginTop: 8,
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});