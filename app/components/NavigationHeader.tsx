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
        Vaultify
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

      {/* Wallet Details Modal */}      <Modal visible={showWalletModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { 
            backgroundColor: colors.background,
            borderColor: colors.icon + '20'
          }]}>
            <View style={[styles.modalHeader, { 
              borderBottomColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
            }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Wallet Details</Text>
              <TouchableOpacity 
                onPress={() => setShowWalletModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Network Status */}
            {!isOnFlowTestnet && (
              <View style={styles.networkWarning}>
                <Ionicons name="warning-outline" size={24} color={colors.text} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.networkWarningText, { 
                    color: colors.text,
                    marginBottom: 8
                  }]}>
                    Wrong Network Detected
                  </Text>
                  <Text style={{ color: colors.text, opacity: 0.6 }}>
                    Please switch to Flow Testnet to continue using Vaultify
                  </Text>
                </View>
              </View>
            )}

            <View style={[styles.walletInfo, { 
              backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              borderColor: colors.icon + '20'
            }]}>
              <Text style={[styles.label, { color: colors.text }]}>Username</Text>
              <Text style={[styles.value, { color: colors.text }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {username ? `@${username}` : 'Not registered'}
              </Text>
              
              <Text style={[styles.label, { color: colors.text }]}>Wallet Address</Text>
              <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
                {address}
              </Text>
              
              <Text style={[styles.label, { color: colors.text }]}>Balance</Text>
              <Text style={[styles.value, { color: colors.text }]}>
                {balance} FLOW
              </Text>

              <NetworkStatusDisplay />
            </View>

            {!isOnFlowTestnet && (
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.tint }]} 
                onPress={handleSwitchNetwork}
              >
                <Text style={[styles.actionButtonText, { color: colors.background }]}>
                  Switch to Flow Testnet
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.tint }]} 
              onPress={handleGetFaucet}
            >
              <Text style={[styles.actionButtonText, { color: colors.background }]}>
                💧 Get Test FLOW
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.disconnectButton, { 
                backgroundColor: theme === 'dark' ? 'rgba(255,59,48,0.9)' : '#FF3B30'
              }]} 
              onPress={handleDisconnect}
            >
              <Text style={styles.disconnectButtonText}>Disconnect Wallet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Username Registration Modal */}
      <Modal visible={showUsernameModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { 
            backgroundColor: colors.background,
            borderColor: colors.icon + '20'
          }]}>
            <View style={[styles.modalHeader, { 
              borderBottomColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
            }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Register Username</Text>
              <TouchableOpacity 
                onPress={() => setShowUsernameModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Connection Status Check */}
            {!isConnected ? (
              <View style={styles.connectionPrompt}>
                <Ionicons name="wallet-outline" size={48} color={colors.text} style={{ marginBottom: 16, opacity: 0.5 }} />
                <Text style={[styles.description, { color: colors.text }]}>
                  Connect your wallet to start using Vaultify
                </Text>
                <TouchableOpacity style={[styles.connectButton, { backgroundColor: colors.tint }]} onPress={handleConnect}>
                  <Text style={[styles.connectButtonText, { color: colors.background }]}>
                    Connect Wallet
                  </Text>
                </TouchableOpacity>
              </View>
            ) : !isOnFlowTestnet ? (
              <View style={styles.connectionPrompt}>
                <Ionicons name="warning-outline" size={48} color={colors.text} style={{ marginBottom: 16 }} />
                <Text style={[styles.description, { color: colors.text }]}>
                  Wrong network detected. Please switch to Flow Testnet to continue.
                </Text>
                <TouchableOpacity style={[styles.switchButton, { backgroundColor: colors.tint }]} onPress={handleSwitchNetwork}>
                  <Text style={[styles.switchButtonText, { color: colors.background }]}>
                    Switch to Flow Testnet
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={[styles.description, { color: colors.text }]}>
                  Choose a unique username to identify yourself in the Vaultify ecosystem
                </Text>
                
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      borderColor: colors.icon + '20',
                      color: colors.text 
                    }]}
                    placeholder="Enter username (3-20 characters)"
                    placeholderTextColor={colors.icon}
                    value={usernameInput}
                    onChangeText={setUsernameInput}
                    maxLength={20}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                  />
                  
                  <View style={styles.availabilityIndicator}>
                    {isCheckingUsername ? (
                      <ActivityIndicator size="small" color={colors.text} />
                    ) : usernameAvailable === true ? (
                      <Ionicons name="checkmark-circle" size={24} color={colors.tint} />
                    ) : usernameAvailable === false ? (
                      <Ionicons name="close-circle" size={24} color={theme === 'dark' ? 'rgba(255,59,48,0.9)' : '#FF3B30'} />
                    ) : null}
                  </View>
                </View>

                {/* Availability Status Text */}
                {usernameInput.length > 0 && (
                  <Text style={[styles.availabilityText, {
                    color: usernameAvailable === true ? colors.tint : 
                           usernameAvailable === false ? (theme === 'dark' ? 'rgba(255,59,48,0.9)' : '#FF3B30') : 
                           colors.text,
                    opacity: 0.9
                  }]}>
                    {isCheckingUsername ? 'Checking availability...' :
                     usernameAvailable === true ? '✓ Username available!' :
                     usernameAvailable === false ? '✗ Username already taken' :
                     usernameInput.length < 3 ? 'Username must be at least 3 characters' : ''}
                  </Text>
                )}

                <TouchableOpacity 
                  style={[
                    styles.registerButton, 
                    { 
                      backgroundColor: colors.tint,
                      opacity: (usernameAvailable === true && !isLoading) ? 1 : 0.5 
                    }
                  ]} 
                  onPress={handleRegisterUsername}
                  disabled={isLoading || usernameAvailable !== true}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.background} />
                  ) : (
                    <Text style={[styles.registerButtonText, { color: colors.background }]}>
                      Register Username
                    </Text>
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

const styles = StyleSheet.create({
  header: {
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
  },
  walletButton: {
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  networkWarning: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  networkWarningText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  switchButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  switchButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  walletInfo: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  label: {
    fontWeight: '600',
    marginTop: 8,
    fontSize: 15,
    opacity: 0.8,
  },
  value: {
    fontFamily: 'monospace',
    marginBottom: 12,
    fontSize: 15,
  },
  actionButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  disconnectButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disconnectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  connectionPrompt: {
    alignItems: 'center',
    padding: 24,
  },
  connectButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 200,
    marginTop: 16,
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    paddingRight: 40,
  },
  availabilityIndicator: {
    position: 'absolute',
    right: 14,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availabilityText: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  registerButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
