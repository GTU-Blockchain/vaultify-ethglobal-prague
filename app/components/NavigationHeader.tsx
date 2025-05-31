import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUsername } from '../../hooks/useUsername';
import { useWalletConnect } from '../../hooks/useWalletConnect';
import { Colors } from '../constants/Colors';

export const NavigationHeader = () => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  
  // Wallet and username hooks
  const {
    isConnected,
    address,
    balance,
    isLoading,
    error,
    connect,
    disconnect
  } = useWalletConnect();
  const username = useUsername(isConnected ? address : null);
  
  // UI states
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [showPrivateKeyInput, setShowPrivateKeyInput] = useState(false);
  const [privateKeyInput, setPrivateKeyInput] = useState('');

  // Load username when wallet connects
  React.useEffect(() => {
    if (isConnected && address) {
      username.loadUsername(address);
    }
  }, [isConnected, address]);

  const handleWalletPress = () => {
    if (!isConnected) {
      handleConnect();
    } else if (!username.username) {
      setShowUsernameModal(true);
    } else {
      setShowWalletModal(true);
    }
  };

  const handleConnect = async () => {
    try {
      await connect();
      setShowWalletModal(false);
    } catch (err) {
      console.error('Failed to connect wallet:', err);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setShowWalletModal(false);
    } catch (err) {
      console.error('Failed to disconnect wallet:', err);
    }
  };

  const handleConnectWithPrivateKey = async () => {
    if (!privateKeyInput.trim()) {
      Alert.alert('Error', 'Please enter a private key');
      return;
    }

    try {
      await connect();
      setPrivateKeyInput('');
      setShowPrivateKeyInput(false);
      setShowWalletModal(false);
      Alert.alert('✅ Success', 'Wallet connected successfully!');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleRegisterUsername = async () => {
    if (!usernameInput.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    try {
      await username.registerUsername(usernameInput.trim());
      setUsernameInput('');
      setShowUsernameModal(false);
      Alert.alert('✅ Success', 'Username registered successfully!');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleGetFaucet = () => {
    if (!address) return;
    
    Alert.alert(
      '💧 Get Testnet FLOW',
      `Go to Flow Faucet and request tokens for:\n\n${address}`,
      [
        { text: 'Open Faucet', onPress: () => Linking.openURL(`https://testnet-faucet.onflow.org/${address}`) },
        { text: 'Cancel' }
      ]
    );
  };

  const getWalletStatusText = () => {
    if (!isConnected) return '';
    if (!username.username) return address?.slice(0, 6) + '...';
    return `@${username.username}`;
  };

  const getWalletStatusColor = () => {
    if (!isConnected) return colors.icon;
    if (!username.username) return '#17a2b8';
    return '#28a745';
  };

  return (
    <View style={[styles.header, { 
      paddingTop: insets.top + 10,
      backgroundColor: colors.background 
    }]}>
      <TouchableOpacity style={styles.leftButton}>
        <Ionicons name="sunny" size={24} color={colors.icon} />
      </TouchableOpacity>
      
      <Text style={[styles.title, { color: colors.text }]}>
        SnapVault
      </Text>
      
      <TouchableOpacity 
        style={[styles.walletButton, { borderColor: getWalletStatusColor() }]}
        onPress={handleWalletPress}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={getWalletStatusColor()} />
        ) : (
          <>
            <Ionicons 
              name={isConnected ? "wallet" : "wallet-outline"} 
              size={20} 
              color={getWalletStatusColor()} 
            />
            {isConnected && (
              <Text style={[styles.walletText, { color: getWalletStatusColor() }]}>
                {getWalletStatusText()}
              </Text>
            )}
          </>
        )}
      </TouchableOpacity>

      {/* Wallet Details Modal */}
      <Modal visible={showWalletModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Wallet Details</Text>
              <TouchableOpacity onPress={() => setShowWalletModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.walletInfo}>
              <Text style={[styles.label, { color: colors.text }]}>Username:</Text>
              <Text style={[styles.value, { color: colors.text }]}>
                {username.username ? `@${username.username}` : 'Not registered'}
              </Text>
              
              <Text style={[styles.label, { color: colors.text }]}>Address:</Text>
              <Text style={[styles.value, { color: colors.text }]}>{address}</Text>
              
              <Text style={[styles.label, { color: colors.text }]}>Balance:</Text>
              <Text style={[styles.value, { color: colors.text }]}>{balance} FLOW</Text>
            </View>

            <TouchableOpacity style={styles.actionButton} onPress={handleGetFaucet}>
              <Text style={styles.actionButtonText}>💧 Get Test FLOW</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
              <Text style={styles.disconnectButtonText}>👋 Disconnect</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Username Registration Modal */}
      <Modal visible={showUsernameModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Register Username</Text>
              <TouchableOpacity onPress={() => setShowUsernameModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.description, { color: colors.text }]}>
              Choose a unique username for your SnapVault account
            </Text>
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.background, 
                borderColor: colors.text, 
                color: colors.text 
              }]}
              placeholder="Enter username (3-20 characters)"
              placeholderTextColor={colors.icon}
              value={usernameInput}
              onChangeText={setUsernameInput}
            />

            <TouchableOpacity 
              style={styles.registerButton} 
              onPress={handleRegisterUsername} 
              disabled={username.isLoading}
            >
              {username.isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.registerButtonText}>Register Username</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  leftButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  walletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  walletText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  walletInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  label: {
    fontWeight: 'bold',
    marginTop: 5,
  },
  value: {
    fontFamily: 'monospace',
    marginBottom: 10,
  },
  actionButton: {
    backgroundColor: '#6c757d',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disconnectButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  disconnectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  description: {
    textAlign: 'center',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  registerButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 