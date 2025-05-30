import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, TextInput } from 'react-native';
import { Camera } from 'expo-camera';
import { useFCL } from '../context/FCLContext';
import { create } from 'ipfs-http-client';

interface TimeCapsuleData {
  photo: string;
  message: string;
  amount: number;
  unlockTime: Date;
  recipient: string;
}

const CameraScreen: React.FC = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [message, setMessage] = useState('');
  const [amount, setAmount] = useState('');
  const [unlockTime, setUnlockTime] = useState('');
  const [recipient, setRecipient] = useState('');
  const cameraRef = useRef<Camera>(null);
  const { sendTransaction } = useFCL();

  React.useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      return photo.uri;
    }
  };

  const uploadToIPFS = async (photoUri: string) => {
    const ipfs = create({ url: 'https://ipfs.infura.io:5001/api/v0' });
    const response = await fetch(photoUri);
    const blob = await response.blob();
    const result = await ipfs.add(blob);
    return result.path;
  };

  const createTimeCapsule = async () => {
    try {
      // Take picture
      const photoUri = await takePicture();
      if (!photoUri) throw new Error('Failed to take picture');

      // Upload to IPFS
      const ipfsHash = await uploadToIPFS(photoUri);

      // Create time capsule data
      const timeCapsuleData: TimeCapsuleData = {
        photo: ipfsHash,
        message,
        amount: parseFloat(amount),
        unlockTime: new Date(unlockTime),
        recipient,
      };

      // Send transaction to Flow blockchain
      const txId = await sendTransaction(
        timeCapsuleData.amount,
        timeCapsuleData.recipient
      );

      console.log('Time capsule created:', txId);
      // Handle success (e.g., show confirmation, navigate back)
    } catch (error) {
      console.error('Error creating time capsule:', error);
      // Handle error
    }
  };

  if (hasPermission === null) {
    return <View />;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      <Camera style={styles.camera} ref={cameraRef}>
        <View style={styles.overlay}>
          <TextInput
            style={styles.input}
            placeholder="Message"
            value={message}
            onChangeText={setMessage}
          />
          <TextInput
            style={styles.input}
            placeholder="Amount (FLOW)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Unlock Time (YYYY-MM-DD)"
            value={unlockTime}
            onChangeText={setUnlockTime}
          />
          <TextInput
            style={styles.input}
            placeholder="Recipient Address"
            value={recipient}
            onChangeText={setRecipient}
          />
          <TouchableOpacity
            style={styles.button}
            onPress={createTimeCapsule}
          >
            <Text style={styles.buttonText}>Create Time Capsule</Text>
          </TouchableOpacity>
        </View>
      </Camera>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: 20,
    justifyContent: 'flex-end',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CameraScreen; 