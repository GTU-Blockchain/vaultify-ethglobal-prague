import lighthouse from '@lighthouse-web3/sdk';


// For better mobile support, you might want to use a simpler upload:
export const uploadToFilecoinMobile = async (fileUri) => {
  const apiKey = "YOUR_LIGHTHOUSE_API_KEY";
  
  try {
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      type: 'image/jpeg',
      name: 'snap.jpg',
    });
    
    const response = await fetch('https://node.lighthouse.storage/api/v0/add', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });
    
    const result = await response.json();
    return result.Hash;
  } catch (error) {
    console.error("❌ Mobile IPFS upload failed:", error);
    throw new Error("Failed to upload to IPFS");
  }
};
