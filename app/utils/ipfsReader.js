/**
 * Lighthouse IPFS gateway'i üzerinden CID ile dosyaları getiren yardımcı fonksiyonlar
 */

/**
 * IPFS'ten veri okuma ve dosya indirme fonksiyonları
 */

// IPFS Gateway URL
const IPFS_GATEWAY = 'https://gateway.lighthouse.storage/ipfs';

/**
 * CID ile metadata dosyasını getir
 * @param {string} cid - IPFS Content ID
 * @returns {Promise<object>} - Vault metadata objesi
 */
export const getMetadata = async (cid) => {
  try {
    const response = await fetch(`${IPFS_GATEWAY}/${cid}/vault-data.json`);
    if (!response.ok) {
      throw new Error(`Metadata getirilemedi: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Metadata yüklenirken hata oluştu:', error);
    throw error;
  }
};

/**
 * CID ile bir dizindeki tüm dosyaları listele
 * @param {string} cid - IPFS Content ID
 * @returns {Promise<Array>} - Dosya nesneleri dizisi
 */
export const listFiles = async (cid) => {
  try {
    // Metadata dosyasını getir
    const metadata = await getMetadata(cid);
    
    // Metadata'dan dosya listesini al
    if (metadata.files && Array.isArray(metadata.files)) {
      return metadata.files.map(file => ({
        name: file.name,
        path: file.path || file.name,
        type: file.type || getMimeType(file.name),
        size: file.size || 0
      }));
    }

    // Eğer metadata'da dosya listesi yoksa, dizin içeriğini al
    const response = await fetch(`${IPFS_GATEWAY}/${cid}/?format=json`, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Dizin içeriği alınamadı: ${response.status}`);
    }

    // Response'un content type'ını kontrol et
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // HTML yanıtı alındıysa, alternatif yöntem dene
      const htmlResponse = await response.text();
      
      // HTML içeriğinden dosya listesini çıkar
      const fileLinks = htmlResponse.match(/<a href="([^"]+)">([^<]+)<\/a>/g) || [];
      const files = fileLinks
        .map(link => {
          const match = link.match(/<a href="([^"]+)">([^<]+)<\/a>/);
          if (match) {
            const [, path, name] = match;
            // URL'den dosya adını çıkar
            const fileName = decodeURIComponent(name);
            // Sadece dosyaları al, dizinleri değil
            if (!fileName.endsWith('/') && fileName !== 'vault-data.json') {
              return {
                name: fileName,
                path: fileName,
                type: getMimeType(fileName),
                size: 0 // Boyut bilgisi HTML'de yok
              };
            }
          }
          return null;
        })
        .filter(Boolean); // null değerleri filtrele
      
      return files;
    }
    
    // JSON yanıtı alındıysa, normal işleme devam et
    const directoryContent = await response.json();
    
    // Dizin içeriğini dosya nesnelerine dönüştür
    const files = directoryContent.Links.map(file => ({
      name: file.Name,
      path: file.Name,
      type: file.Type === 1 ? 'directory' : getMimeType(file.Name),
      size: file.Size
    })).filter(file => file.name !== 'vault-data.json');
    
    return files;
  } catch (error) {
    console.error('Dosya listesi alınamadı:', error);
    // Hata durumunda boş dizi döndür
    return [];
  }
};

/**
 * Dosya adına göre MIME tipini belirle
 * @param {string} fileName - Dosya adı
 * @returns {string} - MIME tipi
 */
const getMimeType = (fileName) => {
  const extension = fileName.split('.').pop().toLowerCase();
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'json': 'application/json',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav'
  };
  return mimeTypes[extension] || 'application/octet-stream';
};

/**
 * IPFS'ten dosya indir
 * @param {string} cid - IPFS Content ID
 * @param {string} filePath - Dosya yolu (CID'den sonraki kısım)
 * @returns {Promise<Blob>} - Dosya içeriği blob olarak
 */
export const downloadFile = async (cid, filePath) => {
  try {
    const response = await fetch(`${IPFS_GATEWAY}/${cid}/${filePath}`);
    if (!response.ok) {
      throw new Error(`Dosya indirilemedi: ${response.status}`);
    }
    return await response.blob();
  } catch (error) {
    console.error('Dosya indirilirken hata oluştu:', error);
    throw error;
  }
};

/**
 * IPFS URL'i oluştur
 * @param {string} cid - IPFS Content ID 
 * @param {string} filePath - Dosya yolu (opsiyonel)
 * @returns {string} - IPFS gateway URL'i
 */
export const getIpfsUrl = (cid, filePath = '') => {
  if (!cid) return '';
  
  // URL'deki özel karakterleri encode et
  const encodedPath = filePath ? encodeURIComponent(filePath) : '';
  
  // URL'i oluştur ve çift slash'ları temizle
  const url = `${IPFS_GATEWAY}/${cid}${encodedPath ? `/${encodedPath}` : ''}`.replace(/([^:]\/)\/+/g, '$1');
  
  return url;
}; 