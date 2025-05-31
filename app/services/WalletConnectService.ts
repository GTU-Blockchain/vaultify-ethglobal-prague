import AsyncStorage from '@react-native-async-storage/async-storage';
import SignClient from '@walletconnect/sign-client';
import { ethers } from 'ethers';
import { metamaskLink } from '../utils/metamaskLink';

class WalletConnectService {
  private client: SignClient | null = null;
  private address: string | null = null;
  private chainId: number | null = null;
  private isConnected: boolean = false;

  // Initialize WalletConnect
  async initializeWalletConnect() {
    if (this.client) {
      return this.client;
    }

    try {
      this.client = await SignClient.init({
        projectId: '205f9f4f572034908def5cdd527e6890',
        metadata: {
          name: 'SnapVault',
          description: 'SnapVault - Secure Snaps on Flow',
          url: 'https://snapvault.app',
          icons: ['https://snapvault.app/icon.png']
        }
      });

      // Subscribe to events
      this.client.on('session_event', ({ params }) => {
        console.log('Session event:', params);
      });

      this.client.on('session_update', ({ topic, params }) => {
        console.log('Session updated:', topic, params);
        // Handle account/chain changes
        this.handleSessionUpdate(params);
      });

      this.client.on('session_delete', () => {
        console.log('Session deleted');
        this.handleDisconnection();
      });

      return this.client;
    } catch (error) {
      console.error('Failed to initialize WalletConnect:', error);
      throw error;
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
        await this.handleConnection(session);
        return {
          address: this.address,
          chainId: this.chainId
        };
      }

      // Create new session with proper configuration
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
        },
        optionalNamespaces: {
          eip155: {
            methods: ['eth_accounts', 'eth_requestAccounts'],
            chains: ['eip155:1', 'eip155:137', 'eip155:545'], // Support multiple chains
            events: []
          }
        }
      });

      if (!uri) {
        throw new Error('Failed to generate WalletConnect URI');
      }

      console.log('Generated WalletConnect URI:', uri);

      // Open MetaMask with URI
      const linkResult = await metamaskLink.connect(uri);
      
      if (!linkResult) {
        console.log('Please scan the QR code manually in MetaMask');
        console.log('URI:', uri);
      }

      // Wait for approval with timeout
      const session = await Promise.race([
        approval(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout after 2 minutes')), 120000)
        )
      ]);

      console.log('Session approved:', session);

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

  // Handle session updates
  private handleSessionUpdate(params: any) {
    if (params.accounts) {
      const account = params.accounts[0];
      if (account) {
        const parts = account.split(':');
        this.address = parts[2];
        console.log('Account updated:', this.address);
      }
    }

    if (params.chainId) {
      this.chainId = parseInt(params.chainId);
      console.log('Chain updated:', this.chainId);
    }
  }

  // Handle successful connection
  private async handleConnection(session: any) {
    try {
      const accounts = session.namespaces.eip155.accounts;
      if (accounts && accounts.length > 0) {
        const accountParts = accounts[0].split(':');
        this.address = accountParts[2];
        this.chainId = parseInt(accountParts[1]);
        this.isConnected = true;

        console.log('Connected:', { address: this.address, chainId: this.chainId });

        // Save connection state
        await AsyncStorage.setItem('@wallet_connected', JSON.stringify({
          address: this.address,
          chainId: this.chainId
        }));

        // Switch to Flow testnet if needed
        if (this.chainId !== 545) {
          try {
            await this.switchToFlowTestnet();
          } catch (error) {
            console.log('Could not switch to Flow testnet automatically:', error);
          }
        }
      } else {
        throw new Error('No accounts found in session');
      }
    } catch (error) {
      console.error('Error handling connection:', error);
      throw error;
    }
  }

  // Handle disconnection
  private async handleDisconnection() {
    this.address = null;
    this.chainId = null;
    this.isConnected = false;
    
    await AsyncStorage.removeItem('@wallet_connected');
    console.log('Wallet disconnected');
  }

  // Switch to Flow EVM Testnet
  async switchToFlowTestnet() {
    if (!this.client || !this.isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      const sessions = this.client.session.getAll();
      if (sessions.length === 0) throw new Error('No active session');
      
      const session = sessions[0];

      await this.client.request({
        topic: session.topic,
        chainId: 'eip155:545',
        request: {
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x221' }] // 545 in hex
        }
      });

      this.chainId = 545;
      console.log('Switched to Flow testnet');
    } catch (error: any) {
      console.log('Switch error:', error);
      // If network doesn't exist, add it
      if (error.code === 4902 || error.message?.includes('Unrecognized chain')) {
        await this.addFlowNetwork();
      } else {
        throw error;
      }
    }
  }

  // Add Flow EVM Testnet to MetaMask
  private async addFlowNetwork() {
    if (!this.client || !this.isConnected) {
      throw new Error('Wallet not connected');
    }

    const sessions = this.client.session.getAll();
    if (sessions.length === 0) throw new Error('No active session');
    
    const session = sessions[0];

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

    this.chainId = 545;
    console.log('Added and switched to Flow testnet');
  }

  // Disconnect wallet
  async disconnect() {
    try {
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

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      address: this.address,
      chainId: this.chainId
    };
  }

  // Restore session from storage
  async restoreSession() {
    try {
      const stored = await AsyncStorage.getItem('@wallet_connected');
      if (stored) {
        const { address, chainId } = JSON.parse(stored);
        
        // Check if we have an active WalletConnect session
        await this.initializeWalletConnect();
        if (this.client) {
          const sessions = this.client.session.getAll();
          if (sessions.length > 0) {
            this.address = address;
            this.chainId = chainId;
            this.isConnected = true;
            return true;
          }
        }
      }
    } catch (error) {
      console.error('Error restoring session:', error);
    }
    
    await this.handleDisconnection();
    return false;
  }

  // Get signer for transactions
  getSigner() {
    if (!this.client || !this.isConnected) {
      throw new Error('Wallet not connected');
    }

    const sessions = this.client.session.getAll();
    if (sessions.length === 0) {
      throw new Error('No active session');
    }

    const session = sessions[0];

    const provider = new ethers.BrowserProvider({
      request: async ({ method, params }) => {
        const result = await this.client?.request({
          topic: session.topic,
          chainId: 'eip155:545',
          request: {
            method,
            params
          }
        });

        return result;
      }
    });

    return provider.getSigner();
  }
}

// Export singleton instance
export const walletConnectService = new WalletConnectService();