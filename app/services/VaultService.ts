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
  isImmediateVault?: boolean;
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

interface VaultDetails {
  id: number;
  senderUsername: string;
  recipientUsername: string;
  message: string;
  flowAmount: string;
  createdAt: number;
  unlockAt: number;
  isOpened: boolean;
  snapType: number;
  metadata?: VaultMetadata;
  mediaUrl?: string;
  mediaType?: 'photo' | 'video';
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
   * Get username for any wallet address
   */
  async getUsernameByAddress(address: string): Promise<string | null> {
    try {
      const contract = await this.getContract();
      
      if (!address) {
        return null;
      }

      console.log('🔍 Looking up username for address:', address);
      const username = await contract.getUsernameByAddress(address);
      console.log('📋 Username lookup result:', username);
      
      return username || null;

    } catch (error) {
      console.error('Error getting username by address:', error);
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
      const currentUsername = await this.getCurrentUsername();
      console.log('👤 Current username:', currentUsername);

      // Get recipient username (if exists) or use address
      let recipientUsername = params.recipientAddress;
      try {
        console.log('🔍 Checking recipient address:', params.recipientAddress);
        const username = await this.getUsernameByAddress(params.recipientAddress);
        console.log('🔍 Username lookup result:', username);
        
        if (username && username !== '') {
          recipientUsername = username;
          console.log('👤 Found recipient username:', username);
        } else {
          console.log('👤 Recipient not registered, using address as username');
        }
      } catch (error) {
        console.log('👤 Error checking recipient address:', error);
        console.log('👤 Using address as recipient username anyway');
      }

      // Calculate unlock timestamp with proper validation
      console.log('📅 Input unlock date:', params.unlockDate);
      
      // For immediate vaults, use current timestamp
      const currentTimestamp = Math.floor(Date.now() / 1000);
      let unlockDelaySeconds: number;

      if (params.isImmediateVault) {
        console.log('⚡ Creating immediate vault');
        unlockDelaySeconds = 10; // 10 seconds delay for immediate vaults
      } else {
        // Try different date parsing approaches for future vaults
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
        
        console.log('⏰ Timestamps calculated:', { 
          unlockTimestamp, 
          currentTimestamp,
          unlockDate: unlockDate.toISOString(),
          currentDate: new Date().toISOString()
        });
        
        // For future vaults, use the calculated delay
        unlockDelaySeconds = unlockTimestamp - currentTimestamp;
        
        // Ensure minimum delay of 10 seconds
        if (unlockDelaySeconds < 10) {
          unlockDelaySeconds = 10;
        }
      }

      console.log('⏰ Unlock delay seconds:', unlockDelaySeconds);

      let mediaHash: string | undefined;
      let metadataHash: string | undefined;

      // Create comprehensive metadata first
      const metadata: VaultMetadata = {
        vaultName: params.vaultName,
        unlockDate: params.unlockDate,
        content: params.content,
        originalMessage: params.content,
        recipientAddress: params.recipientAddress,
        flowAmount: params.flowAmount,
        createdAt: new Date().toISOString(),
        creatorAddress: currentAddress,
        mediaHash: null, // Will be set by uploadVault
        mediaType: params.mediaType || null
      };

      console.log('📸 Uploading vault (media + metadata) to IPFS...');
      
      // Use uploadVault method to handle both media and metadata upload properly
      const uploadResult = await ipfsService.uploadVault(
        params.mediaUri || null,
        params.mediaType || null,
        metadata
      );
      
      mediaHash = uploadResult.mediaHash;
      metadataHash = uploadResult.metadataHash;
      
      console.log('✅ Vault upload completed:', {
        mediaHash,
        metadataHash,
        mediaUrl: uploadResult.mediaUrl,
        metadataUrl: uploadResult.metadataUrl
      });

      // Get contract and prepare transaction
      const contract = await this.getContract();
      console.log('📄 Contract initialized with address:', this.contractAddress);
      
      const flowAmountWei = ethers.parseEther(params.flowAmount);

      console.log('💰 Transaction params:', {
        flowAmount: params.flowAmount,
        flowAmountWei: flowAmountWei.toString(),
        unlockDelaySeconds,
        senderUsername: currentUsername,
        recipientUsername: recipientUsername
      });

      // Send transaction using our custom method
      console.log('📡 Sending vault transaction...');
      console.log('📡 Transaction details:', {
        recipientUsername,
        recipientAddress: params.recipientAddress,
        recipientAddressLength: params.recipientAddress.length,
        isValidEthAddress: /^0x[a-fA-F0-9]{40}$/.test(params.recipientAddress),
        metadataHash,
        messageLength: params.content.length,
        unlockDelaySeconds,
        flowAmountWei: flowAmountWei.toString(),
        senderUsername: currentUsername
      });
      
      const receipt = await this.sendContractTransaction(
        contract,
        'sendSnap',
        [
          recipientUsername,
          metadataHash, // Metadata IPFS hash
          params.content, // Just the user message, not comprehensive metadata
          unlockDelaySeconds,
          params.isImmediateVault ? 0 : 1 // SnapType.Instant (0) or SnapType.Timed (1)
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
            console.log('📦 Vault details from event:', {
              snapId: parsed.args.snapId,
              senderUsername: parsed.args.senderUsername,
              recipientUsername: parsed.args.recipientUsername,
              snapType: parsed.args.snapType
            });
            break;
          }
        } catch (error) {
          // Skip unparseable logs
        }
      }

      console.log('🎉 Vault created successfully:', {
        vaultId,
        transactionHash: receipt.hash,
        senderUsername: currentUsername,
        recipientUsername: recipientUsername
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
      
      throw error;
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
   * Check if current user is the sender of a vault
   */
  async isVaultSender(vaultId: number): Promise<boolean> {
    try {
      const currentAddress = walletConnectService.getCurrentAddress();
      if (!currentAddress) {
        console.log('🚫 isVaultSender: No current address');
        return false;
      }

      const vaultData = await this.getVault(vaultId);
      if (!vaultData) {
        console.log('🚫 isVaultSender: No vault data found');
        return false;
      }

      console.log(`🔍 isVaultSender for vault ${vaultId}:`, {
        currentAddress: currentAddress.toLowerCase(),
        vaultSenderUsername: vaultData.senderUsername
      });

      // Get sender's address by username
      const senderAddress = await this.getAddressByUsername(vaultData.senderUsername);
      console.log(`🔍 Sender address lookup result:`, {
        senderUsername: vaultData.senderUsername,
        senderAddress: senderAddress?.toLowerCase(),
        currentAddress: currentAddress.toLowerCase(),
        matches: senderAddress?.toLowerCase() === currentAddress.toLowerCase()
      });
      
      if (!senderAddress) {
        console.log('🚫 isVaultSender: Could not resolve sender address');
        return false;
      }

      const isMatch = senderAddress.toLowerCase() === currentAddress.toLowerCase();
      console.log(`✅ isVaultSender result: ${isMatch}`);
      
      return isMatch;

    } catch (error) {
      console.error('❌ Error checking if user is vault sender:', error);
      return false;
    }
  }

  /**
   * Check if current user is the recipient of a vault
   */
  async isVaultRecipient(vaultId: number): Promise<boolean> {
    try {
      const currentAddress = walletConnectService.getCurrentAddress();
      if (!currentAddress) {
        return false;
      }

      const vaultData = await this.getVault(vaultId);
      if (!vaultData) {
        return false;
      }

      // Get recipient address from smart contract
      const contract = await this.getContract();
      const snapData = await contract.getSnapData(vaultId);
      
      // Get recipient's address by username
      const recipientAddress = await this.getAddressByUsername(snapData.recipientUsername);
      
      return recipientAddress?.toLowerCase() === currentAddress.toLowerCase();

    } catch (error) {
      console.error('Error checking if user is vault recipient:', error);
      return false;
    }
  }

  /**
   * Check if vault can be accessed (opened for viewing content)
   * - Senders can always access their sent vaults
   * - Recipients can only access after unlock time
   */
  async canAccessVault(vaultId: number): Promise<{
    canAccess: boolean;
    reason: 'sender' | 'unlocked' | 'locked' | 'not_authorized';
    unlockDate?: Date;
  }> {
    try {
      const currentAddress = walletConnectService.getCurrentAddress();
      if (!currentAddress) {
        return { canAccess: false, reason: 'not_authorized' };
      }

      const vaultData = await this.getVault(vaultId);
      if (!vaultData) {
        return { canAccess: false, reason: 'not_authorized' };
      }

      // Try both methods to check if user is sender
      const isSenderByAddress = await this.isVaultSender(vaultId);
      const isSenderByUsername = await this.isVaultSenderByUsername(vaultId);
      
      console.log(`🔍 Sender check results for vault ${vaultId}:`, {
        isSenderByAddress,
        isSenderByUsername,
        finalIsSender: isSenderByAddress || isSenderByUsername
      });

      if (isSenderByAddress || isSenderByUsername) {
        console.log(`✅ User is sender of vault ${vaultId}`);
        return { canAccess: true, reason: 'sender' };
      }

      // Check if user is recipient
      const isRecipient = await this.isVaultRecipient(vaultId);
      if (!isRecipient) {
        return { canAccess: false, reason: 'not_authorized' };
      }

      // For recipients, check unlock time
      const unlockDate = new Date(vaultData.unlockAt * 1000);
      const now = new Date();

      if (now >= unlockDate) {
        return { canAccess: true, reason: 'unlocked', unlockDate };
      } else {
        return { canAccess: false, reason: 'locked', unlockDate };
      }

    } catch (error) {
      console.error('Error checking vault access:', error);
      return { canAccess: false, reason: 'not_authorized' };
    }
  }

  /**
   * Check if vault can be opened (for blockchain transaction)
   * - Recipients can open vaults that are unlocked and not already opened
   * - Senders cannot open their own sent vaults (they don't receive the funds)
   */
  async canOpenVault(vaultId: number): Promise<boolean> {
    try {
      const accessInfo = await this.canAccessVault(vaultId);
      
      // Only recipients can "open" vaults to receive funds
      // Senders can access content but don't need to "open" 
      if (accessInfo.reason === 'sender') {
        return false; // Senders don't open their own vaults
      }
      
      if (accessInfo.reason === 'unlocked') {
        // Check with smart contract if it's actually openable
        const contract = await this.getContract();
        return await contract.canOpenSnap(vaultId);
      }
      
      return false;
    } catch (error) {
      console.error('Error checking if vault can be opened:', error);
      return false;
    }
  }

  /**
   * Get sent vaults for current user
   */
  async getSentVaults(): Promise<VaultData[]> {
    try {
      const contract = await this.getContract();
      const address = walletConnectService.getCurrentAddress();
      
      if (!address) {
        console.log('❌ No wallet address found');
        return [];
      }

      // Get current username
      const currentUsername = await this.getCurrentUsername();
      console.log('👤 Current username:', currentUsername);
      
      if (!currentUsername) {
        console.log('❌ No username found for current address');
        return [];
      }

      // Convert username to lowercase for comparison
      const lowerCurrentUsername = currentUsername.toLowerCase();
      console.log('👤 Lowercase username for comparison:', lowerCurrentUsername);

      // Get the next snap ID to know how many vaults to check
      const nextId = await contract.nextSnapId();
      const nextIdNumber = Number(nextId);
      console.log('📊 Total vaults to check:', nextIdNumber - 1);
      
      const vaults: VaultData[] = [];

      // Iterate through all vaults to find ones sent by current user
      for (let i = 1; i < nextIdNumber; i++) {
        try {
          console.log(`🔍 Checking vault ${i}...`);
          const vaultData = await this.getVault(i);
          
          if (vaultData) {
            const lowerSenderUsername = vaultData.senderUsername.toLowerCase();
            console.log(`📦 Vault ${i} data:`, {
              senderUsername: vaultData.senderUsername,
              lowerSenderUsername,
              recipientUsername: vaultData.recipientUsername,
              currentUsername: currentUsername,
              lowerCurrentUsername,
              matches: lowerSenderUsername === lowerCurrentUsername
            });
            
            if (lowerSenderUsername === lowerCurrentUsername) {
              console.log(`✅ Found sent vault ${i}`);
              vaults.push(vaultData);
            }
          }
        } catch (error) {
          console.log(`⚠️ Error checking vault ${i}:`, error);
          // Skip invalid vaults
          continue;
        }
      }

      console.log(`🎯 Found ${vaults.length} sent vaults`);
      return vaults.sort((a, b) => b.createdAt - a.createdAt); // Sort by newest first

    } catch (error) {
      console.error('❌ Error getting sent vaults:', error);
      return [];
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

  /**
   * Check if current user is the sender of a vault (alternative method using username comparison)
   */
  async isVaultSenderByUsername(vaultId: number): Promise<boolean> {
    try {
      const currentUsername = await this.getCurrentUsername();
      if (!currentUsername) {
        console.log('🚫 isVaultSenderByUsername: No current username');
        return false;
      }

      const vaultData = await this.getVault(vaultId);
      if (!vaultData) {
        console.log('🚫 isVaultSenderByUsername: No vault data found');
        return false;
      }

      console.log(`🔍 isVaultSenderByUsername for vault ${vaultId}:`, {
        currentUsername: currentUsername.toLowerCase(),
        vaultSenderUsername: vaultData.senderUsername.toLowerCase(),
        matches: currentUsername.toLowerCase() === vaultData.senderUsername.toLowerCase()
      });

      const isMatch = currentUsername.toLowerCase() === vaultData.senderUsername.toLowerCase();
      console.log(`✅ isVaultSenderByUsername result: ${isMatch}`);
      
      return isMatch;

    } catch (error) {
      console.error('❌ Error checking if user is vault sender by username:', error);
      return false;
    }
  }
}

export const vaultService = new VaultService();
export type { CreateVaultParams, VaultData, VaultDetails };

