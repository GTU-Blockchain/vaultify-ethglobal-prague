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

      // Validate file extension
      const fileExtension = fileName.toLowerCase().split('.').pop();
      const validImageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      const validVideoExtensions = ['mp4', 'mov', 'avi', 'webm'];
      const allValidExtensions = [...validImageExtensions, ...validVideoExtensions];
      
      if (!fileExtension || !allValidExtensions.includes(fileExtension)) {
        throw new Error(`Desteklenmeyen dosya formatı: ${fileExtension}. Desteklenen formatlar: ${allValidExtensions.join(', ')}`);
      }
      
      console.log('✅ File extension validation passed:', fileExtension);

      // Determine MIME type based on extension
      let mimeType = 'application/octet-stream';
      if (validImageExtensions.includes(fileExtension)) {
        mimeType = fileExtension === 'jpg' || fileExtension === 'jpeg' ? 'image/jpeg' : `image/${fileExtension}`;
      } else if (validVideoExtensions.includes(fileExtension)) {
        mimeType = fileExtension === 'mov' ? 'video/quicktime' : `video/${fileExtension}`;
      }
      
      console.log('📋 Determined MIME type:', mimeType);

      // Create FormData for proper binary upload
      const formData = new FormData();
      
      // Create file object for React Native
      const fileObject = {
        uri: fileUri,
        type: mimeType,
        name: fileName,
      } as any;
      
      formData.append('file', fileObject);
      
      console.log('📦 FormData created with file:', {
        name: fileName,
        type: mimeType,
        uri: fileUri.substring(0, 50) + '...'
      });

      // Upload using fetch with FormData (instead of Lighthouse SDK)
      const uploadResponse = await fetch('https://node.lighthouse.storage/api/v0/add', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      console.log('📤 Upload response status:', uploadResponse.status);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('❌ Upload failed:', errorText);
        throw new Error(`HTTP ${uploadResponse.status}: ${errorText}`);
      }

      const responseData = await uploadResponse.json();
      console.log('📤 Lighthouse response:', responseData);

      if (!responseData.Hash) {
        throw new Error('Failed to upload media to IPFS - no hash received');
      }

      const result: UploadResult = {
        hash: responseData.Hash,
        size: responseData.Size || 0,
        url: `https://gateway.lighthouse.storage/ipfs/${responseData.Hash}`
      };

      console.log('✅ Media uploaded successfully:', result);

      // Verify the upload by checking if it's accessible and has correct content type
      try {
        console.log('🔍 Verifying upload...');
        const verifyResponse = await fetch(result.url, { method: 'HEAD' });
        if (verifyResponse.ok) {
          const contentType = verifyResponse.headers.get('content-type');
          console.log('✅ Upload verified - media is accessible. Content-Type:', contentType);
          
          // Check if content type matches file extension
          const isImage = validImageExtensions.includes(fileExtension || '');
          const isVideo = validVideoExtensions.includes(fileExtension || '');
          
          if (contentType) {
            const hasCorrectType = (
              (isImage && (contentType.startsWith('image/') || contentType.includes('jpeg') || contentType.includes('jpg') || contentType.includes('png'))) ||
              (isVideo && (contentType.startsWith('video/') || contentType.includes('mp4') || contentType.includes('mov')))
            );
            
            if (!hasCorrectType) {
              console.log('⚠️ Content type mismatch:', {
                expected: isImage ? 'image/*' : 'video/*',
                actual: contentType,
                fileExtension
              });
            } else {
              console.log('✅ Content type verification passed');
            }
          }
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
      
      if (error.message.includes('API key') || error.message.includes('Authorization')) {
        throw new Error('Geçersiz Lighthouse API anahtarı. Lütfen environment değişkenlerindeki API anahtarınızı kontrol edin.');
      } else if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
        throw new Error('IPFS yüklemesi sırasında ağ hatası. Lütfen internet bağlantınızı kontrol edin.');
      } else if (error.message.includes('File not found') || error.message.includes('no such file')) {
        throw new Error('Dosya bulunamadı. Lütfen fotoğraf/videoyu tekrar çekmeyi deneyin.');
      } else if (error.message.includes('Desteklenmeyen dosya formatı')) {
        throw error; // Re-throw validation errors as-is
      }
      
      throw new Error(`Medya yükleme başarısız: ${error.message}`);
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
        throw new Error('Geçersiz Lighthouse API anahtarı. Lütfen API anahtarınızı kontrol edin.');
      } else if (error.message.includes('react-native-fs')) {
        throw new Error('React Native dosya sistemi mevcut değil. Lütfen react-native-fs yükleyin.');
      }
      
      throw new Error(`Metadata yükleme başarısız: ${error.message}`);
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
      throw new Error('Vault verileri alınamadı. İçerik mevcut olmayabilir.');
    }
  }

  /**
   * Get media URL from IPFS hash with proper headers for React Native
   */
  getMediaUrl(ipfsHash: string, mediaType?: 'photo' | 'video'): string {
    // Use the proper Lighthouse gateway URL
    const baseUrl = `https://gateway.lighthouse.storage/ipfs/${ipfsHash}`;
    
    console.log('🔗 Generating media URL:', {
      ipfsHash,
      mediaType,
      url: baseUrl
    });
    
    return baseUrl;
  }

  /**
   * Get multiple gateway URLs for fallback loading
   */
  getMediaUrls(ipfsHash: string): string[] {
    const gateways = [
      `https://gateway.lighthouse.storage/ipfs/${ipfsHash}`,
      `https://ipfs.io/ipfs/${ipfsHash}`,
      `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
      `https://dweb.link/ipfs/${ipfsHash}`,
      `https://gateway.pinata.cloud/ipfs/${ipfsHash}`
    ];
    
    console.log('🔗 Generated fallback URLs:', gateways);
    return gateways;
  }

  /**
   * Get media URL with headers for fetch-based loading (alternative method)
   */
  async getMediaWithHeaders(ipfsHash: string): Promise<{
    uri: string;
    headers: Record<string, string>;
  }> {
    try {
      const url = `https://gateway.lighthouse.storage/ipfs/${ipfsHash}`;
      
      console.log('🔍 Checking media headers for:', url);
      
      // First make a HEAD request to get content type
      const headResponse = await fetch(url, { method: 'HEAD' });
      const contentType = headResponse.headers.get('content-type');
      
      console.log('📋 Media content type:', contentType);
      
      return {
        uri: url,
        headers: {
          'Accept': 'image/*,video/*',
          'Cache-Control': 'no-cache',
          'Content-Type': contentType || 'application/octet-stream'
        }
      };
    } catch (error) {
      console.error('⚠️ Error getting media headers:', error);
      return {
        uri: `https://gateway.lighthouse.storage/ipfs/${ipfsHash}`,
        headers: {
          'Accept': 'image/*,video/*',
          'Cache-Control': 'no-cache'
        }
      };
    }
  }

  /**
   * Test if media is accessible and get its format info
   */
  async testMediaAccess(ipfsHash: string): Promise<{
    accessible: boolean;
    contentType?: string;
    size?: number;
    error?: string;
  }> {
    try {
      const url = `https://gateway.lighthouse.storage/ipfs/${ipfsHash}`;
      console.log('🧪 Testing media access:', url);
      
      const response = await fetch(url, { method: 'HEAD' });
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');
        
        console.log('✅ Media accessible:', {
          contentType,
          size: contentLength,
          status: response.status
        });
        
        return {
          accessible: true,
          contentType: contentType || undefined,
          size: contentLength ? parseInt(contentLength) : undefined
        };
      } else {
        console.log('❌ Media not accessible:', response.status, response.statusText);
        return {
          accessible: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error: any) {
      console.error('❌ Error testing media access:', error);
      return {
        accessible: false,
        error: error.message
      };
    }
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
        
        // Create proper filename with correct extension
        const timestamp = Date.now();
        const extension = mediaType === 'photo' ? 'jpg' : 'mp4';
        const fileName = `vault-media-${timestamp}.${extension}`;
        
        console.log('📁 Generated filename:', fileName);
        
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
        mediaHash: mediaHash || null,
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
      throw new Error(`Vault oluşturma başarısız: ${error.message}`);
    }
  }

  /**
   * Test API key and connection
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Lighthouse bağlantısı test ediliyor...');
      
      const testData = 'test-connection-' + Date.now();
      const response = await lighthouse.uploadText(testData, this.apiKey, 'test.txt');
      
      if (response.data && response.data.Hash) {
        console.log('✅ Bağlantı testi başarılı');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Bağlantı testi başarısız:', error);
      return false;
    }
  }
}

export const ipfsService = new IPFSService();
export type { UploadResult, VaultMetadata };

 