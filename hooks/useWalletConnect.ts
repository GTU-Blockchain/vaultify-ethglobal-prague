import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { walletConnectService } from '../app/services/WalletConnectService';

export const useWalletConnect = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved wallet state
  useEffect(() => {
    const loadSavedWallet = async () => {
      try {
        const savedState = await AsyncStorage.getItem('@wallet_connected');
        if (savedState) {
          const { address } = JSON.parse(savedState);
          setAddress(address);
          setIsConnected(true);
          updateBalance();
        }
      } catch (error) {
        console.error('Error loading saved wallet:', error);
      }
    };

    loadSavedWallet();
  }, []);

  // Update balance
  const updateBalance = async () => {
    if (!address) return;
    try {
      const newBalance = await walletConnectService.getBalance();
      setBalance(newBalance);
    } catch (error) {
      console.error('Error updating balance:', error);
    }
  };

  // Connect wallet
  const connect = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { address } = await walletConnectService.connectWallet();
      setAddress(address);
      setIsConnected(true);
      await updateBalance();
    } catch (error: any) {
      setError(error.message || 'Failed to connect wallet');
      console.error('Error connecting wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect wallet
  const disconnect = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await walletConnectService.disconnect();
      setAddress(null);
      setIsConnected(false);
      setBalance('0');
    } catch (error: any) {
      setError(error.message || 'Failed to disconnect wallet');
      console.error('Error disconnecting wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get signer for contract interactions
  const getSigner = () => {
    return walletConnectService.getSigner();
  };

  // Switch to Flow testnet
  const switchToFlowTestnet = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await walletConnectService.switchToFlowTestnet();
      await updateBalance();
    } catch (error: any) {
      setError(error.message || 'Failed to switch network');
      console.error('Error switching network:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isConnected,
    address,
    balance,
    isLoading,
    error,
    connect,
    disconnect,
    getSigner,
    switchToFlowTestnet,
    updateBalance
  };
}; 