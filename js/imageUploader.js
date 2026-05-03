/**
 * ImageUploader - Resim yükleme işlemlerini yönetir
 *
 * Şu an simülasyon modunda çalışır (gerçek sunucu yok).
 * Backend hazır olduğunda sadece uploadImage fonksiyonunun içi değişecek,
 * geri kalan editör entegrasyonu aynı kalacak.
 *
 * Gerçek backend entegrasyonu için:
 * - uploadImage içindeki setTimeout'u kaldır
 * - fetch/XMLHttpRequest ile kendi API endpoint'ine POST at
 * - Dönen JSON'dan URL'yi al
 */

/**
 * Resim dosyasını sunucuya yükler (şimdilik simülasyon).
 *
 * @param {File} file - Yüklenecek resim dosyası
 * @returns {Promise<{url: string, alt: string}>} - Yüklenen resmin URL'si ve alt metni
 *
 * @example
 * // Gerçek backend ile kullanım (ileride):
 * // const formData = new FormData();
 * // formData.append('image', file);
 * // const response = await fetch('/api/upload', { method: 'POST', body: formData });
 * // const data = await response.json();
 * // return { url: data.url, alt: file.name };
 */
export async function uploadImage(file) {
  // Dosya tipi kontrolü
  if (!file.type.startsWith('image/')) {
    throw new Error(`Geçersiz dosya türü: ${file.type}. Sadece resim dosyaları kabul edilir.`);
  }

  // Dosya boyutu kontrolü (10MB sınırı)
  const MAX_SIZE_MB = 10;
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`Dosya boyutu çok büyük (${(file.size / 1024 / 1024).toFixed(1)}MB). Maksimum: ${MAX_SIZE_MB}MB`);
  }

  // Geçici çözüm: Backend olmadığı için resmi Base64'e çeviriyoruz.
  // Neden Base64: Kullanıcının seçtiği resmi yerel olarak anında göstermek için.
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      
      reader.onload = () => {
        resolve({
          url: reader.result,
          alt: file.name.replace(/\.[^/.]+$/, ''), // Uzantıyı kaldır
        });
      };
      
      reader.onerror = () => {
        reject(new Error("Resim dosyası okunamadı."));
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      reject(error);
    }
  });
}
