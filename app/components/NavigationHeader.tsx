import { useRouter } from 'expo-router';
import React from 'react';
import { useColorScheme } from 'react-native';
import { Header } from './Header';

export const NavigationHeader = () => {
  const colorScheme = useColorScheme();
  const router = useRouter();

  const handleConnectWallet = () => {
    // Dashboard'a yönlendir
    router.push('/dashboard');
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
