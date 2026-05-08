/**
 * ImageUploader - Resim yükleme işlemlerini yönetir.
 */

const tx = (source) => window.EditorUiLocalization?.translate(source) || source;
const txf = (source, ...args) => tx(source).replace(/\{(\d+)\}/g, (_, i) => args[i] ?? '');
const MAX_IMAGE_SIZE_MB = 5;

async function readJsonResponse(response) {
  const ct = response.headers.get('content-type') || '';
  if (ct.toLowerCase().includes('application/json')) {
    return response.json();
  }
  throw new Error(txf('Sunucu hatası: {0}', response.status));
}

function isNetworkUploadError(error) {
  const message = String(error?.message || '');
  return error instanceof TypeError
    || message === 'Failed to fetch'
    || message === 'Load failed'
    || /NetworkError/i.test(message);
}

/**
 * Resim dosyasını sunucuya yükler.
 *
 * @param {File} file - Yüklenecek resim dosyası
 * @returns {Promise<{url: string, alt: string}>} - Yüklenen resmin URL'si ve alt metni
 *
 */
export async function uploadImage(file) {
  // Dosya tipi kontrolü
  if (!file.type.startsWith('image/')) {
    throw new Error(txf('Geçersiz dosya türü: {0}. Sadece resim dosyaları kabul edilir.', file.type));
  }

  // Sunucudaki /Upload/Image limitiyle aynı sınır.
  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    throw new Error(txf('Dosya boyutu çok büyük ({0}MB). Maksimum: {1}MB', (file.size / 1024 / 1024).toFixed(1), MAX_IMAGE_SIZE_MB));
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/Upload/Image', {
      method: 'POST',
      body: formData,
      credentials: 'same-origin',
      headers: { 'RequestVerificationToken': document.querySelector('meta[name="csrf-token"]')?.content ?? '' },
    });
    const data = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error((data && data.error) || tx('Görsel yüklenemedi.'));
    }

    if (!data || !data.location) {
      throw new Error(tx('Görsel yüklenemedi.'));
    }

    return {
      url: data.location,
      alt: file.name.replace(/\.[^/.]+$/, ''),
    };
  } catch (error) {
    if (isNetworkUploadError(error)) {
      throw new Error(tx('Görsel yükleme bağlantısı kurulamadı. Lütfen görsel boyutunu küçültüp tekrar deneyin.'));
    }
    throw error;
  }
}
