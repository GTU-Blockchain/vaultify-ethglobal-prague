import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWalletConnect } from '../../hooks/useWalletConnect';
import { useTheme } from '../context/ThemeContext';

export const NavigationHeader = () => {
  const { colors, theme, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  
  // Use the unified wallet hook
  const {
    isConnected,
    address,
    balance,
    isLoading,
    error,
    username,
    isRegistered,
    isOnFlowTestnet,
    connect,
    disconnect,
    reconnect,
    switchToFlowTestnet,
    registerUsername,
    checkUsernameAvailability,
    clearError
  } = useWalletConnect();
  
  // UI states
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  // Auto-show username modal if connected but not registered
  useEffect(() => {
    if (isConnected && isOnFlowTestnet && !isRegistered && !isLoading && !showUsernameModal) {
      setShowUsernameModal(true);
    }
  }, [isConnected, isOnFlowTestnet, isRegistered, isLoading, showUsernameModal]);

  // Check username availability with debouncing
  useEffect(() => {
    if (!usernameInput || usernameInput.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsCheckingUsername(true);
      try {
        const available = await checkUsernameAvailability(usernameInput);
        setUsernameAvailable(available);
      } catch (error) {
        console.error('Error checking username availability:', error);
        setUsernameAvailable(null);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [usernameInput, checkUsernameAvailability]);

  const handleWalletPress = () => {
    if (isLoading) return;
    
    if (!isConnected) {
      Alert.alert(
        'Connect Wallet',
        'Please connect your wallet to continue using Vaultify',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Connect', onPress: handleConnect }
        ]
      );
      return;
    }
    
    setShowWalletModal(true);
  };

  const handleConnect = async () => {
    try {
      clearError();
      await connect();
      setShowWalletModal(false);
    } catch (err) {
      console.error('Failed to connect wallet:', err);
      Alert.alert('Connection Failed', 'Failed to connect wallet. Please try again.');
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setShowWalletModal(false);
      setShowUsernameModal(false);
    } catch (err) {
      console.error('Failed to disconnect wallet:', err);
      Alert.alert('Disconnect Failed', 'Failed to disconnect wallet.');
    }
  };

  const handleSwitchNetwork = async () => {
    try {
      await switchToFlowTestnet();
    } catch (err) {
      console.error('Failed to switch network:', err);
      Alert.alert('Network Switch Failed', 'Please switch to Flow testnet manually in MetaMask.');
    }
  };

  const handleRegisterUsername = async () => {
    if (!usernameInput.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    if (usernameInput.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }

    if (usernameAvailable !== true) {
      Alert.alert('Error', 'Please choose an available username');
      return;
    }

    try {
      await registerUsername(usernameInput.trim());
      setUsernameInput('');
      setShowUsernameModal(false);
      Alert.alert('✅ Success', 'Username registered successfully!');
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Offer reconnection if it's a wallet connection issue
      if (error.message?.includes('connection') || error.message?.includes('no such account')) {
        Alert.alert(
          'Connection Issue',
          'There seems to be a wallet connection issue. Would you like to try reconnecting?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Reconnect', 
              onPress: async () => {
                try {
                  await reconnect();
                  Alert.alert('Success', 'Wallet reconnected. Please try registering again.');
                } catch (reconnectError: any) {
                  Alert.alert('Error', reconnectError.message || 'Failed to reconnect');
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Registration Failed', error.message || 'Failed to register username');
      }
    }
  };

  const handleGetFaucet = () => {
    if (!address) return;
    
    Alert.alert(
      '💧 Get Testnet FLOW',
      `Go to Flow Faucet and request tokens for:\n\n${address}`,
      [
        { text: 'Open Faucet', onPress: () => Linking.openURL(`https://testnet-faucet.onflow.org/`) },
        { text: 'Cancel' }
      ]
    );
  };
  const getWalletStatusText = () => {
    if (!isConnected) return '';
    if (!isRegistered) return address ? address.slice(0, 4) + '...' : '';
    return username ? `@${username.slice(0, 6)}` : '';
  };

  const getWalletStatusColor = () => {
    if (!isConnected) return colors.icon;
    if (!isOnFlowTestnet) return '#ff6b6b'; // Red for wrong network
    if (!isRegistered) return '#17a2b8'; // Blue for connected but no username
    return '#28a745'; // Green for fully set up
  };

  const getWalletIcon = () => {
    if (!isConnected) return "wallet-outline";
    if (!isOnFlowTestnet) return "warning-outline";
    if (!isRegistered) return "person-add-outline";
    return "checkmark-circle-outline";
  };

  const NetworkStatusDisplay = () => {
    const networkText = isOnFlowTestnet ? 'Flow EVM Testnet' : 'Wrong Network';
    const statusIcon = isOnFlowTestnet ? '✓' : '⚠️';
    const textColor = isOnFlowTestnet ? '#28a745' : '#ff6b6b';
    
    return (
      <>
        <Text style={[styles.label, { color: colors.text }]}>Network:</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
          <Text 
            style={[styles.value, { color: textColor }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {networkText}
          </Text>
          <Text style={[styles.value, { color: textColor, marginLeft: 4 }]}>
            {statusIcon}
          </Text>
        </View>
      </>
    );
  };

  return (    <View style={[styles.header, { 
      paddingTop: insets.top,
      backgroundColor: colors.background 
    }]}>      <TouchableOpacity 
        style={styles.leftButton}
        onPress={toggleTheme}
      >
        <Ionicons 
          name={theme === 'dark' ? 'sunny-outline' : 'moon-outline'} 
          size={24} 
          color={colors.icon} 
        />
      </TouchableOpacity>
      
      <Text style={[styles.title, { color: colors.text }]}>
        VAULTIFY
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
              name={getWalletIcon()} 
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

      {/* Error Display */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={clearError}>
            <Ionicons name="close" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

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

            {/* Network Status */}
            {!isOnFlowTestnet && (
              <View style={styles.networkWarning}>
                <Ionicons name="warning" size={20} color="#ff6b6b" />
                <Text style={styles.networkWarningText}>Wrong Network</Text>
                <TouchableOpacity style={styles.switchButton} onPress={handleSwitchNetwork}>
                  <Text style={styles.switchButtonText}>Switch to Flow Testnet</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.walletInfo}>
              <Text style={[styles.label, { color: colors.text }]}>Username:</Text>
              <Text style={[styles.value, { color: colors.text }]}>
                {username ? `@${username}` : 'Not registered'}
              </Text>
              
              <Text style={[styles.label, { color: colors.text }]}>Address:</Text>
              <Text style={[styles.value, { color: colors.text }]}>{address}</Text>
              
              <Text style={[styles.label, { color: colors.text }]}>Balance:</Text>
              <Text style={[styles.value, { color: colors.text }]}>{balance} FLOW</Text>

              <NetworkStatusDisplay />
            </View>

            <TouchableOpacity style={styles.actionButton} onPress={handleGetFaucet}>
              <Text style={styles.actionButtonText}>💧 Get Test FLOW</Text>
            </TouchableOpacity>            <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
              <Text style={styles.disconnectButtonText}>Disconnect Wallet</Text>
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

            {/* Connection Status Check */}
            {!isConnected ? (
              <View style={styles.connectionPrompt}>
                <Text style={[styles.description, { color: colors.text }]}>
                  Please connect your wallet first
                </Text>
                <TouchableOpacity style={styles.connectButton} onPress={handleConnect}>
                  <Text style={styles.connectButtonText}>Connect Wallet</Text>
                </TouchableOpacity>
              </View>
            ) : !isOnFlowTestnet ? (
              <View style={styles.connectionPrompt}>                <Text style={[styles.description, { color: colors.text }]}>
                  Please switch to Flow testnet to continue
                </Text>
                <TouchableOpacity style={styles.switchButton} onPress={handleSwitchNetwork}>
                  <Text style={styles.switchButtonText}>Switch to Flow Testnet</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={[styles.description, { color: colors.text }]}>
                  Choose a unique username for your account
                </Text>
                
                <View style={styles.inputContainer}>
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
                    maxLength={20}
                    autoCapitalize="none"
                  />
                  
                  {/* Username Availability Indicator */}
                  <View style={styles.availabilityIndicator}>
                    {isCheckingUsername ? (
                      <ActivityIndicator size="small" color={colors.icon} />
                    ) : usernameAvailable === true ? (
                      <Ionicons name="checkmark-circle" size={20} color="#28a745" />
                    ) : usernameAvailable === false ? (
                      <Ionicons name="close-circle" size={20} color="#ff6b6b" />
                    ) : null}
                  </View>
                </View>

                {/* Availability Status Text */}
                {usernameInput.length > 0 && (
                  <Text style={[styles.availabilityText, {
                    color: usernameAvailable === true ? '#28a745' : 
                           usernameAvailable === false ? '#ff6b6b' : colors.icon
                  }]}>
                    {isCheckingUsername ? 'Checking availability...' :
                     usernameAvailable === true ? '✓ Username available!' :
                     usernameAvailable === false ? '✗ Username already taken' :
                     usernameInput.length < 3 ? 'Minimum 3 characters required' : ''}
                  </Text>
                )}

                <TouchableOpacity 
                  style={[
                    styles.registerButton,
                    { opacity: (usernameAvailable === true && !isLoading) ? 1 : 0.5 }
                  ]} 
                  onPress={handleRegisterUsername} 
                  disabled={isLoading || usernameAvailable !== true}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.registerButtonText}>Register Username</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    
  },
  leftButton: {
    padding: 8,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },walletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    minWidth: 44,
    height: 44,
  },
  walletText: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 80,
  },
  errorBanner: {
    position: 'absolute',
    top: '100%',
    left: 20,
    right: 20,
    backgroundColor: '#ff6b6b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    zIndex: 1000,
  },
  errorText: {
    color: 'white',
    fontSize: 14,
    flex: 1,
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
  networkWarning: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  networkWarningText: {
    color: '#856404',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  switchButton: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  switchButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
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
  connectionPrompt: {
    alignItems: 'center',
    padding: 20,
  },
  connectButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 150,
  },
  connectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  description: {
    textAlign: 'center',
    marginBottom: 15,
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  availabilityIndicator: {
    position: 'absolute',
    right: 12,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availabilityText: {
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
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