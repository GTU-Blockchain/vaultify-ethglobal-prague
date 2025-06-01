import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWalletConnect } from '../../hooks/useWalletConnect';
import { BottomNavBar } from '../components/BottomNavBar';
import { useTheme } from '../context/ThemeContext';
import { vaultService } from '../services/VaultService';
import { walletConnectService } from '../services/WalletConnectService';

export default function CameraScreen() {
  const { username: routeUsername } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();

  // WalletConnect integration
  const {
    isConnected,
    isRegistered,
    isOnFlowTestnet,
    error: walletError,
    connect,
    switchToFlowTestnet,
    registerUsername,
  } = useWalletConnect();

  // Media state
  const [media, setMedia] = useState<{ uri: string; type: 'photo' | 'video' } | null>(null);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [isCreatingVault, setIsCreatingVault] = useState(false);
  
  // Form state
  const [vaultName, setVaultName] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const [content, setContent] = useState('');
  const [recipientAddress, setRecipientAddress] = useState(routeUsername ? String(routeUsername) : '');
  const [flowAmount, setFlowAmount] = useState('');
  const [isImmediateVault, setIsImmediateVault] = useState(false);
  
  // Username registration state
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [isRegisteringUsername, setIsRegisteringUsername] = useState(false);
  
  // Camera state
  const [cameraType, setCameraType] = useState<'front' | 'back'>('back');
  const [isRecording, setIsRecording] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [hasStartedRecording, setHasStartedRecording] = useState(false);
  const [isVideoMode, setIsVideoMode] = useState(false);
  
  // Refs
  const cameraRef = useRef<any>(null);
  const videoRef = useRef<any>(null);
  const longPressTimer = useRef<number | null>(null);

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

  const validateForm = (): boolean => {
    if (!vaultName.trim()) {
      handleError('Vault name is required');
      return false;
    }
    
    if (!unlockDate) {
      handleError('Unlock date is required');
      return false;
    }
    
    // Validate date format and parse
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(unlockDate)) {
      handleError('Please enter date in YYYY-MM-DD format');
      return false;
    }
    
    const selectedDate = new Date(unlockDate + 'T00:00:00'); // Add time to ensure proper parsing
    if (isNaN(selectedDate.getTime())) {
      handleError('Invalid date. Please enter a valid date');
      return false;
    }
    
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset time to compare dates only
    selectedDate.setHours(0, 0, 0, 0);
    
    // Skip future date validation for immediate vaults
    if (!isImmediateVault && selectedDate <= now) {
      handleError('Unlock date must be in the future');
      return false;
    }
    
    if (!recipientAddress.trim()) {
      handleError('Recipient wallet address is required');
      return false;
    }
    
    // Basic Ethereum address validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(recipientAddress.trim())) {
      handleError('Invalid wallet address format');
      return false;
    }
    
    if (!flowAmount.trim() || parseFloat(flowAmount) <= 0) {
      handleError('Flow amount must be greater than 0');
      return false;
    }
    
    return true;
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
    // Reset form
    setVaultName('');
    setUnlockDate('');
    setContent('');
    setRecipientAddress(routeUsername ? String(routeUsername) : '');
    setFlowAmount('');
  };

  const handleCreateVault = async () => {
    if (!validateForm()) {
      return;
    }

    if (!walletConnectService.isWalletConnected()) {
      handleError('Please connect your wallet first');
      return;
    }

    setIsCreatingVault(true);
    try {
      // Since we already check isRegistered in the main render condition,
      // we don't need to check username again here
      const result = await vaultService.createVault({
        vaultName: vaultName.trim(),
        unlockDate,
        content: content.trim(),
        recipientAddress: recipientAddress.trim(),
        flowAmount: flowAmount.trim(),
        mediaUri: media?.uri,
        mediaType: media?.type,
        isImmediateVault: isImmediateVault
      });

      console.log('Vault created successfully:', result);
      setShowVaultModal(false);
      setShowConfirmationModal(true);

    } catch (error: any) {
      console.error('Error creating vault:', error);
      
      // Provide more specific guidance based on error type
      const errorMessage = error.message || 'Failed to create vault. Please try again.';
      
      if (errorMessage.includes('recipient must register') || errorMessage.includes('recipient address is not registered')) {
        Alert.alert(
          'Recipient Not Registered',
          'The recipient address you entered is not registered on the platform. The recipient must register a username before they can receive vaults.\n\nPlease ask them to register first, or use a different address.',
          [
            { text: 'Change Address', onPress: () => {} },
            { text: 'OK', onPress: () => {} }
          ]
        );
      } else if (errorMessage.includes('both sender and recipient must have registered')) {
        Alert.alert(
          'Registration Required',
          'Both you and the recipient must have registered usernames to create vaults.',
          [{ text: 'OK', onPress: () => {} }]
        );
      } else {
        handleError(errorMessage);
      }
    } finally {
      setIsCreatingVault(false);
    }
  };

  const handleRegisterUsername = async () => {
    if (!usernameInput.trim()) {
      handleError('Username is required');
      return;
    }

    if (usernameInput.length < 3 || usernameInput.length > 20) {
      handleError('Username must be between 3 and 20 characters');
      return;
    }

    setIsRegisteringUsername(true);

    try {
      await vaultService.registerUsername(usernameInput.trim());
      setShowUsernameModal(false);
      setUsernameInput('');
      setShowVaultModal(true); // Go back to vault creation
      
      Alert.alert(
        'Success',
        'Username registered successfully! Now you can create vaults.',
        [{ text: 'OK' }]
      );

    } catch (error: any) {
      console.error('Error registering username:', error);
      handleError(error.message || 'Failed to register username. Please try again.');
    } finally {
      setIsRegisteringUsername(false);
    }
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

  // Format date for input (YYYY-MM-DD format)
  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Get minimum date (tomorrow)
  const getMinDate = (): string => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateForInput(tomorrow);
  };

  // Handle immediate vault toggle
  const handleImmediateVaultToggle = () => {
    setIsImmediateVault(!isImmediateVault);
    if (!isImmediateVault) {
      // Set unlock date to today when enabling immediate vault
      setUnlockDate(formatDateForInput(new Date()));
    } else {
      // Reset to minimum date when disabling immediate vault
      setUnlockDate(getMinDate());
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

  // If not connected or not registered, show appropriate UI
  if (!isConnected || !isOnFlowTestnet || !isRegistered) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContent}>
          <Ionicons
            name={!isConnected ? "wallet-outline" : !isOnFlowTestnet ? "warning-outline" : "person-add-outline"}
            size={64}
            color={colors.text + '60'}
          />
          <Text style={[styles.title, { color: colors.text }]}
          numberOfLines={2}
          adjustsFontSizeToFit
          >
            {!isConnected ? "Connect Your Wallet" :
             !isOnFlowTestnet ? "Wrong Network" :
             "Register Username"}
          </Text>
          <Text style={[styles.subtitle, { color: colors.text + '80' }]}
          numberOfLines={2}
          adjustsFontSizeToFit
          >
            {!isConnected ? "Please connect your wallet to continue" :
             !isOnFlowTestnet ? "Please switch to Flow Testnet" :
             "Register a username to start using Vaultify"}
          </Text>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.tint }]}
            onPress={async () => {
              try {
                if (!isConnected) {
                  await connect();
                } else if (!isOnFlowTestnet) {
                  await switchToFlowTestnet();
                } else {
                  setShowUsernameModal(true);
                }
              } catch (error) {
                console.error('Action failed:', error);
                Alert.alert('Error', error instanceof Error ? error.message : 'Operation failed');
              }
            }}
          >
            <Text style={[styles.actionButtonText, { color: colors.background }]}>
              {!isConnected ? "Connect Wallet" :
               !isOnFlowTestnet ? "Switch Network" :
               "Register Username"}
            </Text>
          </TouchableOpacity>
        </View>
        <BottomNavBar />
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
              top: 16,
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
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16 }}>
                <TouchableOpacity
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

      {/* Vault Creation Modal */}
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
                value={vaultName}
                onChangeText={setVaultName}
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
                value={unlockDate}
                onChangeText={(text) => {
                  // Auto-format as user types: YYYY-MM-DD
                  let formatted = text.replace(/\D/g, ''); // Remove non-digits
                  if (formatted.length >= 5) {
                    formatted = formatted.substring(0, 4) + '-' + formatted.substring(4);
                  }
                  if (formatted.length >= 8) {
                    formatted = formatted.substring(0, 7) + '-' + formatted.substring(7, 9);
                  }
                  if (formatted.length <= 10) {
                    setUnlockDate(formatted);
                  }
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme === 'dark' ? colors.text + '80' : '#1B3B4B' + '80'}
                keyboardType="numeric"
                maxLength={10}
                editable={!isImmediateVault}
              />
              <View style={styles.immediateVaultContainer}>
                <TouchableOpacity 
                  style={styles.checkboxContainer} 
                  onPress={handleImmediateVaultToggle}
                >
                  <View style={[
                    styles.checkbox, 
                    { 
                      backgroundColor: isImmediateVault ? (theme === 'dark' ? colors.tint : '#2E8B57') : 'transparent',
                      borderColor: theme === 'dark' ? colors.text + '40' : '#1B3B4B' + '40'
                    }
                  ]}>
                    {isImmediateVault && (
                      <Ionicons name="checkmark" size={16} color="white" />
                    )}
                  </View>
                  <Text style={[
                    styles.checkboxLabel, 
                    { color: theme === 'dark' ? colors.text : '#1B3B4B' }
                  ]}>
                    Create Immediate Vault
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.helperText, { color: theme === 'dark' ? colors.text + '60' : '#1B3B4B' + '60' }]}>
                  {isImmediateVault ? 'Recipient can open this vault after 10 seconds' : `Minimum date: ${getMinDate()}`}
                </Text>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: theme === 'dark' ? colors.text : '#1B3B4B' }]}>Recipient Wallet Address</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(46,139,87,0.05)',
                  color: theme === 'dark' ? colors.text : '#1B3B4B',
                  borderColor: theme === 'dark' ? colors.icon + '20' : '#2E8B57' + '20'
                }]}
                value={recipientAddress}
                onChangeText={setRecipientAddress}
                placeholder="0x..."
                placeholderTextColor={theme === 'dark' ? colors.text + '80' : '#1B3B4B' + '80'}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: theme === 'dark' ? colors.text : '#1B3B4B' }]}>Flow Amount</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(46,139,87,0.05)',
                  color: theme === 'dark' ? colors.text : '#1B3B4B',
                  borderColor: theme === 'dark' ? colors.icon + '20' : '#2E8B57' + '20'
                }]}
                value={flowAmount}
                onChangeText={(text) => {
                  const regex = /^\d*\.?\d*$/;
                  if (regex.test(text)) {
                    setFlowAmount(text);
                  }
                }}
                placeholder="0.0"
                placeholderTextColor={theme === 'dark' ? colors.text + '80' : '#1B3B4B' + '80'}
                keyboardType="decimal-pad"
              />
              <Text style={[styles.helperText, { color: theme === 'dark' ? colors.text + '60' : '#1B3B4B' + '60' }]}>
                Amount of FLOW tokens to send
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: theme === 'dark' ? colors.text : '#1B3B4B' }]}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea, { 
                  backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(46,139,87,0.05)',
                  color: theme === 'dark' ? colors.text : '#1B3B4B',
                  borderColor: theme === 'dark' ? colors.icon + '20' : '#2E8B57' + '20'
                }]}
                value={content}
                onChangeText={setContent}
                placeholder="Enter your message"
                placeholderTextColor={theme === 'dark' ? colors.text + '80' : '#1B3B4B' + '80'}
                multiline
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity
              style={[styles.createButton, { 
                backgroundColor: theme === 'dark' ? colors.tint : '#2E8B57',
                opacity: isCreatingVault ? 0.7 : 1
              }]}
              onPress={handleCreateVault}
              disabled={isCreatingVault}
            >
              {isCreatingVault ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={[styles.buttonText, { color: '#FFFFFF', marginLeft: 8 }]}>
                    Creating Vault...
                  </Text>
                </View>
              ) : (
                <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                  Create Vault
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal */}
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
                {vaultName}
              </Text>

              <Text style={[styles.modalLabel, { color: theme === 'dark' ? colors.text : '#1B3B4B' }]}>
                Unlock Date
              </Text>
              <Text style={[styles.modalValue, { color: theme === 'dark' ? colors.text : '#1B3B4B' }]}>
                {unlockDate}
              </Text>

              <Text style={[styles.modalLabel, { color: theme === 'dark' ? colors.text : '#1B3B4B' }]}>
                Recipient
              </Text>
              <Text style={[styles.modalValue, { color: theme === 'dark' ? colors.text : '#1B3B4B' }]}>
                {recipientAddress}
              </Text>

              <Text style={[styles.modalLabel, { color: theme === 'dark' ? colors.text : '#1B3B4B' }]}>
                Flow Amount
              </Text>
              <Text style={[styles.modalValue, { color: theme === 'dark' ? colors.text : '#1B3B4B' }]}>
                {flowAmount} FLOW
              </Text>

              <Text style={[styles.modalLabel, { color: theme === 'dark' ? colors.text : '#1B3B4B' }]}>
                Message
              </Text>
              <Text style={[styles.modalValue, { color: theme === 'dark' ? colors.text : '#1B3B4B' }]}>
                {content}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.createButton, { 
                backgroundColor: theme === 'dark' ? colors.tint : '#2E8B57',
                marginTop: 16
              }]}
              onPress={() => {
                setShowConfirmationModal(false);
                handleCancel(); // Reset form and media
                router.push('/chat/1');
              }}
            >
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Username Registration Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showUsernameModal}
        onRequestClose={() => setShowUsernameModal(false)}
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
                Register Username
              </Text>
              <TouchableOpacity onPress={() => setShowUsernameModal(false)}>
                <Ionicons name="close" size={24} color={theme === 'dark' ? colors.text : '#1B3B4B'} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { 
              color: theme === 'dark' ? colors.text : '#1B3B4B',
              marginBottom: 8,
              textAlign: 'center'
            }]}>
              You need to register a username before creating vaults
            </Text>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: theme === 'dark' ? colors.text : '#1B3B4B' }]}>Username</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(46,139,87,0.05)',
                  color: theme === 'dark' ? colors.text : '#1B3B4B',
                  borderColor: theme === 'dark' ? colors.icon + '20' : '#2E8B57' + '20'
                }]}
                value={usernameInput}
                onChangeText={setUsernameInput}
                placeholder="Enter username (3-20 characters)"
                placeholderTextColor={theme === 'dark' ? colors.text + '80' : '#1B3B4B' + '80'}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
              />
              <Text style={[styles.helperText, { color: theme === 'dark' ? colors.text + '60' : '#1B3B4B' + '60' }]}>
                This username will be associated with your wallet address
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.createButton, { 
                backgroundColor: theme === 'dark' ? colors.tint : '#2E8B57',
                opacity: isRegisteringUsername ? 0.7 : 1
              }]}
              onPress={handleRegisterUsername}
              disabled={isRegisteringUsername}
            >
              {isRegisteringUsername ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={[styles.buttonText, { color: '#FFFFFF', marginLeft: 8 }]}>
                    Registering...
                  </Text>
                </View>
              ) : (
                <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                  Register Username
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.createButton, { 
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: theme === 'dark' ? colors.text + '30' : '#1B3B4B' + '30',
                marginTop: 8
              }]}
              onPress={() => {
                setShowUsernameModal(false);
                setShowVaultModal(true);
              }}
            >
              <Text style={[styles.buttonText, { color: theme === 'dark' ? colors.text : '#1B3B4B' }]}>
                Cancel
              </Text>
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
    maxHeight: '90%',
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
  helperText: {
    fontSize: 12,
    marginTop: 4,
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
  loadingContainer: {
    flexDirection: 'row',
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  actionButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  immediateVaultContainer: {
    marginTop: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
});
