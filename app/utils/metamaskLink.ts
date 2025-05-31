import { Linking, Platform, Alert } from 'react-native';

interface MetaMaskLinkConfig {
  scheme: string;
  universalLink: string;
  bundleId: string;
}

class MetaMaskLink {
  private config: MetaMaskLinkConfig;

  constructor(config: MetaMaskLinkConfig) {
    this.config = config;
  }

  async connect(uri: string): Promise<boolean> {
    try {
      console.log('Connecting with URI:', uri);
      
      // First check if MetaMask is installed
      const isMetaMaskInstalled = await this.checkMetaMaskInstalled();
      
      if (!isMetaMaskInstalled) {
        const downloadUrl = this.getDownloadUrl();
        await Linking.openURL(downloadUrl);
        throw new Error('MetaMask not installed. Please install MetaMask and try again.');
      }

      // Clean the URI - remove any existing encoding
      const cleanUri = decodeURIComponent(uri);
      
      // Try the new MetaMask deep link format (recommended)
      const metamaskDeepLink = `https://metamask.app.link/wc?uri=${encodeURIComponent(cleanUri)}`;
      
      console.log('Opening MetaMask with link:', metamaskDeepLink);
      await Linking.openURL(metamaskDeepLink);
      return true;

    } catch (error) {
      console.error('MetaMask connection failed:', error);
      
      // Fallback: try opening MetaMask directly
      try {
        await this.openMetaMask();
        // Show the URI in console so user can manually scan
        console.log('Please scan this QR code in MetaMask:', uri);
        return false;
      } catch (fallbackError) {
        throw error;
      }
    }
  }

  async openMetaMask(): Promise<boolean> {
    try {
      const isMetaMaskInstalled = await this.checkMetaMaskInstalled();
      
      if (!isMetaMaskInstalled) {
        const downloadUrl = this.getDownloadUrl();
        await Linking.openURL(downloadUrl);
        throw new Error('MetaMask not installed. Please install MetaMask and try again.');
      }

      // Try multiple deep link formats
      const deepLinks = [
        'metamask://',
        'https://metamask.app.link/'
      ];

      for (const link of deepLinks) {
        try {
          const canOpen = await Linking.canOpenURL(link);
          if (canOpen) {
            await Linking.openURL(link);
            return true;
          }
        } catch (error) {
          console.log(`Failed to open ${link}:`, error);
          continue;
        }
      }

      throw new Error('Could not open MetaMask');
    } catch (error) {
      console.error('Failed to open MetaMask:', error);
      throw error;
    }
  }

  // 👈 NEW: Open MetaMask for transaction approval
  async openForTransaction(): Promise<boolean> {
    try {
      console.log('Opening MetaMask for transaction approval...');
      const opened = await this.openMetaMask();
      
      if (!opened) {
        // Show user-friendly message if can't open automatically
        Alert.alert(
          'Transaction Approval Required',
          'Please open MetaMask to approve the transaction',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open MetaMask', 
              onPress: () => this.openMetaMask()
            }
          ]
        );
      }
      
      return opened;
    } catch (error) {
      console.error('Error opening MetaMask for transaction:', error);
      
      // Show alert as fallback
      Alert.alert(
        'Open MetaMask',
        'Please open MetaMask manually to approve the transaction',
        [
          { text: 'OK' }
        ]
      );
      
      return false;
    }
  }

  // 👈 NEW: Open MetaMask for network switching
  async openForNetworkSwitch(): Promise<boolean> {
    try {
      console.log('Opening MetaMask for network switch...');
      const opened = await this.openMetaMask();
      
      if (!opened) {
        // Show user-friendly message if can't open automatically
        Alert.alert(
          'Network Switch Required',
          'Please open MetaMask to approve the network switch to Flow testnet',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open MetaMask', 
              onPress: () => this.openMetaMask()
            }
          ]
        );
      }
      
      return opened;
    } catch (error) {
      console.error('Error opening MetaMask for network switch:', error);
      
      // Show alert as fallback
      Alert.alert(
        'Open MetaMask',
        'Please open MetaMask manually to switch to Flow testnet',
        [
          { text: 'OK' }
        ]
      );
      
      return false;
    }
  }

  // 👈 NEW: Show pending approval message with option to open MetaMask
  showPendingApproval(type: 'transaction' | 'network' | 'signature' = 'transaction'): void {
    const messages = {
      transaction: 'Transaction pending approval in MetaMask',
      network: 'Network switch pending approval in MetaMask',
      signature: 'Signature pending approval in MetaMask'
    };
    
    const message = messages[type];
      
    Alert.alert(
      'Approval Required',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open MetaMask', 
          onPress: () => this.openMetaMask()
        }
      ]
    );
  }

  private async checkMetaMaskInstalled(): Promise<boolean> {
    try {
      // Check multiple possible deep link formats
      const deepLinks = [
        'metamask://',
        'https://metamask.app.link/'
      ];

      for (const link of deepLinks) {
        try {
          const canOpen = await Linking.canOpenURL(link);
          if (canOpen) {
            console.log(`MetaMask detected via ${link}`);
            return true;
          }
        } catch (error) {
          continue;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking MetaMask installation:', error);
      return false;
    }
  }

  private getDownloadUrl(): string {
    return Platform.select({
      ios: 'https://apps.apple.com/app/metamask/id1438144202',
      android: 'https://play.google.com/store/apps/details?id=io.metamask',
      default: 'https://metamask.io/download/'
    }) || 'https://metamask.io/download/';
  }

  // Method to handle the return from MetaMask
  async handleDeepLink(url: string): Promise<void> {
    console.log('Received deep link:', url);
    // Handle the response from MetaMask here if needed
  }
}

// Create and export a singleton instance with default config
export const metamaskLink = new MetaMaskLink({
  scheme: 'snapvault',
  universalLink: 'https://snapvault.app',
  bundleId: 'com.snapvault.app'
});