import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWalletConnect } from '../../hooks/useWalletConnect';

interface WalletConnectProps {
  isVisible: boolean;
  onClose: () => void;
}

export const WalletConnect: React.FC<WalletConnectProps> = ({ isVisible, onClose }) => {
  const {
    isConnected,
    address,
    balance,
    isLoading,
    error,
    connect,
    disconnect,
    switchToFlowTestnet,
    updateBalance
  } = useWalletConnect();

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      onClose();
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  const handleGetFaucet = () => {
    Linking.openURL('https://testnet-faucet.onflow.org/');
  };

  const handleViewExplorer = () => {
    if (address) {
      Linking.openURL(`https://evm-testnet.flowscan.org/address/${address}`);
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Wallet</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Loading State */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0000ff" />
              <Text style={styles.loadingText}>Connecting...</Text>
            </View>
          )}

          {/* Connected State */}
          {isConnected && address ? (
            <View style={styles.connectedContainer}>
              <View style={styles.addressContainer}>
                <Text style={styles.label}>Address:</Text>
                <Text style={styles.address} numberOfLines={1} ellipsizeMode="middle">
                  {address}
                </Text>
              </View>

              <View style={styles.balanceContainer}>
                <Text style={styles.label}>Balance:</Text>
                <Text style={styles.balance}>{balance} FLOW</Text>
                <TouchableOpacity onPress={updateBalance} style={styles.refreshButton}>
                  <Ionicons name="refresh" size={20} color="#000" />
                </TouchableOpacity>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={switchToFlowTestnet}
                >
                  <Text style={styles.buttonText}>Switch to Flow Testnet</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={handleGetFaucet}
                >
                  <Text style={styles.buttonText}>Get Test FLOW</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={handleViewExplorer}
                >
                  <Text style={styles.buttonText}>View on Explorer</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.dangerButton]}
                  onPress={handleDisconnect}
                >
                  <Text style={[styles.buttonText, styles.dangerButtonText]}>Disconnect</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Not Connected State */
            <View style={styles.notConnectedContainer}>
              <Text style={styles.notConnectedText}>
                Connect your wallet to interact with SnapVault
              </Text>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleConnect}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>Connect with MetaMask</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  errorText: {
    color: '#c62828',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  connectedContainer: {
    gap: 15,
  },
  addressContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 10,
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  balance: {
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    marginLeft: 'auto',
    padding: 5,
  },
  buttonContainer: {
    gap: 10,
    marginTop: 10,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#2196f3',
  },
  secondaryButton: {
    backgroundColor: '#f5f5f5',
  },
  dangerButton: {
    backgroundColor: '#ffebee',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  dangerButtonText: {
    color: '#c62828',
  },
  notConnectedContainer: {
    alignItems: 'center',
    padding: 20,
  },
  notConnectedText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
}); 