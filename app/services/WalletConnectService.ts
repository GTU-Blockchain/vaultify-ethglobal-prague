import AsyncStorage from '@react-native-async-storage/async-storage';
import SignClient from '@walletconnect/sign-client';
import { ethers } from 'ethers';
import { metamaskLink } from '../utils/metamaskLink';


class WalletConnectService {
  private client: SignClient | null = null;
  private address: string | null = null;
  private chainId: number | null = null;
  private isConnected: boolean = false;
  private initializationPromise: Promise<SignClient> | null = null;

  // State change listeners
  private stateChangeListeners: ((state: any) => void)[] = [];

  // Add state change listener
  addStateChangeListener(listener: (state: any) => void) {
    this.stateChangeListeners.push(listener);
  }

  // Remove state change listener
  removeStateChangeListener(listener: (state: any) => void) {
    this.stateChangeListeners = this.stateChangeListeners.filter(l => l !== listener);
  }

  // Notify state change (debounced to prevent spam)
  private debounceTimer: NodeJS.Timeout | null = null;
  private notifyStateChange() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      const state = {
        isConnected: this.isConnected,
        address: this.address,
        chainId: this.chainId
      };
      
      console.log('State changed, notifying listeners:', state);
      this.stateChangeListeners.forEach(listener => {
        try {
          listener(state);
        } catch (error) {
          console.error('Error in state change listener:', error);
        }
      });
    }, 500); // 500ms debounce
  }

  // Initialize WalletConnect
  async initializeWalletConnect() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    if (this.client) {
      return this.client;
    }

    this.initializationPromise = this._initialize();
    return this.initializationPromise;
  }

  private async _initialize() {
    try {
      console.log('Initializing WalletConnect client...');
      
      this.client = await SignClient.init({
        projectId: '205f9f4f572034908def5cdd527e6890',
        metadata: {
          name: 'SnapVault',
          description: 'SnapVault - Secure Snaps on Flow',
          url: 'https://snapvault.app',
          icons: ['https://snapvault.app/icon.png']
        }
      });

      console.log('WalletConnect client initialized');

      // Subscribe to events with proper error handling
      this.client.on('session_event', ({ params }) => {
        console.log('Session event:', params);
        try {
          // Handle chain changes with debouncing
          if (params.event.name === 'chainChanged') {
            const newChainId = typeof params.event.data === 'string' 
              ? parseInt(params.event.data, 16) 
              : params.event.data;
            
            if (newChainId !== this.chainId) {
              console.log('Chain changed to:', newChainId);
              this.chainId = newChainId;
              this.notifyStateChange();
            }
          }
        } catch (error) {
          console.error('Error handling session event:', error);
        }
      });

      this.client.on('session_update', ({ topic, params }) => {
        console.log('Session updated:', topic);
        try {
          this.handleSessionUpdate(params);
        } catch (error) {
          console.error('Error handling session update:', error);
        }
      });

      this.client.on('session_delete', () => {
        console.log('Session deleted');
        this.handleDisconnection();
      });

      // Add error handler to prevent unhandled events
      this.client.on('session_request', (event) => {
        console.log('Session request received:', event.id);
      });

      // Check for existing sessions
      await this.restoreExistingSessions();

      return this.client;
    } catch (error) {
      console.error('Failed to initialize WalletConnect:', error);
      this.initializationPromise = null;
      throw error;
    }
  }

  // Check and restore existing sessions
  private async restoreExistingSessions() {
    try {
      if (!this.client) return;

      const sessions = this.client.session.getAll();
      console.log('Found existing sessions:', sessions.length);

      if (sessions.length > 0) {
        const session = sessions[0];
        console.log('Restoring session:', session.topic);
        await this.handleConnection(session);
      }
    } catch (error) {
      console.error('Error restoring sessions:', error);
    }
  }

  // Connect to MetaMask
  async connectWallet() {
    try {
      await this.initializeWalletConnect();

      if (!this.client) {
        throw new Error('WalletConnect not initialized');
      }

      // Check for existing sessions first
      const existingSessions = this.client.session.getAll();
      if (existingSessions.length > 0) {
        const session = existingSessions[0];
        console.log('Using existing session');
        await this.handleConnection(session);
        return {
          address: this.address,
          chainId: this.chainId
        };
      }

      console.log('Creating new WalletConnect session...');

      // Create new session - requesting Flow testnet
      const { uri, approval } = await this.client.connect({
        requiredNamespaces: {
          eip155: {
            methods: [
              'eth_sendTransaction',
              'eth_signTransaction', 
              'eth_sign',
              'personal_sign',
              'eth_signTypedData',
              'wallet_switchEthereumChain',
              'wallet_addEthereumChain'
            ],
            chains: ['eip155:545'], // Flow EVM Testnet
            events: ['chainChanged', 'accountsChanged']
          }
        }
      });

      if (!uri) {
        throw new Error('Failed to generate WalletConnect URI');
      }

      console.log('Generated WalletConnect URI');

      // Open MetaMask with URI
      await metamaskLink.connect(uri);

      // Wait for approval
      console.log('Waiting for session approval...');
      const session = await approval();

      console.log('Session approved:', session.topic);

      // Handle successful connection
      await this.handleConnection(session);

      return {
        address: this.address,
        chainId: this.chainId
      };
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }

  // Handle session updates (simplified)
  private async handleSessionUpdate(params: any) {
    try {
      if (params.accounts && params.accounts.length > 0) {
        const account = params.accounts[0];
        if (account) {
          const parts = account.split(':');
          if (parts.length >= 3) {
            const newAddress = parts[2];
            if (newAddress !== this.address) {
              this.address = newAddress;
              console.log('Account updated:', this.address);
              this.notifyStateChange();
            }
          }
        }
      }
    } catch (error) {
      console.error('Error handling session update:', error);
    }
  }

  // Handle successful connection
  private async handleConnection(session: any) {
    try {
      console.log('Handling connection with session:', session.topic);
      
      const accounts = session.namespaces.eip155?.accounts;
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found in session');
      }

      const accountParts = accounts[0].split(':');
      if (accountParts.length < 3) {
        throw new Error('Invalid account format');
      }

      this.address = accountParts[2];
      this.chainId = parseInt(accountParts[1]);
      this.isConnected = true;

      console.log('Connection handled:', { 
        address: this.address, 
        chainId: this.chainId,
        isConnected: this.isConnected 
      });

      // Save connection state
      await this.updateSavedState();

      // Notify listeners of connection
      this.notifyStateChange();

    } catch (error) {
      console.error('Error handling connection:', error);
      throw error;
    }
  }

  // Update saved state in AsyncStorage
  private async updateSavedState() {
    try {
      if (this.address && this.chainId !== null) {
        await AsyncStorage.setItem('@wallet_connected', JSON.stringify({
          address: this.address,
          chainId: this.chainId,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error('Error updating saved state:', error);
    }
  }

  // Handle disconnection
  private async handleDisconnection() {
    console.log('Handling disconnection...');
    
    this.address = null;
    this.chainId = null;
    this.isConnected = false;
    
    await AsyncStorage.removeItem('@wallet_connected');
    console.log('Wallet disconnected and state cleared');
    
    // Notify listeners of disconnection
    this.notifyStateChange();
  }

  // Switch to Flow EVM Testnet WITH MetaMask routing
  async switchToFlowTestnet() {
    if (!this.client || !this.isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      const sessions = this.client.session.getAll();
      if (sessions.length === 0) throw new Error('No active session');
      
      const session = sessions[0];

      console.log('Attempting to switch to Flow testnet...');

      // 👈 OPEN METAMASK FOR APPROVAL
      await metamaskLink.openForNetworkSwitch();

      // First try to switch
      try {
        await this.client.request({
          topic: session.topic,
          chainId: 'eip155:545',
          request: {
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x221' }] // 545 in hex
          }
        });

        console.log('Switch request sent');

      } catch (switchError: any) {
        console.log('Switch failed, trying to add network:', switchError.message);
        
        // If switch fails, try to add the network
        if (switchError.code === 4902 || switchError.message?.includes('Unrecognized chain')) {
          await this.addFlowNetwork();
        } else {
          throw switchError;
        }
      }
    } catch (error) {
      console.error('Error switching to Flow testnet:', error);
      throw error;
    }
  }

  // Add Flow EVM Testnet to MetaMask WITH MetaMask routing
  private async addFlowNetwork() {
    if (!this.client || !this.isConnected) {
      throw new Error('Wallet not connected');
    }

    const sessions = this.client.session.getAll();
    if (sessions.length === 0) throw new Error('No active session');
    
    const session = sessions[0];

    try {
      console.log('Adding Flow network to wallet...');
      
      // 👈 OPEN METAMASK FOR APPROVAL
      await metamaskLink.openForNetworkSwitch();
      
      await this.client.request({
        topic: session.topic,
        chainId: 'eip155:545',
        request: {
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x221', // 545 in hex
            chainName: 'Flow EVM Testnet',
            nativeCurrency: {
              name: 'FLOW',
              symbol: 'FLOW',
              decimals: 18
            },
            rpcUrls: ['https://testnet.evm.nodes.onflow.org'],
            blockExplorerUrls: ['https://evm-testnet.flowscan.org']
          }]
        }
      });

      console.log('Flow network add request sent');

    } catch (error) {
      console.error('Error adding Flow network:', error);
      throw error;
    }
  }

  // Disconnect wallet
  async disconnect() {
    try {
      console.log('Disconnecting wallet...');
      
      if (this.client && this.isConnected) {
        const sessions = this.client.session.getAll();
        for (const session of sessions) {
          if (session?.topic) {
            await this.client.disconnect({
              topic: session.topic,
              reason: {
                code: 6000,
                message: 'User disconnected'
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Error during disconnect:', error);
    } finally {
      await this.handleDisconnection();
    }
  }

  // Get balance
  async getBalance() {
    if (!this.address) return '0';

    try {
      const provider = new ethers.JsonRpcProvider('https://testnet.evm.nodes.onflow.org');
      const balance = await provider.getBalance(this.address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting balance:', error);
      return '0';
    }
  }

  // Send transaction using WalletConnect WITH MetaMask routing
  async sendTransaction(params: any) {
    if (!this.client || !this.isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      const sessions = this.client.session.getAll();
      if (sessions.length === 0) throw new Error('No active session');
      
      const session = sessions[0];

      console.log('Sending transaction via WalletConnect...');

      // 👈 OPEN METAMASK FOR APPROVAL
      await metamaskLink.openForTransaction();

      const result = await this.client.request({
        topic: session.topic,
        chainId: `eip155:${this.chainId}`,
        request: {
          method: 'eth_sendTransaction',
          params: [params]
        }
      });

      console.log('Transaction sent:', result);
      return result;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  }

  // Sign message using WalletConnect WITH MetaMask routing
  async signMessage(message: string) {
    if (!this.client || !this.isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      const sessions = this.client.session.getAll();
      if (sessions.length === 0) throw new Error('No active session');
      
      const session = sessions[0];

      // 👈 OPEN METAMASK FOR APPROVAL
      await metamaskLink.openForTransaction();

      const result = await this.client.request({
        topic: session.topic,
        chainId: `eip155:${this.chainId}`,
        request: {
          method: 'personal_sign',
          params: [ethers.hexlify(ethers.toUtf8Bytes(message)), this.address]
        }
      });

      return result;
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      address: this.address,
      chainId: this.chainId
    };
  }

  // Check if on correct network
  isOnFlowTestnet(): boolean {
    return this.chainId === 545;
  }

  // Get current address
  getCurrentAddress(): string | null {
    return this.address;
  }

  // Check if wallet is connected
  isWalletConnected(): boolean {
    return this.isConnected && this.address !== null && this.chainId !== null;
  }

  // Force reconnect wallet (useful when connection is stale)
  async reconnect() {
    try {
      console.log('Force reconnecting wallet...');
      
      // Disconnect first
      await this.disconnect();
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Connect again
      return await this.connectWallet();
      
    } catch (error) {
      console.error('Failed to reconnect wallet:', error);
      throw error;
    }
  }

  // Create a simple custom signer that uses WalletConnect directly
  createCustomSigner() {
    if (!this.isConnected || !this.address) {
      throw new Error('Wallet not connected');
    }

    const provider = new ethers.JsonRpcProvider('https://testnet.evm.nodes.onflow.org');

    return {
      provider, // Add provider property for ContractRunner interface
      getAddress: () => Promise.resolve(this.address!),
      sendTransaction: async (transaction: any) => {
        // Prepare transaction
        const tx = {
          from: this.address,
          to: transaction.to,
          data: transaction.data,
          value: transaction.value || '0x0',
          gas: transaction.gasLimit || '0x30d40', // 200000
          gasPrice: transaction.gasPrice || '0x3b9aca00' // 1 gwei
        };

        const txHash = await this.sendTransaction(tx);
        
        // Wait for transaction receipt
        let receipt = null;
        let attempts = 0;
        while (!receipt && attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          try {
            receipt = await provider.getTransactionReceipt(txHash as string);
          } catch (error) {
            // Continue waiting
          }
          attempts++;
        }

        if (!receipt) {
          throw new Error('Transaction receipt not found');
        }

        return {
          hash: txHash,
          wait: () => Promise.resolve(receipt)
        };
      },
      signMessage: (message: string) => this.signMessage(message)
    };
  }
}

// Export singleton instance
export const walletConnectService = new WalletConnectService();