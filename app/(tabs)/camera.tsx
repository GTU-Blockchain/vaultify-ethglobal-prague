import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNavBar } from '../components/BottomNavBar';
import { Colors } from '../constants/Colors';
import { useTheme } from '../context/ThemeContext';

export default function CameraScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [media, setMedia] = useState<{ uri: string; type: 'photo' | 'video' } | null>(null);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [username, setUsername] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [cameraType, setCameraType] = useState<'front' | 'back'>('back');
  const [isRecording, setIsRecording] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [hasStartedRecording, setHasStartedRecording] = useState(false);
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
        Alert.alert('Error', 'Failed to take photo. Please try again.');
      }
    }
  };

  const startRecording = async () => {
    if (cameraRef.current) {
      try {
        setIsRecording(true);
        setHasStartedRecording(true);
        const video = await cameraRef.current.recordAsync({
          quality: '720p',
          maxDuration: 60,
          mute: false,
          videoStabilization: false,
          isAudioEnabled: true
        });
        setMedia({ uri: video.uri, type: 'video' });
      } catch (error) {
        console.error('Error recording video:', error);
        Alert.alert('Error', 'Failed to record video. Please try again.');
      } finally {
        setIsRecording(false);
        setIsLongPressing(false);
        setHasStartedRecording(false);
      }
    }
  };

  const handlePressIn = () => {
    if (isRecording) {
      cameraRef.current?.stopRecording();
      return;
    }
    
    setIsLongPressing(true);
    longPressTimer.current = setTimeout(() => {
      startRecording();
    }, 1000); // 1 second delay
  };

  const handlePressOut = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    setIsLongPressing(false);

    if (isRecording) {
      cameraRef.current?.stopRecording();
    } else {
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
    // TODO: Implement vault creation logic
    setShowVaultModal(false);
    router.push('/chat/1');
  };

  const toggleCameraType = () => {
    setCameraType(current => current === 'back' ? 'front' : 'back');
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
              top: insets.top + 5,
              right: 16
            }]}
            onPress={toggleCameraType}
          >
            <Ionicons name="camera-reverse" size={24} color={colors.text} />
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
          </View>
        </View>
      ) : (
        <View style={styles.previewContainer}>
          {media.type === 'photo' ? (
            <Image 
              source={{ uri: media.uri }} 
              style={styles.preview}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.videoContainer}>
              <Video
                ref={videoRef}
                source={{ uri: media.uri }}
                style={styles.video}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                isLooping
                shouldPlay
                isMuted={false}
                onError={(error: string) => {
                  console.error('Video Error:', error);
                  Alert.alert('Error', 'Failed to play video. Please try again.');
                }}
              />
            </View>
          )}
          <TouchableOpacity 
            style={[styles.backButton, { top: insets.top + 10 }]}
            onPress={handleCancel}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.sendButton}
            onPress={handleSend}
          >
            <Ionicons name="paper-plane" size={24} color={colors.text} />
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
              <Text style={[styles.modalTitle, { color: theme === 'dark' ? colors.text : '#1B3B4B' }]}>Create New Vault</Text>
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
                backgroundColor: theme === 'dark' ? colors.tint : '#2E8B57',
                marginTop: 16,
                shadowColor: theme === 'dark' ? 'transparent' : '#2E8B57',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3
              }]}
              onPress={handleCreateVault}
            >
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Create Vault</Text>
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
    left: 20,
    padding: 10,
  },
  sendButton: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 25,
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
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
}); 

