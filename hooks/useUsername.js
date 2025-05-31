// hooks/useUsername.js - Updated for MetaMask WalletConnect
import { useState, useCallback } from 'react';
import { ethers } from 'ethers';

const SNAP_VAULT_ABI = [
  "function registerUsername(string username) external returns (bool)",
  "function isUsernameAvailable(string username) external view returns (bool)",
  "function getUsernameByAddress(address userAddress) external view returns (string)"
];

// TODO: Replace with your actual deployed contract address
const CONTRACT_ADDRESS = "0xA7c5A5eBCC41Ac98383C5a89fB9C1741fBDc1870";

export const useUsername = (walletService) => {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkUsernameAvailable = useCallback(async (usernameToCheck) => {
    try {
      const provider = walletService?.getProvider() || new ethers.JsonRpcProvider('https://testnet.evm.nodes.onflow.org');
      const contract = new ethers.Contract(CONTRACT_ADDRESS, SNAP_VAULT_ABI, provider);
      return await contract.isUsernameAvailable(usernameToCheck);
    } catch (error) {
      console.error('Username availability check failed:', error);
      throw new Error('Failed to check username availability');
    }
  }, [walletService]);

  const registerUsername = useCallback(async (newUsername) => {
    if (!walletService?.getSigner) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Check if username is available
      const available = await checkUsernameAvailable(newUsername);
      if (!available) {
        throw new Error('Username already taken');
      }

      const signer = walletService.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, SNAP_VAULT_ABI, signer);
      
      const tx = await contract.registerUsername(newUsername);
      console.log('Username registration transaction sent:', tx.hash);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log('Username registration confirmed:', receipt);
      
      setUsername(newUsername);
      return tx.hash;
    } catch (error) {
      console.error('Username registration failed:', error);
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [walletService, checkUsernameAvailable]);

  const loadUsername = useCallback(async (address) => {
    if (!address) {
      setUsername('');
      return '';
    }

    try {
      const provider = walletService?.getProvider() || new ethers.JsonRpcProvider('https://testnet.evm.nodes.onflow.org');
      const contract = new ethers.Contract(CONTRACT_ADDRESS, SNAP_VAULT_ABI, provider);
      const userUsername = await contract.getUsernameByAddress(address);
      
      console.log('Loaded username for', address, ':', userUsername);
      setUsername(userUsername || '');
      return userUsername || '';
    } catch (error) {
      console.error('Failed to load username:', error);
      setUsername('');
      return '';
    }
  }, [walletService]);

  return {
    username,
    isLoading,
    error,
    registerUsername,
    checkUsernameAvailable,
    loadUsername
  };
};