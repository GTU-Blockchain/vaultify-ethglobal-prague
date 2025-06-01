import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ipfsService } from '../services/IPFSService';

interface MediaComponentProps {
  mediaHash: string;
  mediaType: 'photo' | 'video';
  style?: any;
}

export default function MediaComponent({ mediaHash, mediaType, style }: MediaComponentProps) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mediaInfo, setMediaInfo] = useState<{
    uri: string;
    contentType?: string;
    accessible: boolean;
    gatewayIndex: number;
  } | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [gatewayUrls, setGatewayUrls] = useState<string[]>([]);

  useEffect(() => {
    loadMedia();
  }, [mediaHash, retryCount]);

  const loadMedia = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`📱 Loading ${mediaType} from IPFS:`, mediaHash);
      
      // Get all gateway URLs
      const urls = ipfsService.getMediaUrls(mediaHash);
      setGatewayUrls(urls);
      
      // Try each gateway until one works
      let lastError: string | null = null;
      for (let i = 0; i < urls.length; i++) {
        try {
          console.log(`🔄 Trying gateway ${i + 1}/${urls.length}:`, urls[i]);
          
          // Test accessibility
          const response = await fetch(urls[i], { method: 'HEAD' });
          
          if (response.ok) {
            const contentType = response.headers.get('content-type');
            console.log(`✅ Gateway ${i + 1} accessible:`, {
              url: urls[i],
              contentType,
              status: response.status
            });
            
            // Check if content-type matches expected media type
            if (contentType) {
              const isValidImage = mediaType === 'photo' && (
                contentType.startsWith('image/') || 
                contentType.includes('jpeg') || 
                contentType.includes('jpg') || 
                contentType.includes('png') || 
                contentType.includes('gif') ||
                contentType.includes('webp')
              );
              
              const isValidVideo = mediaType === 'video' && (
                contentType.startsWith('video/') || 
                contentType.includes('mp4') || 
                contentType.includes('mov') || 
                contentType.includes('avi') ||
                contentType.includes('webm')
              );
              
              if (!isValidImage && !isValidVideo) {
                console.log(`❌ Invalid content type for ${mediaType}:`, contentType);
                throw new Error(`Bu dosya ${mediaType === 'photo' ? 'resim' : 'video'} formatında değil. Dosya tipi: ${contentType}`);
              }
            }
            
            setMediaInfo({
              uri: urls[i],
              contentType: contentType || undefined,
              accessible: true,
              gatewayIndex: i
            });
            return; // Success!
          } else {
            lastError = `Gateway ${i + 1} returned ${response.status}`;
            console.log(`❌ Gateway ${i + 1} failed:`, response.status);
          }
        } catch (gatewayError: any) {
          lastError = `Gateway ${i + 1} error: ${gatewayError.message}`;
          console.log(`❌ Gateway ${i + 1} error:`, gatewayError.message);
          
          // If it's a content-type error, don't try other gateways
          if (gatewayError.message.includes('formatında değil')) {
            throw gatewayError;
          }
        }
      }
      
      // If all gateways failed
      throw new Error(lastError || 'All IPFS gateways failed');

    } catch (error: any) {
      console.error(`❌ Error loading ${mediaType}:`, error);
      setError(error.message || `Failed to load ${mediaType}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const tryNextGateway = () => {
    if (mediaInfo && gatewayUrls.length > mediaInfo.gatewayIndex + 1) {
      const nextIndex = mediaInfo.gatewayIndex + 1;
      const nextUrl = gatewayUrls[nextIndex];
      
      console.log(`🔄 Trying next gateway ${nextIndex + 1}:`, nextUrl);
      
      setMediaInfo({
        ...mediaInfo,
        uri: nextUrl,
        gatewayIndex: nextIndex
      });
    }
  };

  const handleMediaError = (errorEvent: any) => {
    console.error(`❌ ${mediaType} render error:`, errorEvent);
    console.error('❌ Error details:', {
      nativeEvent: errorEvent?.nativeEvent,
      type: errorEvent?.type,
      message: errorEvent?.message
    });
    
    const errorMessage = errorEvent?.nativeEvent?.error || errorEvent?.message || 'Unknown media error';
    
    // If we have more gateways to try, don't set error yet
    if (mediaInfo && gatewayUrls.length > mediaInfo.gatewayIndex + 1) {
      console.log('🔄 Media error occurred, trying next gateway...');
      tryNextGateway();
    } else {
      setError(`Medya formatı hatası: ${errorMessage}. Tüm gateway'ler denendi.`);
    }
  };

  const openInBrowser = () => {
    if (mediaInfo?.uri) {
      Alert.alert(
        'Tarayıcıda Aç',
        'Bu medyayı tarayıcınızda açmak ister misiniz?',
        [
          { text: 'İptal', style: 'cancel' },
          { 
            text: 'Aç', 
            onPress: () => {
              // In a real app, you'd use Linking.openURL(mediaInfo.uri)
              console.log('🌐 Would open in browser:', mediaInfo.uri);
            }
          }
        ]
      );
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, style, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          {mediaType === 'photo' ? 'Fotoğraf' : 'Video'} yükleniyor...
        </Text>
        {gatewayUrls.length > 0 && (
          <Text style={[styles.debugText, { color: colors.text + '60', marginTop: 4 }]}>
            Gateway {(mediaInfo?.gatewayIndex || 0) + 1}/{gatewayUrls.length} deneniyor
          </Text>
        )}
      </View>
    );
  }

  if (error || !mediaInfo) {
    return (
      <View style={[styles.container, style, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.text + '60'} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>
          {mediaType === 'photo' ? 'Fotoğraf' : 'Video'} Yüklenemedi
        </Text>
        <Text style={[styles.errorMessage, { color: colors.text + '80' }]}>
          {error || 'Medya yüklenemedi'}
        </Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: colors.tint }]}
            onPress={handleRetry}
          >
            <Ionicons name="refresh" size={16} color="white" />
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
          {mediaInfo && gatewayUrls.length > mediaInfo.gatewayIndex + 1 && (
            <TouchableOpacity 
              style={[styles.nextButton, { backgroundColor: colors.tint + '80' }]}
              onPress={tryNextGateway}
            >
              <Ionicons name="arrow-forward" size={16} color="white" />
              <Text style={styles.nextButtonText}>Sonraki Gateway</Text>
            </TouchableOpacity>
          )}
          {mediaInfo?.uri && (
            <TouchableOpacity 
              style={[styles.browserButton, { borderColor: colors.tint }]}
              onPress={openInBrowser}
            >
              <Ionicons name="open-outline" size={16} color={colors.tint} />
              <Text style={[styles.browserButtonText, { color: colors.tint }]}>Tarayıcı</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Render media based on type
  if (mediaType === 'photo') {
    return (
      <View style={[styles.container, style]}>
        <Image 
          source={{ 
            uri: mediaInfo.uri,
            headers: {
              'Accept': 'image/*',
              'Cache-Control': 'no-cache'
            }
          }} 
          style={styles.media}
          resizeMode="contain"
          onError={handleMediaError}
          onLoad={() => {
            console.log('✅ Image loaded successfully');
          }}
          onLoadStart={() => {
            console.log('🔄 Image loading started');
          }}
          onLoadEnd={() => {
            console.log('🔄 Image loading ended');
          }}
        />
        {/* Overlay with media info for debugging */}
        <View style={styles.debugOverlay}>
          <Text style={styles.debugText}>
            Gateway {mediaInfo.gatewayIndex + 1}/{gatewayUrls.length}
          </Text>
          <Text style={styles.debugText}>
            {mediaInfo.contentType || 'Bilinmeyen format'}
          </Text>
        </View>
      </View>
    );
  } else {
    return (
      <View style={[styles.container, style]}>
        <Video
          source={{ 
            uri: mediaInfo.uri,
            headers: {
              'Accept': 'video/*',
              'Cache-Control': 'no-cache'
            }
          }}
          style={styles.media}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={false}
          isLooping={false}
          onError={handleMediaError}
          onLoad={() => {
            console.log('✅ Video loaded successfully');
          }}
          onLoadStart={() => {
            console.log('🔄 Video loading started');
          }}
        />
        <View style={styles.debugOverlay}>
          <Text style={styles.debugText}>
            Gateway {mediaInfo.gatewayIndex + 1}/{gatewayUrls.length}
          </Text>
          <Text style={styles.debugText}>
            {mediaInfo.contentType || 'Bilinmeyen format'}
          </Text>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  browserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  browserButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  debugOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  debugText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  nextButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
}); 