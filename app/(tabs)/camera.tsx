import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { router } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNavBar } from '../components/BottomNavBar';
import { Colors } from '../constants/Colors';
import { useTheme } from '../context/ThemeContext';

interface MediaState {
  uri: string;
  type: 'photo' | 'video';
}

export default function CameraScreen() {
  const { username: routeUsername } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [media, setMedia] = useState<{ uri: string; type: 'photo' | 'video' } | null>(null);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [username, setUsername] = useState(routeUsername ? String(routeUsername) : '');
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
  
  // Form states
  const [usernameInput, setUsernameInput] = useState('');
  
  const cameraRef = useRef<CameraView>(null);
  const videoRef = useRef<Video>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);

  const handleWalletConnect = () => {
    setShowWalletModal(true);
  };

  const handleRegisterUsername = async () => {
    if (!usernameInput.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    try {
      // TODO: Implement username registration
      setUsernameInput('');
      setShowUsernameModal(false);
      Alert.alert('✅ Success', 'Username registered successfully!');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', errorMessage);
    }
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
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error taking photo:', errorMessage);
        Alert.alert('Error', 'Failed to take photo. Please try again.');
      }
    }
  };

  const startRecording = async () => {
    if (cameraRef.current) {
      try {
        setIsRecording(true);
        setHasStartedRecording(true);
        setRecordingTime(0);
        
        // Start recording timer
        recordingTimer.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);

        const video = await cameraRef.current.recordAsync({
          maxDuration: 60
        });
        
        if (video) {
          setMedia({ uri: video.uri, type: 'video' });
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error recording video:', errorMessage);
        Alert.alert('Error', 'Failed to record video. Please try again.');
      } finally {
        setIsRecording(false);
        setIsLongPressing(false);
        setHasStartedRecording(false);
        setRecordingTime(0);
        if (recordingTimer.current) {
          clearInterval(recordingTimer.current);
        }
      }
    }
  };

  const stopRecording = async () => {
    if (cameraRef.current && isRecording) {
      try {
        await cameraRef.current.stopRecording();
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error stopping recording:', errorMessage);
      }
    }
  };

  const handlePressIn = () => {
    setIsLongPressing(true);
    longPressTimer.current = setTimeout(() => {
      startRecording();
    }, 500); // Start recording after 500ms long press
  };

  const handlePressOut = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    
    if (isLongPressing && !hasStartedRecording) {
      takePhoto();
    } else if (isRecording) {
      stopRecording();
    }
    
    setIsLongPressing(false);
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
          <CameraView ref={cameraRef} style={styles.camera} facing={cameraType} />
          
          <TouchableOpacity 
            style={[styles.flipButton, { top: insets.top + 120, right: 20 }]}
            onPress={() => setCameraType(current => current === 'back' ? 'front' : 'back')}
          >
            <Ionicons name="camera-reverse" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.cameraControls}>
            <TouchableOpacity 
              style={[
                styles.captureButton,
                isRecording && styles.recordingButton
              ]} 
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
            >
              <View style={[
                styles.captureInner,
                isRecording && styles.recordingInner
              ]} />
            </TouchableOpacity>
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingTime}>
                  {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                </Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.previewContainer}>
          <Image source={{ uri: media.uri }} style={styles.preview} />
          <TouchableOpacity 
            style={[styles.actionButton, { top: insets.top + 20, left: 20 }]}
            onPress={() => setMedia(null)}
          >
            <Ionicons name="close" size={24} color="white" />
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
  container: { flex: 1 },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  camera: { flex: 1 },
  statusBar: { position: 'absolute', left: 16, right: 16, zIndex: 10 },
  walletButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, alignItems: 'center' },
  walletButtonText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  flipButton: { position: 'absolute', padding: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 25 },
  cameraControls: { position: 'absolute', bottom: 100, left: 0, right: 0, alignItems: 'center' },
  captureButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  captureInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'white' },
  previewContainer: { flex: 1, backgroundColor: 'black' },
  preview: { flex: 1 },
  actionButton: { position: 'absolute', padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 25 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalContent: { gap: 15 },
  primaryButton: { backgroundColor: '#007bff', padding: 15, borderRadius: 10, alignItems: 'center' },
  secondaryButton: { backgroundColor: '#6c757d', padding: 15, borderRadius: 10, alignItems: 'center' },
  outlineButton: { borderWidth: 2, borderColor: '#007bff', padding: 15, borderRadius: 10, alignItems: 'center' },
  dangerButton: { backgroundColor: '#dc3545', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  secondaryButtonText: { color: 'white', fontSize: 16 },
  outlineButtonText: { color: '#007bff', fontSize: 16 },
  inputContainer: { gap: 10 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  walletInfo: { backgroundColor: '#f8f9fa', padding: 15, borderRadius: 10, gap: 5 },
  label: { fontWeight: 'bold' },
  value: { fontFamily: 'monospace', marginBottom: 10 },
  description: { textAlign: 'center', marginBottom: 15 },
  errorText: { textAlign: 'center', fontSize: 14 },
  text: { fontSize: 18, textAlign: 'center', marginBottom: 20 },
  button: { backgroundColor: '#007bff', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  balanceText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  recordingButton: {
    backgroundColor: 'rgba(255,0,0,0.3)',
  },
  recordingInner: {
    backgroundColor: 'red',
  },
  recordingIndicator: {
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

