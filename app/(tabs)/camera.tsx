import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useRef, useState } from 'react';
import { Alert, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNavBar } from '../components/BottomNavBar';
import { useTheme } from '../context/ThemeContext';

export default function CameraScreen() {  const { username: routeUsername } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [media, setMedia] = useState<{ uri: string; type: 'photo' | 'video' } | null>(null);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [username, setUsername] = useState(routeUsername ? String(routeUsername) : '');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [cameraType, setCameraType] = useState<'front' | 'back'>('back');
  const [isRecording, setIsRecording] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [hasStartedRecording, setHasStartedRecording] = useState(false);
  const [isVideoMode, setIsVideoMode] = useState(false);
  const cameraRef = useRef<any>(null);
  const videoRef = useRef<any>(null);

  const longPressTimer = useRef<number | null>(null);

  const { theme } = useTheme();

  React.useEffect(() => {
    requestPermission();
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);
  
  React.useEffect(() => {
    if (media?.type === 'video') {
      setIsRecording(false);
    }
  }, [media]);

  const handleError = (message: string) => {
    Alert.alert(
      'Error',
      message,
      [{ text: 'OK', onPress: () => {} }]
    );
  };

  const takePhoto = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          skipProcessing: true,
          exif: false,
          base64: false
        });
        
        if (cameraType === 'front') {
          const manipulatedImage = await ImageManipulator.manipulateAsync(
            photo.uri,
            [{ flip: ImageManipulator.FlipType.Horizontal }],
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
          );
          setMedia({ uri: manipulatedImage.uri, type: 'photo' });
        } else {
          setMedia({ uri: photo.uri, type: 'photo' });
        }
      } catch (error) {
        console.error('Error taking photo:', error);
        handleError('Failed to take photo. Please try again.');
      }
    }
  };

  const startRecording = async () => {
    if (cameraRef.current) {
      try {
        setIsRecording(true);
        setHasStartedRecording(true);
        const recording = await cameraRef.current.recordAsync({
          quality: '720p',
          maxDuration: 60,
          mute: false,
          videoStabilization: false,
          isAudioEnabled: true
        });
        console.log('Recording completed:', recording);
        if (recording && recording.uri) {
          setMedia({ uri: recording.uri, type: 'video' });
        }
        setIsRecording(false);
        setIsLongPressing(false);
        setHasStartedRecording(false);
      } catch (error) {
        console.error('Error during recording:', error);
        handleError('Failed to record video. Please try again.');
        setIsRecording(false);
        setIsLongPressing(false);
        setHasStartedRecording(false);
      }
    }
  };

  const stopRecording = async () => {
    if (cameraRef.current && isRecording) {
      try {
        console.log('Stopping recording...');
        await cameraRef.current.stopRecording();
        setIsRecording(false);
        setIsLongPressing(false);
        setHasStartedRecording(false);
      } catch (error) {
        console.error('Error stopping video:', error);
        handleError('Failed to save video. Please try again.');
        setIsRecording(false);
        setIsLongPressing(false);
        setHasStartedRecording(false);
      }
    }
  };

  const handlePressIn = () => {
    if (isVideoMode) {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
      return;
    }
    
    setIsLongPressing(true);
    longPressTimer.current = setTimeout(() => {
      startRecording();
    }, 1000);
  };

  const handlePressOut = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    setIsLongPressing(false);

    if (!isVideoMode && !isRecording) {
      takePhoto();
    }
  };

  const handleSend = () => {
    setShowVaultModal(true);
  };

  const handleCancel = () => {
    setMedia(null);
  };

  const handleCreateVault = () => {
    setShowVaultModal(false);
    setShowConfirmationModal(true);
    // Further vault creation logic here
  };

  const toggleCameraType = () => {
    setCameraType(current => current === 'back' ? 'front' : 'back');
  };

  const handleSavePhoto = async () => {
    if (!media) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant media library permissions to save photos.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(media.uri);
      Alert.alert('Saved', 'Photo saved to your camera roll!');
    } catch (e) {
      Alert.alert('Error', 'Could not save photo.');
    }
  };

  const handleSharePhoto = async () => {
    if (!media) return;
    try {
      await Sharing.shareAsync(media.uri);
    } catch (e) {
      Alert.alert('Error', 'Could not share photo.');
    }
  };

  if (!permission) {
    return <View style={styles.container} />;
  }
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={[styles.errorText, { color: colors.text }]}>No access to camera</Text>
      </View>
    );
  }


  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {!media ? (
        <View style={styles.container}>
          <CameraView 
            ref={cameraRef}
            style={styles.camera} 
            facing={cameraType}
            enableTorch={false}
            active={true}
          />
          <TouchableOpacity 
            style={[styles.flipButton, { 
            top: 16 ,
              right: 16
            }]}
            onPress={toggleCameraType}
          >
            <Ionicons name="camera-reverse" size={24} color={colors.icon} />
          </TouchableOpacity>
          <View style={styles.cameraControls}>
            <TouchableOpacity 
              style={[
                styles.captureButton,
                isRecording && styles.recordingButton
              ]}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              delayLongPress={1000}
            >
              <View style={[
                styles.captureButtonInner,
                isRecording && styles.recordingButtonInner
              ]} />
              
            </TouchableOpacity>
            <View style={styles.modeIndicator}>
              <TouchableOpacity 
                onPress={() => setIsVideoMode(false)}
                style={styles.modeButton}
              >
                <Text style={[
                  styles.modeText, 
                  { 
                  
                    fontWeight: !isVideoMode ? '600' : '400',
                    textShadowColor: theme === 'dark' ? '#000' : '#fff',
                    textShadowOffset: { width: 0.5, height: 0.5 },
                    textShadowRadius: 1,
                  }
                ]}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setIsVideoMode(true)}
                style={styles.modeButton}
              >
                <Text style={[
                  styles.modeText, 
                  { 
                    
                    fontWeight: isVideoMode ? '600' : '400',
                    textShadowColor: theme === 'dark' ? '#000' : '#fff',
                    textShadowOffset: { width: 0.5, height: 0.5 },
                    textShadowRadius: 1,
                  }
                ]}>Video</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.previewContainer}>
          {media.type === 'photo' ? (
            <>
              <Image 
                source={{ uri: media.uri }} 
                style={styles.preview}
                resizeMode="contain"
              />
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16 }}>                <TouchableOpacity
                  style={{
                    backgroundColor: colors.tint,
                    padding: 12,
                    borderRadius: 8,
                    marginHorizontal: 8,
                  }}
                  onPress={handleSavePhoto}
                >
                  <Text style={styles.buttonText}>Save to Device</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.tint,
                    padding: 12,
                    borderRadius: 8,
                    marginHorizontal: 8,
                  }}
                  onPress={handleSharePhoto}
                >
                  <Text style={styles.buttonText}>Share</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.videoContainer}>
              <Video
                ref={videoRef}
                source={{ uri: media.uri }}
                style={styles.video}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                isLooping
                shouldPlay={false}
                isMuted={false}
                onError={(error) => {
                  console.error('Video Error:', error);
                  Alert.alert(
                    'Video Error',
                    'Failed to play video. Please try again.',
                    [
                      { text: 'OK', onPress: () => {} }
                    ]
                  );
                }}
              />
              <View style={styles.videoControls}>
                <TouchableOpacity 
                  style={[styles.playButton, { backgroundColor: theme === 'dark' ? colors.tint : '#2E8B57' }]}
                  onPress={() => {
                    if (videoRef.current) {
                      videoRef.current.playAsync();
                    }
                  }}
                >
                  <Ionicons name="play" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          <TouchableOpacity 
            style={[styles.backButton, { top: 16 }]}
            onPress={handleCancel}
          >
            <Ionicons name="close" size={24} color={colors.icon} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.sendButton}
            onPress={handleSend}
          >
            <Ionicons name="paper-plane" size={24} color={colors.icon} />
          </TouchableOpacity>
        </View>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={showVaultModal}
        onRequestClose={() => setShowVaultModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { 
            backgroundColor: theme === 'dark' ? colors.background : '#F0FFF0',
            borderColor: theme === 'dark' ? colors.icon + '20' : '#2E8B57' + '20',
            shadowColor: theme === 'dark' ? 'transparent' : '#1B3B4B',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 5
          }]}>
            <View style={styles.modalHeader}>
              <Text 
                style={[styles.modalTitle, { 
                  color: theme === 'dark' ? colors.text : '#1B3B4B',
                  textAlign: 'center'
                }]}
                numberOfLines={2}
              >
                Create New Vault
              </Text>
              <TouchableOpacity onPress={() => setShowVaultModal(false)}>
                <Ionicons name="close" size={24} color={theme === 'dark' ? colors.text : '#1B3B4B'} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: theme === 'dark' ? colors.text : '#1B3B4B' }]}>Vault Name</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(46,139,87,0.05)',
                  color: theme === 'dark' ? colors.text : '#1B3B4B',
                  borderColor: theme === 'dark' ? colors.icon + '20' : '#2E8B57' + '20'
                }]}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter vault name"
                placeholderTextColor={theme === 'dark' ? colors.text + '80' : '#1B3B4B' + '80'}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: theme === 'dark' ? colors.text : '#1B3B4B' }]}>Unlock Date</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(46,139,87,0.05)',
                  color: theme === 'dark' ? colors.text : '#1B3B4B',
                  borderColor: theme === 'dark' ? colors.icon + '20' : '#2E8B57' + '20'
                }]}
                value={amount}
                onChangeText={(text) => {
                  const regex = /^\d*\.?\d*$/;
                  if (regex.test(text)) {
                    setAmount(text);
                  }
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme === 'dark' ? colors.text + '80' : '#1B3B4B' + '80'}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: theme === 'dark' ? colors.text : '#1B3B4B' }]}>Content</Text>
              <TextInput
                style={[styles.input, styles.textArea, { 
                  backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(46,139,87,0.05)',
                  color: theme === 'dark' ? colors.text : '#1B3B4B',
                  borderColor: theme === 'dark' ? colors.icon + '20' : '#2E8B57' + '20'
                }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Enter your message"
                placeholderTextColor={theme === 'dark' ? colors.text + '80' : '#1B3B4B' + '80'}
                multiline
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity
              style={[styles.createButton, { 
                backgroundColor: theme === 'dark' ? colors.tint : '#2E8B57'
              }]}
              onPress={handleCreateVault}
            >
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                Create Vault
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={showConfirmationModal}
        onRequestClose={() => setShowConfirmationModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { 
            backgroundColor: theme === 'dark' ? colors.background : '#F0FFF0',
            borderColor: theme === 'dark' ? colors.icon + '20' : '#2E8B57' + '20',
            shadowColor: theme === 'dark' ? 'transparent' : '#1B3B4B',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 5
          }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <View style={[styles.checkmarkContainer, { backgroundColor: theme === 'dark' ? colors.tint : '#2E8B57' }]}>
                  <Ionicons name="checkmark" size={32} color="white" />
                </View>
                <Text style={[styles.modalTitle, { color: theme === 'dark' ? colors.text : '#1B3B4B', marginTop: 16 }]}>
                  Vault Created!
                </Text>
              </View>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.modalLabel, { color: theme === 'dark' ? colors.text : '#1B3B4B' }]}>
                Vault Name
              </Text>
              <Text style={[styles.modalValue, { color: theme === 'dark' ? colors.text : '#1B3B4B' }]}>
                {username}
              </Text>

              <Text style={[styles.modalLabel, { color: theme === 'dark' ? colors.text : '#1B3B4B' }]}>
                Unlock Date
              </Text>
              <Text style={[styles.modalValue, { color: theme === 'dark' ? colors.text : '#1B3B4B' }]}>
                {amount}
              </Text>

              <Text style={[styles.modalLabel, { color: theme === 'dark' ? colors.text : '#1B3B4B' }]}>
                Content
              </Text>
              <Text style={[styles.modalValue, { color: theme === 'dark' ? colors.text : '#1B3B4B' }]}>
                {description}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.createButton, { 
                backgroundColor: theme === 'dark' ? colors.tint : '#2E8B57',
                marginTop: 16
              }]}
              onPress={() => {
                setShowConfirmationModal(false);
                router.push('/chat/1');
              }}
            >
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BottomNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  flipButton: {
    position: 'absolute',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 25,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
   
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  recordingButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
  },
  recordingButtonInner: {
    backgroundColor: 'red',
    borderRadius: 5,
    width: 30,
    height: 30,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  preview: {
    flex: 1,
    backgroundColor: 'black',
  },
  videoContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: 'black',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 25,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sendButton: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 25,
     zIndex: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitleContainer: {
    alignItems: 'center',
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  checkmarkContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  createButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  modeIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 24,
  },
  modeButton: {
    padding: 8,
  },
  modeText: {
    color: 'white',
    fontSize: 16,
  },
  videoControls: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalBody: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 4,
  },
  modalValue: {
    fontSize: 16,
    fontWeight: '400',
  },
});