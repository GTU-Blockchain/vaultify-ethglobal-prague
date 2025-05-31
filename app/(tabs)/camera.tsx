import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import React, { useRef, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';

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

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

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
    // TODO: Implement vault creation
    console.log('Creating vault:', { username, amount, description });
    setShowVaultModal(false);
    setMedia(null);
    setUsername('');
    setAmount('');
    setDescription('');
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
    <View style={styles.container}>
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
        visible={showVaultModal}
        animationType="slide"
        transparent={true}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowVaultModal(false)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>

              <Text style={[styles.modalTitle, { color: colors.text }]}>Create New Vault</Text>
              <View style={styles.modalCloseButton} />
            </View>
            
            <Text style={[styles.inputLabel, { color: colors.text }]}>Send to @</Text>

            <TextInput
              style={[styles.input, { 
                backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                color: colors.text,
              }]}

              placeholder="Enter username"

              placeholderTextColor={colors.icon}
              value={username}
              onChangeText={setUsername}
            />


            <Text style={[styles.inputLabel, { color: colors.text }]}>Flow Coins Amount</Text>

            <TextInput
              style={[styles.input, { 
                backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                color: colors.text,
              }]}

              placeholder="Enter amount (min 0.0001 FLOW)"
              placeholderTextColor={colors.icon}
              value={amount}
              onChangeText={(text) => {
                const regex = /^\d*\.?\d*$/;
                if (regex.test(text)) {
                  setAmount(text);
                }
              }}
              keyboardType="decimal-pad"
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Vault Message</Text>

            <TextInput
              style={[styles.input, styles.textArea, { 
                backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                color: colors.text,
              }]}

              placeholder="Add a message to your vault (optional)"

              placeholderTextColor={colors.icon}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity 

              style={[
                styles.createButton, 
                { 
                  backgroundColor: colors.tint,
                  opacity: (!username || !amount || parseFloat(amount) < 0.0001) ? 0.5 : 1
                }
              ]}
              onPress={handleCreateVault}
              disabled={!username || !amount || parseFloat(amount) < 0.0001}

            >
              <Text style={styles.createButtonText}>Create Vault</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalCloseButton: {
    padding: 8,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    height: 50,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 15,
  },
  createButton: {
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,

  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,

  },
});