import lighthouse from '@lighthouse-web3/sdk';

interface VaultMetadata {
  vaultName: string;
  unlockDate: string;
  content: string;
  originalMessage: string;
  recipientAddress: string;
  flowAmount: string;
  mediaType: 'photo' | 'video' | null;
  mediaHash: string | null;
  createdAt: string;
  creatorAddress: string;
}

interface UploadResult {
  hash: string;
  size: number;
  url: string;
}

class IPFSService {
  private apiKey: string;

  constructor() {
    // Replace with your Lighthouse API key
    this.apiKey = process.env.EXPO_PUBLIC_LIGHTHOUSE_API_KEY || 'your-lighthouse-api-key';
  }

  /**
   * Upload media file to IPFS via Lighthouse (React Native compatible)
   */
  async uploadMedia(fileUri: string, fileName: string): Promise<UploadResult> {
    try {
      console.log('🔄 Uploading media to IPFS...', fileName);
      console.log('📁 File URI:', fileUri);
      console.log('🔑 Using API key:', this.apiKey.substring(0, 10) + '...');

      // For React Native, use direct file path approach
      const uploadResponse = await lighthouse.upload([fileUri], this.apiKey);

      console.log('📤 Lighthouse response:', uploadResponse);

      if (!uploadResponse.data || !uploadResponse.data.Hash) {
        throw new Error('Failed to upload media to IPFS - no hash received');
      }

      const result: UploadResult = {
        hash: uploadResponse.data.Hash,
        size: typeof uploadResponse.data.Size === 'string' ? parseInt(uploadResponse.data.Size) : (uploadResponse.data.Size || 0),
        url: `https://gateway.lighthouse.storage/ipfs/${uploadResponse.data.Hash}`
      };

      console.log('✅ Media uploaded successfully:', result);

      // Verify the upload by checking if it's accessible
      try {
        console.log('🔍 Verifying upload...');
        const verifyResponse = await fetch(result.url, { method: 'HEAD' });
        if (verifyResponse.ok) {
          console.log('✅ Upload verified - media is accessible');
        } else {
          console.log('⚠️ Upload verification failed but continuing...');
        }
      } catch (verifyError) {
        console.log('⚠️ Could not verify upload but continuing...', verifyError);
      }

      return result;

    } catch (error: any) {
      console.error('❌ Error uploading media to IPFS:', error);
      console.error('❌ Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      
      if (error.message.includes('API key')) {
        throw new Error('Invalid Lighthouse API key. Please check your API key in environment variables.');
      } else if (error.message.includes('Network')) {
        throw new Error('Network error while uploading to IPFS. Please check your internet connection.');
      } else if (error.message.includes('File not found') || error.message.includes('no such file')) {
        throw new Error('File not found. Please try taking the photo/video again.');
      }
      
      throw new Error(`Failed to upload media: ${error.message}`);
    }
  }

  /**
   * Upload vault metadata to IPFS (React Native compatible)
   */
  async uploadMetadata(metadata: VaultMetadata): Promise<UploadResult> {
    try {
      console.log('📝 Uploading metadata to IPFS...');

      const metadataJson = JSON.stringify(metadata, null, 2);
      console.log('📄 Metadata JSON:', metadataJson);
      
      let uploadResponse;
      
      try {
        // Method 1: Try direct string upload (some versions support this)
        console.log('📤 Trying direct JSON string upload...');
        uploadResponse = await lighthouse.upload([metadataJson], this.apiKey);
        console.log('✅ Direct string upload successful');
      } catch (directUploadError) {
        console.log('📤 Direct upload failed, using temporary file method...');
        
        // Method 2: Use temporary file approach
        const RNFS = require('react-native-fs');
        const tempFilePath = `${RNFS.TemporaryDirectoryPath}/vault-metadata-${Date.now()}.json`;
        
        console.log('📄 Creating temporary file:', tempFilePath);
        await RNFS.writeFile(tempFilePath, metadataJson, 'utf8');
        console.log('📄 Temporary file created successfully');
        
        // Upload the temporary file
        uploadResponse = await lighthouse.upload([tempFilePath], this.apiKey);
        console.log('✅ Temporary file upload successful');
        
        // Clean up temporary file
        try {
          await RNFS.unlink(tempFilePath);
          console.log('🗑️ Temporary file cleaned up');
        } catch (cleanupError) {
          console.log('⚠️ Could not clean up temporary file:', cleanupError);
        }
      }

      console.log('📤 Metadata upload response:', uploadResponse);

      if (!uploadResponse.data || !uploadResponse.data.Hash) {
        throw new Error('Failed to upload metadata to IPFS - no hash received');
      }

      const result: UploadResult = {
        hash: uploadResponse.data.Hash,
        size: typeof uploadResponse.data.Size === 'string' ? parseInt(uploadResponse.data.Size) : (uploadResponse.data.Size || 0),
        url: `https://gateway.lighthouse.storage/ipfs/${uploadResponse.data.Hash}`
      };

      console.log('✅ Metadata uploaded successfully:', result);
      return result;

    } catch (error: any) {
      console.error('❌ Error uploading metadata to IPFS:', error);
      console.error('❌ Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      
      if (error.message.includes('API key')) {
        throw new Error('Invalid Lighthouse API key. Please check your API key.');
      } else if (error.message.includes('react-native-fs')) {
        throw new Error('React Native file system not available. Please install react-native-fs.');
      }
      
      throw new Error(`Failed to upload metadata: ${error.message}`);
    }
  }

  /**
   * Retrieve metadata from IPFS using hash
   */
  async getMetadata(ipfsHash: string): Promise<VaultMetadata> {
    try {
      const url = `https://gateway.lighthouse.storage/ipfs/${ipfsHash}`;
      console.log('📥 Fetching metadata from:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const metadata = await response.json();
      return metadata as VaultMetadata;

    } catch (error: any) {
      console.error('❌ Error retrieving metadata from IPFS:', error);
      throw new Error('Failed to retrieve vault data. The content may not be available.');
    }
  }

  /**
   * Get media URL from IPFS hash
   */
  getMediaUrl(ipfsHash: string): string {
    return `https://gateway.lighthouse.storage/ipfs/${ipfsHash}`;
  }

  /**
   * Upload complete vault (media + metadata) and return IPFS hashes
   */
  async uploadVault(
    mediaUri: string | null,
    mediaType: 'photo' | 'video' | null,
    metadata: Omit<VaultMetadata, 'mediaType'>
  ): Promise<{
    metadataHash: string;
    mediaHash?: string;
    metadataUrl: string;
    mediaUrl?: string;
  }> {
    try {
      console.log('🚀 Starting vault upload process...');
      
      let mediaHash: string | undefined;
      let mediaUrl: string | undefined;

      // Upload media if provided
      if (mediaUri && mediaType) {
        console.log('📸 Uploading media...');
        const fileName = `vault-media-${Date.now()}.${mediaType === 'photo' ? 'jpg' : 'mp4'}`;
        const mediaResult = await this.uploadMedia(mediaUri, fileName);
        mediaHash = mediaResult.hash;
        mediaUrl = mediaResult.url;
        console.log('✅ Media upload completed');
      } else {
        console.log('ℹ️ No media to upload');
      }

      // Prepare complete metadata
      const completeMetadata: VaultMetadata = {
        ...metadata,
        mediaType,
      };

      console.log('📝 Uploading metadata...');
      // Upload metadata
      const metadataResult = await this.uploadMetadata(completeMetadata);
      console.log('✅ Metadata upload completed');

      const result = {
        metadataHash: metadataResult.hash,
        mediaHash,
        metadataUrl: metadataResult.url,
        mediaUrl,
      };

      console.log('🎉 Vault upload process completed:', result);
      return result;

    } catch (error: any) {
      console.error('❌ Error uploading vault to IPFS:', error);
      throw new Error(`Failed to create vault: ${error.message}`);
    }
  }

  /**
   * Test API key and connection
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing Lighthouse connection...');
      
      const testData = 'test-connection-' + Date.now();
      const response = await lighthouse.uploadText(testData, this.apiKey, 'test.txt');
      
      if (response.data && response.data.Hash) {
        console.log('✅ Connection test successful');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return false;
    }
  }
}

export const ipfsService = new IPFSService();
export type { UploadResult, VaultMetadata };

 