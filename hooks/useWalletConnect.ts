import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { walletConnectService } from '../app/services/WalletConnectService';

// Contract service with CORRECT function names matching your deployed contract
const simpleContractService = {
  async isUsernameAvailable(username: string): Promise<boolean> {
    try {
      const { ethers } = require('ethers');
      const provider = new ethers.JsonRpcProvider('https://testnet.evm.nodes.onflow.org');
      const contract = new ethers.Contract(
        "0xA7c5A5eBCC41Ac98383C5a89fB9C1741fBDc1870",
        ["function isUsernameAvailable(string username) external view returns (bool)"],
        provider
      );
      return await contract.isUsernameAvailable(username.toLowerCase());
    } catch (error) {
      console.error('Error checking username availability:', error);
      return false;
    }
  },

  async getUsernameByAddress(address: string): Promise<string | null> {
    try {
      const { ethers } = require('ethers');
      const provider = new ethers.JsonRpcProvider('https://testnet.evm.nodes.onflow.org');
      const contract = new ethers.Contract(
        "0xA7c5A5eBCC41Ac98383C5a89fB9C1741fBDc1870",
        ["function addressToUsername(address) external view returns (string)"],
        provider
      );
      const username = await contract.addressToUsername(address);
      return username && username.length > 0 ? username : null;
    } catch (error) {
      console.error('Error getting username by address:', error);
      return null;
    }
  },

  async registerUser(username: string): Promise<boolean> {
    try {
      const { ethers } = require('ethers');
      
      console.log('🚀 STARTING USERNAME REGISTRATION...');
      console.log('Username:', username);
      
      const customSigner = walletConnectService.createCustomSigner();
      const signerAddress = await customSigner.getAddress();
      console.log('Signer address:', signerAddress);
      
      const provider = new ethers.JsonRpcProvider('https://testnet.evm.nodes.onflow.org');
      
      // ✅ CORRECT ABI - using registerUsername (matches your deployed contract)
      const contract = new ethers.Contract(
        "0xA7c5A5eBCC41Ac98383C5a89fB9C1741fBDc1870",
        [
          "function registerUsername(string username) external returns (bool)", // ✅ CORRECT
          "function addressToUsername(address) external view returns (string)",
          "function isUsernameAvailable(string username) external view returns (bool)"
        ],
        provider
      );
      
      console.log('✈️ Running pre-flight checks...');
      
      // Check 1: Already registered?
      try {
        const existingUsername = await contract.addressToUsername(signerAddress);
        if (existingUsername && existingUsername.length > 0) {
          throw new Error(`You already have a username registered: "${existingUsername}"`);
        }
        console.log('✅ No existing username found');
      } catch (error: any) {
        if (error.message?.includes('already have a username')) {
          throw error;
        }
        console.warn('Could not check existing username:', error.message);
      }
      
      // Check 2: Username available?
      const isAvailable = await contract.isUsernameAvailable(username.toLowerCase());
      if (!isAvailable) {
        throw new Error(`Username "${username}" is already taken`);
      }
      console.log('✅ Username is available');
      
      // Check 3: Valid format?
      if (username.length < 3 || username.length > 20) {
        throw new Error(`Username must be 3-20 characters (current: ${username.length})`);
      }
      console.log('✅ Username format is valid');
      
      // Check 4: Sufficient balance?
      const balance = await provider.getBalance(signerAddress);
      const balanceInFlow = ethers.formatEther(balance);
      console.log('Account balance:', balanceInFlow, 'FLOW');
      
      if (balance < ethers.parseEther('0.01')) {
        throw new Error(`Insufficient balance. Have ${balanceInFlow} FLOW, need at least 0.01 FLOW`);
      }
      console.log('✅ Sufficient balance');
      
      console.log('✅ All pre-flight checks passed');
      
      // Use safe gas settings - no estimation to avoid errors
      const gasLimit = 800000n; // 800k gas
      const gasPrice = ethers.parseUnits('30', 'gwei'); // 30 gwei
      
      console.log('⛽ Gas configuration:');
      console.log('- Gas limit:', gasLimit.toString());
      console.log('- Gas price: 30 gwei');
      console.log('- Estimated cost:', ethers.formatEther(gasLimit * gasPrice), 'FLOW');
      
      // ✅ SIMULATION with CORRECT function name
      console.log('🧪 Testing transaction simulation...');
      try {
        await contract.registerUsername.staticCall(username.toLowerCase()); // ✅ CORRECT
        console.log('✅ Simulation successful');
      } catch (simError: any) {
        console.error('❌ Simulation failed:', simError.message);
        
        let errorMsg = 'Unknown simulation error';
        if (simError.message) {
          if (simError.message.includes('Already registered')) {
            errorMsg = 'You already have a username registered';
          } else if (simError.message.includes('Username taken')) {
            errorMsg = 'Username is already taken';
          } else if (simError.message.includes('Username 3-20 chars')) {
            errorMsg = 'Username must be 3-20 characters';
          } else {
            errorMsg = simError.message;
          }
        }
        
        throw new Error(`Contract will reject: ${errorMsg}`);
      }
      
      // ✅ PREPARE TRANSACTION with CORRECT function name
      const txData = contract.interface.encodeFunctionData('registerUsername', [username.toLowerCase()]); // ✅ CORRECT
      
      const transaction = {
        to: "0xA7c5A5eBCC41Ac98383C5a89fB9C1741fBDc1870",
        data: txData,
        value: '0x0',
        gasLimit: ethers.toBeHex(gasLimit),
        gasPrice: ethers.toBeHex(gasPrice)
      };
      
      console.log('📤 Sending registration transaction...');
      const result = await customSigner.sendTransaction(transaction);
      console.log('✅ Transaction sent:', result.hash);
      
      console.log('⏳ Waiting for confirmation...');
      const receipt = await result.wait();
      
      console.log('📋 Transaction completed:');
      console.log('- Hash:', receipt.hash);
      console.log('- Status:', receipt.status === 1 ? 'Success ✅' : 'Failed ❌');
      console.log('- Gas used:', receipt.gasUsed?.toString());
      console.log('- Explorer:', `https://evm-testnet.flowscan.io/tx/${receipt.hash}`);
      
      if (receipt.status === 0) {
        throw new Error(`Transaction failed. Check: https://evm-testnet.flowscan.io/tx/${receipt.hash}`);
      }
      
      console.log('🎉 Username registration successful!');
      return true;
      
    } catch (error: any) {
      console.error('❌ Registration failed:', error.message || error);
      
      // Enhanced error handling
      if (error.message?.includes('already have a username')) {
        throw new Error('You already have a username registered with this address');
      } else if (error.message?.includes('already taken')) {
        throw new Error('This username is already taken');
      } else if (error.message?.includes('must be 3-20 characters')) {
        throw new Error('Username must be 3-20 characters long');
      } else if (error.message?.includes('user rejected')) {
        throw new Error('Transaction was rejected in your wallet');
      } else if (error.message?.includes('insufficient funds') || error.message?.includes('Insufficient balance')) {
        throw new Error('Insufficient FLOW balance for gas fees');
      } else if (error.message?.includes('Wallet not connected')) {
        throw new Error('Wallet connection issue. Please reconnect');
      } else if (error.message?.includes('network')) {
        throw new Error('Network error. Please check connection');
      } else if (error.message?.includes('Contract will reject')) {
        throw error; // Already has good message
      } else if (error.code === 'CALL_EXCEPTION') {
        throw new Error('Contract call failed. Ensure you are on Flow testnet');
      }
      
      throw new Error(`Registration failed: ${error.message || 'Unknown error'}`);
    }
  }
};

interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: string;
  chainId: number | null;
  isLoading: boolean;
  error: string | null;
  username: string | null;
  isRegistered: boolean;
  isOnFlowTestnet: boolean;
}

export const useWalletConnect = () => {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    address: null,
    balance: '0',
    chainId: null,
    isLoading: false,
    error: null,
    username: null,
    isRegistered: false,
    isOnFlowTestnet: false
  });

  // Listen to wallet state changes
  useEffect(() => {
    const handleStateChange = (walletState: any) => {
      console.log('Wallet state changed:', walletState);
      
      setState(prev => ({
        ...prev,
        isConnected: walletState.isConnected,
        address: walletState.address,
        chainId: walletState.chainId,
        isOnFlowTestnet: walletState.chainId === 545,
        isLoading: false
      }));

      if (walletState.isConnected && walletState.chainId !== 545) {
        console.log('Connected to wrong network, will attempt to switch...');
      }

      if (walletState.address && walletState.address !== state.address) {
        loadUsernameForAddress(walletState.address);
      }
    };

    walletConnectService.addStateChangeListener(handleStateChange);
    return () => walletConnectService.removeStateChangeListener(handleStateChange);
  }, [state.address]);

  const loadUsernameForAddress = useCallback(async (address: string) => {
    try {
      const username = await simpleContractService.getUsernameByAddress(address);
      const isRegistered = !!username;
      
      setState(prev => ({ ...prev, username, isRegistered }));

      await AsyncStorage.setItem('@wallet_connected', JSON.stringify({
        address,
        chainId: state.chainId,
        username,
        isRegistered,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error loading username:', error);
    }
  }, [state.chainId]);

  useEffect(() => {
    initializeWallet();
  }, []);

  const initializeWallet = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      await walletConnectService.initializeWalletConnect();
      const status = walletConnectService.getConnectionStatus();
      console.log('Current wallet status:', status);

      if (status.isConnected && status.address) {
        console.log('Found existing connection');
        setState(prev => ({
          ...prev,
          isConnected: true,
          address: status.address,
          chainId: status.chainId,
          isOnFlowTestnet: status.chainId === 545,
          isLoading: false
        }));

        await loadUsernameForAddress(status.address);
        
        try {
          const balance = await walletConnectService.getBalance();
          setState(prev => ({ ...prev, balance }));
        } catch (error) {
          console.error('Error getting balance:', error);
        }
      } else {
        console.log('No existing connection found');
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Failed to initialize wallet:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to initialize wallet connection',
        isLoading: false 
      }));
    }
  }, [loadUsernameForAddress]);

  const updateBalance = useCallback(async () => {
    if (!state.address) return;
    try {
      const newBalance = await walletConnectService.getBalance();
      setState(prev => ({ ...prev, balance: newBalance }));
    } catch (error) {
      console.error('Error updating balance:', error);
    }
  }, [state.address]);

  const connect = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const result = await walletConnectService.connectWallet();
      console.log('Wallet connected:', result);

      if (result.address) {
        try {
          const balance = await walletConnectService.getBalance();
          setState(prev => ({ ...prev, balance }));
        } catch (error) {
          console.error('Error getting balance:', error);
        }
      }
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message || 'Failed to connect wallet',
        isLoading: false 
      }));
      throw error;
    }
  }, []);

  const reconnect = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      console.log('Force reconnecting wallet...');
      await walletConnectService.disconnect();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await connect();
    } catch (error: any) {
      console.error('Failed to reconnect wallet:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message || 'Failed to reconnect wallet',
        isLoading: false 
      }));
      throw error;
    }
  }, [connect]);

  const disconnect = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await walletConnectService.disconnect();
      await AsyncStorage.removeItem('@wallet_connected');
    } catch (error: any) {
      console.error('Failed to disconnect wallet:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message || 'Failed to disconnect wallet',
        isLoading: false 
      }));
    }
  }, []);

  const switchToFlowTestnet = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      await walletConnectService.switchToFlowTestnet();
      
      setTimeout(() => {
        setState(prev => ({ ...prev, isLoading: false }));
      }, 2000);
    } catch (error: any) {
      console.error('Failed to switch to Flow testnet:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to switch to Flow testnet. Please switch manually in MetaMask.',
        isLoading: false 
      }));
      throw error;
    }
  }, []);

  const registerUsername = useCallback(async (username: string) => {
    try {
      if (!state.isConnected || !state.address) {
        throw new Error('Wallet not connected');
      }

      if (state.chainId !== 545) {
        throw new Error('Please switch to Flow testnet first');
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      console.log('Starting username registration for:', username);
      console.log('Current state:', { 
        address: state.address, 
        chainId: state.chainId, 
        isConnected: state.isConnected 
      });

      console.log('Checking username availability...');
      const isAvailable = await simpleContractService.isUsernameAvailable(username);
      if (!isAvailable) {
        throw new Error('Username is already taken');
      }
      console.log('Username is available');

      console.log('Registering username on contract...');
      await simpleContractService.registerUser(username);
      console.log('Username registered successfully');

      setState(prev => ({
        ...prev,
        username: username.toLowerCase(),
        isRegistered: true,
        isLoading: false
      }));

      await AsyncStorage.setItem('@wallet_connected', JSON.stringify({
        address: state.address,
        chainId: state.chainId,
        username: username.toLowerCase(),
        isRegistered: true,
        timestamp: Date.now()
      }));

      return true;
    } catch (error: any) {
      console.error('Failed to register username:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message || 'Failed to register username',
        isLoading: false 
      }));
      throw error;
    }
  }, [state.isConnected, state.address, state.chainId]);

  const checkUsernameAvailability = useCallback(async (username: string): Promise<boolean> => {
    try {
      return await simpleContractService.isUsernameAvailable(username);
    } catch (error) {
      console.error('Error checking username availability:', error);
      return false;
    }
  }, []);

  const loadUsername = useCallback(async (address: string) => {
    try {
      const username = await simpleContractService.getUsernameByAddress(address);
      if (username) {
        setState(prev => ({ ...prev, username, isRegistered: true }));
      }
      return username;
    } catch (error) {
      console.error('Failed to load username:', error);
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    isConnected: state.isConnected,
    address: state.address,
    balance: state.balance,
    chainId: state.chainId,
    isLoading: state.isLoading,
    error: state.error,
    username: state.username,
    isRegistered: state.isRegistered,
    isOnFlowTestnet: state.isOnFlowTestnet,
    
    // Actions
    connect,
    disconnect,
    reconnect,
    switchToFlowTestnet,
    updateBalance,
    registerUsername,
    checkUsernameAvailability,
    loadUsername,
    clearError,
    
    // Computed
    shortAddress: state.address ? `${state.address.slice(0, 6)}...${state.address.slice(-4)}` : null,
  };
};