import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import React, { useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWalletConnect } from '../../hooks/useWalletConnect';
import { Colors } from '../constants/Colors';

interface MediaState {
  uri: string;
  type: 'photo' | 'video';
}

export default function CameraScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  
  // Wallet hook
  const { 
    isConnected, 
    address, 
    balance, 
    isLoading: isWalletLoading,
    error: walletError,
    connect,
    disconnect
  } = useWalletConnect();
  
  // UI states
  const [media, setMedia] = useState<MediaState | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [isRecording, setIsRecording] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [hasStartedRecording, setHasStartedRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
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

  if (!permission?.granted) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={[styles.text, { color: colors.text }]}>Camera permission required</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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

      {/* Username Registration Modal */}
      <Modal visible={showUsernameModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Register Username</Text>
              <TouchableOpacity onPress={() => setShowUsernameModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={[styles.description, { color: colors.text }]}>
                Choose a unique username for your account
              </Text>
              
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.text, color: colors.text }]}
                placeholder="Enter username (3-20 characters)"
                placeholderTextColor={colors.icon}
                value={usernameInput}
                onChangeText={setUsernameInput}
              />

              <TouchableOpacity style={styles.primaryButton} onPress={handleRegisterUsername}>
                <Text style={styles.buttonText}>Register Username</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    top: -40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'red',
    marginRight: 8,
  },
  recordingTime: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});