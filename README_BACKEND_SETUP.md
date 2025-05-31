# Vaultify Backend Integration Guide

This document explains how to set up and configure the backend services for Vaultify.

## 🔧 Environment Setup

Create a `.env` file in your project root with the following variables:

```env
# Lighthouse API Key for IPFS storage
EXPO_PUBLIC_LIGHTHOUSE_API_KEY=your_lighthouse_api_key_here

# Smart Contract Address on Flow EVM Testnet
EXPO_PUBLIC_VAULT_CONTRACT_ADDRESS=0x...your_contract_address_here

# WalletConnect Project ID (already configured)
EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID=205f9f4f572034908def5cdd527e6890
```

## 🌐 Service Architecture

### 1. IPFS Service (`app/services/IPFSService.ts`)
- **Purpose**: Upload media and metadata to IPFS via Lighthouse SDK
- **Features**:
  - Media file upload (photos/videos)
  - Metadata upload (vault information)
  - Content retrieval from IPFS
  - Complete vault upload (media + metadata)

### 2. Vault Service (`app/services/VaultService.ts`)
- **Purpose**: Interact with smart contracts and manage vault lifecycle
- **Features**:
  - Create vaults with IPFS integration
  - Username registration
  - Vault retrieval and opening
  - Transaction management

### 3. Wallet Connect Service (`app/services/WalletConnectService.ts`)
- **Purpose**: Web3 wallet integration
- **Features**:
  - MetaMask connection
  - Transaction signing
  - Network switching (Flow EVM Testnet)
  - Session management

## 📋 Setup Instructions

### 1. Get Lighthouse API Key
1. Visit [Lighthouse Web3](https://lighthouse.storage/)
2. Create an account and get your API key
3. Add it to your `.env` file

### 2. Deploy Smart Contract
1. Deploy the `SnapVault.sol` contract to Flow EVM Testnet
2. Copy the contract address
3. Add it to your `.env` file

### 3. Configure WalletConnect
- The WalletConnect Project ID is already configured
- For production, create your own project at [WalletConnect](https://walletconnect.org/)

## 🔗 Smart Contract Integration

### Network Configuration
- **Chain ID**: 545 (Flow EVM Testnet)
- **RPC URL**: `https://testnet.evm.nodes.onflow.org`
- **Network Name**: Flow EVM Testnet

### Contract Functions Used
- `registerUsername(string)`: Register user with username
- `sendSnap(...)`: Create new vault
- `openSnap(uint256)`: Open/unlock vault
- `getSnapData(uint256)`: Get vault information
- `getUserReceivedSnaps(address)`: Get user's received vaults

## 📱 Camera Integration

### New Features Added
- **Vault Name**: Custom name for the vault
- **Unlock Date**: When the vault can be opened
- **Recipient Address**: Wallet address to send vault to
- **Flow Amount**: Amount of FLOW tokens to send
- **Message**: Text content for the vault
- **Media**: Photo or video content

### Validation
- Vault name is required
- Unlock date must be in the future
- Valid Ethereum address format for recipient
- Flow amount must be greater than 0

## 🔄 Data Flow

1. **Capture Media**: User takes photo/video
2. **Fill Form**: Enter vault details
3. **Validate**: Check form inputs
4. **Upload to IPFS**: Media and metadata uploaded
5. **Create Transaction**: Smart contract call with IPFS hashes
6. **Confirmation**: Display success and transaction details

## 🚨 Error Handling

### Common Errors and Solutions

- **"Wallet not connected"**: Ensure wallet is connected before creating vaults
- **"Invalid wallet address"**: Check recipient address format
- **"Failed to upload to IPFS"**: Check Lighthouse API key and network connection
- **"Username already taken"**: Choose a different username
- **"Unlock date must be in the future"**: Select a future date

### Smart Contract Errors
- **"FLOW payment required"**: Ensure Flow amount > 0
- **"Register username first"**: User needs to register a username
- **"Recipient not found"**: Invalid recipient address

## 🔧 Development Notes

### Testing
- Use Flow EVM Testnet for development
- Get testnet FLOW from faucet
- Test all vault creation scenarios

### Production Deployment
1. Deploy contracts to Flow mainnet
2. Update contract addresses
3. Configure production Lighthouse account
4. Test with real wallet connections

## 📝 API Reference

### VaultService Methods
```typescript
// Create a new vault
await vaultService.createVault({
  vaultName: string,
  unlockDate: string,
  content: string,
  recipientAddress: string,
  flowAmount: string,
  mediaUri?: string,
  mediaType?: 'photo' | 'video'
})

// Register username
await vaultService.registerUsername(username: string)

// Get vault data
await vaultService.getVault(vaultId: number)

// Open vault
await vaultService.openVault(vaultId: number)
```

### IPFSService Methods
```typescript
// Upload complete vault
await ipfsService.uploadVault(mediaUri, mediaType, metadata)

// Upload media only
await ipfsService.uploadMedia(fileUri, fileName)

// Get metadata
await ipfsService.getMetadata(ipfsHash)
```

## 🔐 Security Considerations

- Private keys never leave the user's wallet
- IPFS content is publicly accessible (consider encryption for sensitive data)
- Smart contract handles token transfers securely
- Validate all inputs on frontend and backend

## 🐛 Troubleshooting

### Common Issues
1. **Build Errors**: Ensure all dependencies are installed
2. **Network Issues**: Check Flow testnet connectivity
3. **Transaction Failures**: Verify wallet has sufficient FLOW
4. **IPFS Upload Fails**: Check API key and file size limits

### Debugging
- Check browser console for detailed error messages
- Monitor network requests in developer tools
- Use Flow block explorer to verify transactions 