import { ethers } from 'ethers';
import { ipfsService, VaultMetadata } from './IPFSService';
import { walletConnectService } from './WalletConnectService';

// Import ABI directly as array
const SnapVaultABI = require('../../contracts/SnapVaultABI.js');

interface CreateVaultParams {
  vaultName: string;
  unlockDate: string;
  content: string;
  recipientAddress: string;
  flowAmount: string;
  mediaUri?: string;
  mediaType?: 'photo' | 'video';
}

interface VaultData {
  id: number;
  senderUsername: string;
  recipientUsername: string;
  ipfsCID: string;
  message: string;
  flowAmount: string;
  createdAt: number;
  unlockAt: number;
  isOpened: boolean;
  snapType: number; // 0 = Instant, 1 = Timed
}

class VaultService {
  private contractAddress: string;
  private contract: ethers.Contract | null = null;

  constructor() {
    // Replace with your deployed contract address on Flow testnet
    this.contractAddress = process.env.EXPO_PUBLIC_VAULT_CONTRACT_ADDRESS || '0x...';
  }

  /**
   * Initialize contract instance
   */
  private async getContract(): Promise<ethers.Contract> {
    if (!this.contract) {
      if (!walletConnectService.isWalletConnected()) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }

      try {
        console.log('📋 Contract address:', this.contractAddress);
        console.log('📋 ABI type:', typeof SnapVaultABI);
        console.log('📋 ABI is array:', Array.isArray(SnapVaultABI));
        console.log('📋 ABI length:', Array.isArray(SnapVaultABI) ? SnapVaultABI.length : 'Not an array');
        
        if (!Array.isArray(SnapVaultABI)) {
          throw new Error('ABI is not an array. Check ABI file format.');
        }
        
        const provider = new ethers.JsonRpcProvider('https://testnet.evm.nodes.onflow.org');
        this.contract = new ethers.Contract(this.contractAddress, SnapVaultABI, provider);
        
        console.log('✅ Contract initialized successfully');
      } catch (error) {
        console.error('❌ Contract initialization failed:', error);
        throw new Error(`Failed to initialize contract: ${error}`);
      }
    }
    return this.contract;
  }

  /**
   * Send transaction using WalletConnect
   */
  private async sendContractTransaction(contract: ethers.Contract, methodName: string, args: any[], value?: string) {
    try {
      // Prepare transaction data
      const data = contract.interface.encodeFunctionData(methodName, args);
      
      // Convert value to hex if provided
      let hexValue = '0x0';
      if (value && value !== '0') {
        console.log('💰 Converting value:', value);
        try {
          // Parse as Ether amount and convert to Wei, then to hex
          const weiValue = ethers.parseEther(value);
          hexValue = '0x' + weiValue.toString(16);
          console.log('💰 Converted to hex:', hexValue);
        } catch (conversionError) {
          console.error('❌ Value conversion error:', conversionError);
          throw new Error(`Invalid value format: ${value}`);
        }
      }
      
      const fromAddress = walletConnectService.getCurrentAddress();
      const tx: any = {
        to: this.contractAddress,
        data,
        value: hexValue,
        from: fromAddress
      };

      console.log('📡 Transaction object before gas estimation:', {
        to: tx.to,
        from: tx.from,
        value: tx.value,
        dataLength: tx.data.length
      });

      // Try to estimate gas
      try {
        const provider = new ethers.JsonRpcProvider('https://testnet.evm.nodes.onflow.org');
        const gasEstimate = await provider.estimateGas(tx);
        console.log('⛽ Gas estimate:', gasEstimate.toString());
        
        // Add some buffer to gas limit
        const gasLimit = gasEstimate * BigInt(120) / BigInt(100); // Add 20% buffer
        console.log('⛽ Gas limit with buffer:', gasLimit.toString());
        
        // Add gas limit to transaction
        tx.gas = '0x' + gasLimit.toString(16);
        console.log('⛽ Gas limit hex:', tx.gas);
        
      } catch (gasError) {
        console.error('⚠️ Gas estimation failed:', gasError);
        console.log('⚠️ Proceeding without gas estimation...');
      }
      
      console.log('📡 Final transaction object:', tx);
      const txHash = await walletConnectService.sendTransaction(tx);
      
      console.log('🔗 Transaction hash:', txHash);
      
      // Wait for receipt with better error handling
      const provider = new ethers.JsonRpcProvider('https://testnet.evm.nodes.onflow.org');
      let receipt = null;
      let attempts = 0;
      const maxAttempts = 30;
      
      console.log('⏳ Waiting for transaction receipt...');
      
      while (!receipt && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          receipt = await provider.getTransactionReceipt(txHash as string);
          if (receipt) {
            console.log('📄 Receipt received:', {
              status: receipt.status,
              gasUsed: receipt.gasUsed?.toString(),
              blockNumber: receipt.blockNumber,
              transactionHash: receipt.hash
            });
            
            if (receipt.status === 0) {
              throw new Error(`Transaction failed on-chain. Hash: ${receipt.hash}`);
            }
          }
        } catch (receiptError) {
          console.log(`⏳ Attempt ${attempts + 1}/${maxAttempts}: Receipt not ready yet`);
        }
        attempts++;
      }

      if (!receipt) {
        throw new Error(`Transaction receipt not found after ${maxAttempts} attempts. Hash: ${txHash}`);
      }

      return {
        hash: txHash,
        wait: () => Promise.resolve(receipt),
        logs: receipt.logs
      };
    } catch (error: any) {
      console.error('❌ Transaction failed:', error);
      console.error('❌ Error stack:', error.stack);
      
      // Provide more specific error messages
      const errorMessage = error.message || error.toString();
      
      console.log('🔍 Full error analysis:');
      console.log('  - Error message:', errorMessage);
      console.log('  - Error type:', error.name);
      console.log('  - Contains "recipient":', errorMessage.toLowerCase().includes('recipient'));
      console.log('  - Contains "not found":', errorMessage.toLowerCase().includes('not found'));
      console.log('  - Contains "register":', errorMessage.toLowerCase().includes('register'));
      
      if (errorMessage.includes('Failed to upload media')) {
        throw new Error('Media upload failed. Please check your Lighthouse API key and internet connection.');
      } else if (errorMessage.includes('insufficient funds')) {
        throw new Error('Insufficient FLOW balance. Please add more FLOW to your wallet.');
      } else if (errorMessage.includes('user rejected')) {
        throw new Error('Transaction was rejected by user.');
      } else if (errorMessage.includes('FLOW payment required')) {
        throw new Error('Flow payment is required to create a vault.');
      } else if (errorMessage.toLowerCase().includes('recipient not found') || errorMessage.toLowerCase().includes('recipient does not exist')) {
        throw new Error('Recipient address is not registered on the platform. The recipient must register a username first before they can receive vaults.');
      } else if (errorMessage.toLowerCase().includes('recipient') && errorMessage.toLowerCase().includes('register')) {
        throw new Error('Both sender and recipient must have registered usernames to create vaults.');
      } else if (errorMessage.includes('Can\'t send to yourself')) {
        throw new Error('You cannot send a vault to yourself.');
      } else if (errorMessage.includes('Register username first')) {
        throw new Error('Please register a username before creating vaults.');
      } else if (errorMessage.includes('Wallet not connected')) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }
      
      throw error;
    }
  }

  /**
   * Register username for current wallet
   */
  async registerUsername(username: string): Promise<boolean> {
    try {
      console.log('Registering username:', username);
      
      const contract = await this.getContract();
      
      // Check if username is available
      const isAvailable = await contract.isUsernameAvailable(username);
      if (!isAvailable) {
        throw new Error('Username is already taken. Please choose a different one.');
      }

      // Use sendContractTransaction instead of direct contract call
      const receipt = await this.sendContractTransaction(
        contract,
        'registerUsername',
        [username],
        '0' // No value needed for username registration
      );

      console.log('Username registered successfully:', username);
      console.log('Transaction hash:', receipt.hash);
      return true;

    } catch (error: any) {
      console.error('Error registering username:', error);
      
      if (error.message.includes('Already registered')) {
        throw new Error('This wallet already has a registered username.');
      } else if (error.message.includes('Username taken')) {
        throw new Error('Username is already taken. Please choose a different one.');
      } else if (error.message.includes('Username 3-20 chars')) {
        throw new Error('Username must be between 3 and 20 characters.');
      }
      
      throw new Error('Failed to register username. Please try again.');
    }
  }

  /**
   * Get username for current wallet
   */
  async getCurrentUsername(): Promise<string | null> {
    try {
      const contract = await this.getContract();
      const address = walletConnectService.getCurrentAddress();
      
      if (!address) {
        return null;
      }

      const username = await contract.getUsernameByAddress(address);
      return username || null;

    } catch (error) {
      console.error('Error getting current username:', error);
      return null;
    }
  }

  /**
   * Check if username is available
   */
  async isUsernameAvailable(username: string): Promise<boolean> {
    try {
      const contract = await this.getContract();
      return await contract.isUsernameAvailable(username);
    } catch (error) {
      console.error('Error checking username availability:', error);
      return false;
    }
  }

  /**
   * Get address by username
   */
  async getAddressByUsername(username: string): Promise<string | null> {
    try {
      const contract = await this.getContract();
      const address = await contract.getAddressByUsername(username);
      return address === ethers.ZeroAddress ? null : address;
    } catch (error) {
      console.error('Error getting address by username:', error);
      return null;
    }
  }

  /**
   * Create a new vault with media and metadata
   */
  async createVault(params: CreateVaultParams): Promise<{
    vaultId: number;
    transactionHash: string;
    ipfsHashes: {
      metadataHash?: string;
      mediaHash?: string;
    };
  }> {
    try {
      console.log('🚀 Creating vault with params:', params);

      // Validate inputs
      if (!params.vaultName.trim()) {
        throw new Error('Vault name is required.');
      }
      if (!params.unlockDate) {
        throw new Error('Unlock date is required.');
      }
      if (!params.recipientAddress.trim()) {
        throw new Error('Recipient address is required.');
      }

      const currentAddress = walletConnectService.getCurrentAddress();
      if (!currentAddress) {
        throw new Error('Wallet not connected.');
      }

      console.log('✅ Validation passed');

      // Check if user has registered username
      console.log('👤 Checking if username is registered...');
      const currentUsername = await this.getCurrentUsername();
      
      if (!currentUsername) {
        throw new Error('You must register a username before creating vaults. Please register a username first.');
      }
      
      console.log('✅ Username verified:', currentUsername);

      // Calculate unlock timestamp with proper validation
      console.log('📅 Input unlock date:', params.unlockDate);
      
      // Try different date parsing approaches
      let unlockDate: Date;
      
      // First try: Add T00:00:00 for proper parsing
      unlockDate = new Date(params.unlockDate + 'T00:00:00');
      
      // If that fails, try direct parsing
      if (isNaN(unlockDate.getTime())) {
        unlockDate = new Date(params.unlockDate);
      }
      
      // If still fails, try parsing as ISO string
      if (isNaN(unlockDate.getTime())) {
        unlockDate = new Date(params.unlockDate + 'T00:00:00.000Z');
      }
      
      console.log('📅 Parsed unlock date:', unlockDate);
      console.log('📅 Date is valid:', !isNaN(unlockDate.getTime()));
      
      if (isNaN(unlockDate.getTime())) {
        throw new Error(`Invalid unlock date format. Received: "${params.unlockDate}". Please use YYYY-MM-DD format.`);
      }
      
      const unlockTimestamp = Math.floor(unlockDate.getTime() / 1000);
      const currentTimestamp = Math.floor(Date.now() / 1000);
      
      console.log('⏰ Timestamps calculated:', { 
        unlockTimestamp, 
        currentTimestamp,
        unlockDate: unlockDate.toISOString(),
        currentDate: new Date().toISOString()
      });
      
      if (unlockTimestamp <= currentTimestamp) {
        throw new Error('Unlock date must be in the future.');
      }

      const unlockDelaySeconds = unlockTimestamp - currentTimestamp;
      console.log('⏰ Unlock delay seconds:', unlockDelaySeconds);

      let mediaHash: string | undefined;
      let metadataHash: string | undefined;

      // Upload media to IPFS if provided
      if (params.mediaUri && params.mediaType) {
        console.log('📸 Uploading media to IPFS...');
        const fileName = `vault-media-${Date.now()}.${params.mediaType === 'photo' ? 'jpg' : 'mp4'}`;
        const mediaResult = await ipfsService.uploadMedia(params.mediaUri, fileName);
        mediaHash = mediaResult.hash;
        console.log('✅ Media uploaded to IPFS:', mediaHash);
      } else {
        console.log('ℹ️ No media to upload');
      }

      // Create comprehensive metadata
      const metadata: VaultMetadata = {
        vaultName: params.vaultName,
        unlockDate: params.unlockDate,
        content: params.content,
        originalMessage: params.content,
        recipientAddress: params.recipientAddress,
        flowAmount: params.flowAmount,
        createdAt: new Date().toISOString(),
        creatorAddress: currentAddress,
        mediaHash: mediaHash || null,
        mediaType: params.mediaType || null
      };

      console.log('📝 Uploading metadata to IPFS...');
      
      // Upload metadata to IPFS
      const metadataResult = await ipfsService.uploadMetadata(metadata);
      metadataHash = metadataResult.hash;
      
      console.log('✅ Metadata uploaded to IPFS:', metadataHash);

      // Get contract and prepare transaction
      const contract = await this.getContract();
      console.log('📄 Contract initialized with address:', this.contractAddress);
      
      const flowAmountWei = ethers.parseEther(params.flowAmount);

      console.log('💰 Transaction params:', {
        flowAmount: params.flowAmount,
        flowAmountWei: flowAmountWei.toString(),
        unlockDelaySeconds
      });

      // Get recipient username (if exists) or use address
      let recipientUsername = params.recipientAddress;
      try {
        console.log('🔍 Checking recipient address:', params.recipientAddress);
        const username = await contract.getUsernameByAddress(params.recipientAddress);
        console.log('🔍 Username lookup result:', username);
        
        if (username && username !== '') {
          recipientUsername = username;
          console.log('👤 Found recipient username:', username);
        } else {
          console.log('👤 Recipient not registered, using address as username');
          
          // Check if smart contract requires recipient to be registered
          console.log('⚠️ Warning: Recipient address is not registered. Some smart contracts may require this.');
        }
      } catch (error) {
        console.log('👤 Error checking recipient address:', error);
        console.log('👤 Using address as recipient username anyway');
      }

      // Send transaction using our custom method
      // Use metadata hash as IPFS CID
      
      console.log('📡 Sending vault transaction...');
      console.log('📡 Transaction details:', {
        recipientUsername,
        recipientAddress: params.recipientAddress,
        recipientAddressLength: params.recipientAddress.length,
        isValidEthAddress: /^0x[a-fA-F0-9]{40}$/.test(params.recipientAddress),
        metadataHash,
        messageLength: params.content.length,
        unlockDelaySeconds,
        flowAmountWei: flowAmountWei.toString()
      });
      
      // Additional validation before sending transaction
      console.log('🔍 Pre-transaction validation:');
      console.log('  - Recipient username length:', recipientUsername.length);
      console.log('  - Metadata hash length:', metadataHash.length);
      console.log('  - Message length:', params.content.length);
      console.log('  - Unlock delay (seconds):', unlockDelaySeconds);
      console.log('  - Flow amount (Wei):', flowAmountWei.toString());
      console.log('  - Current address:', currentAddress);
      
      // Check for potential issues
      console.log('🔍 Pre-transaction validation:');
      console.log('  - Recipient username length:', recipientUsername.length);
      console.log('  - Metadata hash length:', metadataHash.length);
      console.log('  - Message length:', params.content.length);
      console.log('  - Unlock delay (seconds):', unlockDelaySeconds);
      console.log('  - Flow amount (Wei):', flowAmountWei.toString());
      console.log('  - Current address:', currentAddress);
      
      // Check for potential issues
      if (unlockDelaySeconds <= 0) {
        throw new Error(`Invalid unlock delay: ${unlockDelaySeconds} seconds. Must be positive.`);
      }
      
      if (!metadataHash || metadataHash.length < 10) {
        throw new Error(`Invalid metadata hash: ${metadataHash}`);
      }
      
      if (flowAmountWei <= 0) {
        throw new Error(`Invalid flow amount: ${flowAmountWei.toString()}`);
      }
      
      console.log('✅ Pre-transaction validation passed');
      
      const receipt = await this.sendContractTransaction(
        contract,
        'sendSnap',
        [
          recipientUsername,
          metadataHash, // Metadata IPFS hash
          params.content, // Just the user message, not comprehensive metadata
          unlockDelaySeconds,
          1 // SnapType.Timed
        ],
        params.flowAmount // Pass as string, don't use BigInt toString
      );

      console.log('✅ Transaction successful:', receipt.hash);
      
      // Extract vault ID from events
      let vaultId = 0;
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed && parsed.name === 'SnapSent') {
            vaultId = Number(parsed.args.snapId);
            console.log('🆔 Vault ID extracted:', vaultId);
            break;
          }
        } catch (error) {
          // Skip unparseable logs
        }
      }

      console.log('🎉 Vault created successfully:', {
        vaultId,
        transactionHash: receipt.hash
      });

      return {
        vaultId,
        transactionHash: receipt.hash as string,
        ipfsHashes: {
          metadataHash,
          mediaHash,
        },
      };

    } catch (error: any) {
      console.error('❌ Error creating vault:', error);
      
      // Provide more specific error messages
      const errorMessage = error.message || error.toString();
      
      console.log('🔍 Full error analysis:');
      console.log('  - Error message:', errorMessage);
      console.log('  - Error type:', error.name);
      console.log('  - Contains "recipient":', errorMessage.toLowerCase().includes('recipient'));
      console.log('  - Contains "not found":', errorMessage.toLowerCase().includes('not found'));
      console.log('  - Contains "register":', errorMessage.toLowerCase().includes('register'));
      
      if (errorMessage.includes('Failed to upload media')) {
        throw new Error('Media upload failed. Please check your Lighthouse API key and internet connection.');
      } else if (errorMessage.includes('insufficient funds')) {
        throw new Error('Insufficient FLOW balance. Please add more FLOW to your wallet.');
      } else if (errorMessage.includes('user rejected')) {
        throw new Error('Transaction was rejected by user.');
      } else if (errorMessage.includes('FLOW payment required')) {
        throw new Error('Flow payment is required to create a vault.');
      } else if (errorMessage.toLowerCase().includes('recipient not found') || errorMessage.toLowerCase().includes('recipient does not exist')) {
        throw new Error('Recipient address is not registered on the platform. The recipient must register a username first before they can receive vaults.');
      } else if (errorMessage.toLowerCase().includes('recipient') && errorMessage.toLowerCase().includes('register')) {
        throw new Error('Both sender and recipient must have registered usernames to create vaults.');
      } else if (errorMessage.includes('Can\'t send to yourself')) {
        throw new Error('You cannot send a vault to yourself.');
      } else if (errorMessage.includes('Register username first')) {
        throw new Error('Please register a username before creating vaults.');
      } else if (errorMessage.includes('Wallet not connected')) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }
      
      // Generic error with original message for debugging
      throw new Error(`Failed to create vault: ${errorMessage}`);
    }
  }

  /**
   * Get vault data by ID
   */
  async getVault(vaultId: number): Promise<VaultData | null> {
    try {
      const contract = await this.getContract();
      const snapData = await contract.getSnapData(vaultId);

      return {
        id: Number(snapData.id),
        senderUsername: snapData.senderUsername,
        recipientUsername: snapData.recipientUsername,
        ipfsCID: snapData.ipfsCID,
        message: snapData.message,
        flowAmount: ethers.formatEther(snapData.flowAmount),
        createdAt: Number(snapData.createdAt),
        unlockAt: Number(snapData.unlockAt),
        isOpened: snapData.isOpened,
        snapType: Number(snapData.snapType),
      };

    } catch (error) {
      console.error('Error getting vault data:', error);
      return null;
    }
  }

  /**
   * Open/unlock a vault
   */
  async openVault(vaultId: number): Promise<{
    success: boolean;
    flowAmount: string;
    transactionHash: string;
  }> {
    try {
      console.log('Opening vault:', vaultId);

      const contract = await this.getContract();
      
      // Check if vault can be opened
      const canOpen = await contract.canOpenSnap(vaultId);
      if (!canOpen) {
        throw new Error('Vault cannot be opened yet or has already been opened.');
      }

      // Use sendContractTransaction instead of direct contract call
      const receipt = await this.sendContractTransaction(
        contract,
        'openSnap',
        [vaultId],
        '0' // No value needed for opening vault
      );

      // Extract flow amount from events
      let flowAmount = '0';
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed && parsed.name === 'SnapOpened') {
            // Flow amount would be in the transaction value or event data
            break;
          }
        } catch (error) {
          // Skip unparseable logs
        }
      }

      console.log('Vault opened successfully');

      return {
        success: true,
        flowAmount,
        transactionHash: receipt.hash as string,
      };

    } catch (error: any) {
      console.error('Error opening vault:', error);
      
      if (error.message.includes('Not your snap')) {
        throw new Error('This vault does not belong to you.');
      } else if (error.message.includes('Already opened')) {
        throw new Error('This vault has already been opened.');
      } else if (error.message.includes('Still locked')) {
        throw new Error('This vault is still locked. Please wait until the unlock date.');
      }
      
      throw new Error('Failed to open vault. Please try again.');
    }
  }

  /**
   * Get received vaults for current user
   */
  async getReceivedVaults(): Promise<VaultData[]> {
    try {
      const contract = await this.getContract();
      const address = walletConnectService.getCurrentAddress();
      
      if (!address) {
        return [];
      }

      const vaultIds = await contract.getUserReceivedSnaps(address);
      const vaults: VaultData[] = [];

      for (const id of vaultIds) {
        const vaultData = await this.getVault(Number(id));
        if (vaultData) {
          vaults.push(vaultData);
        }
      }

      return vaults.sort((a, b) => b.createdAt - a.createdAt); // Sort by newest first

    } catch (error) {
      console.error('Error getting received vaults:', error);
      return [];
    }
  }

  /**
   * Check if vault can be opened
   */
  async canOpenVault(vaultId: number): Promise<boolean> {
    try {
      const contract = await this.getContract();
      return await contract.canOpenSnap(vaultId);
    } catch (error) {
      console.error('Error checking if vault can be opened:', error);
      return false;
    }
  }

  /**
   * Get vault metadata from IPFS
   */
  async getVaultMetadata(ipfsHash: string): Promise<VaultMetadata | null> {
    try {
      return await ipfsService.getMetadata(ipfsHash);
    } catch (error) {
      console.error('Error getting vault metadata:', error);
      return null;
    }
  }

  /**
   * Get media URL from IPFS hash
   */
  getMediaUrl(ipfsHash: string): string {
    return ipfsService.getMediaUrl(ipfsHash);
  }
}

export const vaultService = new VaultService();
export type { CreateVaultParams, VaultData };

