/**
 * ContentService - Editör içeriğini temizleme, paketleme ve API'ye gönderme.
 *
 * Üç temel sorumluluk:
 * 1. getCleanHTML()   → Raw HTML'i normalize eder, gereksiz attribute'ları temizler
 * 2. buildPayload()   → API'ye gönderilecek JSON objesini oluşturur
 * 3. saveContent()    → fetch POST simülasyonu (ileride gerçek endpoint'e bağlanacak)
 *
 * ASP.NET Core backend bağlantısı için:
 * - API_ENDPOINT sabitini gerçek URL ile değiştir
 * - saveContent içindeki simülasyon bloğunu kaldır
 * - fetch çağrısının yorumunu aç
 */

import { t } from './i18n.js';

/** @type {string} Backend API endpoint'i */
const API_ENDPOINT = '/api/contents/save';

// ──────────────────────────────────────────────
// HTML Temizleme
// ──────────────────────────────────────────────

/**
 * Editör HTML içeriğini temizler ve normalize eder.
 *
 * Temizleme adımları:
 * 1. Editör DOM'unu klonla (orijinale dokunma)
 * 2. contenteditable attribute'larını kaldır
 * 3. Boş class attribute'larını kaldır
 * 4. data-placeholder gibi editör-özel attribute'ları temizle
 * 5. Ardışık boş satırları birleştir
 * 6. Boş paragrafları (sadece <br> veya whitespace içeren) kaldır
 *
 * @param {HTMLElement} editorElement - contenteditable div
 * @returns {string} Temizlenmiş HTML string
 */
export function getCleanHTML(editorElement) {
  // Orijinal DOM'a dokunmamak için klonla
  const clone = editorElement.cloneNode(true);

  // 1. Gereksiz contenteditable attribute'larını kaldır
  //    (formül, embed gibi contenteditable="false" olanlar HARİÇ — onlar korunsun)
  clone.removeAttribute('contenteditable');
  clone.querySelectorAll('[contenteditable="true"]').forEach((el) => {
    el.removeAttribute('contenteditable');
  });

  // 2. Boş class attribute'larını kaldır
  clone.querySelectorAll('[class=""]').forEach((el) => {
    el.removeAttribute('class');
  });

  // 3. Editöre özel data attribute'ları temizle
  clone.removeAttribute('data-placeholder');
  clone.removeAttribute('role');
  clone.removeAttribute('aria-multiline');
  clone.removeAttribute('aria-label');
  clone.removeAttribute('spellcheck');

  clone.querySelectorAll('[data-cre-media-selected], .editor-media-selected').forEach((el) => {
    el.classList.remove('editor-media-selected');
    el.removeAttribute('data-cre-media-selected');
    el.style.outline = '';
    el.style.outlineOffset = '';
    el.style.boxShadow = '';
    if (!el.getAttribute('class')) {
      el.removeAttribute('class');
    }
  });

  // 4. Boş span'ları kaldır (stil uygulanmamış, sarma amaçsız olanlar)
  //    Neden: Bazen DOM manipülasyonu sonucu içi boş veya stilsiz span'lar kalabiliyor
  clone.querySelectorAll('span').forEach((span) => {
    const hasStyle = span.getAttribute('style');
    const hasClass = span.getAttribute('class');
    const hasDataAttr = Array.from(span.attributes).some((a) => a.name.startsWith('data-'));

    // Stili, class'ı ve data attribute'ı yoksa → gereksiz wrapper, kaldır
    if (!hasStyle && !hasClass && !hasDataAttr) {
      // İçeriğini koruyarak span'ı kaldır (unwrap)
      const parent = span.parentNode;
      while (span.firstChild) {
        parent.insertBefore(span.firstChild, span);
      }
      parent.removeChild(span);
    }
  });

  // 5. Tamamen boş paragrafları temizle
  //    (sadece <br> veya whitespace içerenler)
  clone.querySelectorAll('p').forEach((p) => {
    const text = p.textContent.trim();
    const hasOnlyBr = p.innerHTML.trim() === '<br>' || p.innerHTML.trim() === '';
    const hasChildren = p.querySelector('img, video, audio, table, .formula-inline, .embed-wrapper');

    if (!text && hasOnlyBr && !hasChildren) {
      p.remove();
    }
  });

  // 6. HTML string'i al
  let html = clone.innerHTML;

  // 7. Ardışık boş satırları tek satıra indir
  html = html.replace(/(\s*<br\s*\/?>\s*){3,}/gi, '<br><br>');

  // 8. Baş ve sondaki boşlukları temizle
  html = html.trim();

  return html;
}

// ──────────────────────────────────────────────
// Payload Oluşturma
// ──────────────────────────────────────────────

/**
 * API'ye gönderilecek JSON payload objesini oluşturur.
 *
 * @param {HTMLElement} editorElement - contenteditable div
 * @param {string} [title] - İçerik başlığı (opsiyonel, otomatik çıkarılabilir)
 * @returns {ContentPayload}
 */

/**
 * @typedef {Object} ContentPayload
 * @property {string} title - İçerik başlığı
 * @property {string} content - Temizlenmiş HTML içerik
 * @property {string} plainText - Düz metin (HTML tag'sız)
 * @property {number} wordCount - Kelime sayısı
 * @property {number} charCount - Karakter sayısı (boşluk hariç)
 * @property {string} createdAt - ISO 8601 tarih
 * @property {string} locale - Dil kodu
 */

export function buildPayload(editorElement, title) {
  const cleanHTML = getCleanHTML(editorElement);

  // Düz metin çıkarımı (tag'sız)
  const plainText = editorElement.innerText.trim();

  // Otomatik başlık çıkarımı (eğer title parametresi verilmediyse)
  const autoTitle = title || extractTitle(editorElement);

  // Kelime ve karakter sayıları
  const words = plainText.split(/\s+/).filter((w) => w.length > 0);
  const charCount = plainText.replace(/\s/g, '').length;

  return {
    title: autoTitle,
    content: cleanHTML,
    plainText,
    wordCount: words.length,
    charCount,
    createdAt: new Date().toISOString(),
    locale: 'tr-TR',
  };
}

/**
 * Editör içeriğinden otomatik başlık çıkarır.
 * Öncelik: h2 > h3 > ilk paragrafın ilk 50 karakteri > "Başlıksız İçerik"
 *
 * @param {HTMLElement} editorElement
 * @returns {string}
 */
function extractTitle(editorElement) {
  // h2 varsa onu al
  const h2 = editorElement.querySelector('h2');
  if (h2?.textContent?.trim()) return h2.textContent.trim();

  // h3 varsa onu al
  const h3 = editorElement.querySelector('h3');
  if (h3?.textContent?.trim()) return h3.textContent.trim();

  // İlk paragraftan kısa başlık çıkar
  const firstP = editorElement.querySelector('p');
  if (firstP?.textContent?.trim()) {
    const text = firstP.textContent.trim();
    return text.length > 50 ? `${text.substring(0, 50)}...` : text;
  }

  // Hiçbir şey yoksa
  const fallback = editorElement.innerText?.trim();
  if (fallback) {
    return fallback.length > 50 ? `${fallback.substring(0, 50)}...` : fallback;
  }

  return t('modal.untitled_content') || 'Başlıksız İçerik';
}

// ──────────────────────────────────────────────
// API İsteği
// ──────────────────────────────────────────────

/**
 * İçeriği backend API'sine gönderir.
 *
 * ŞU AN: Simülasyon modu — 1 saniye bekle, console.log ile sonucu göster.
 * İLERİDE: fetch ile gerçek endpoint'e POST at.
 *
 * @param {ContentPayload} payload - Gönderilecek veri
 * @returns {Promise<{success: boolean, message: string}>}
 *
 * @example
 * // Gerçek ASP.NET Core backend bağlantısı:
 * // const response = await fetch(API_ENDPOINT, {
 * //   method: 'POST',
 * //   headers: {
 * //     'Content-Type': 'application/json',
 * //     'Authorization': `Bearer ${token}`,  // JWT token
 * //   },
 * //   body: JSON.stringify(payload),
 * // });
 * // if (!response.ok) throw new Error(`HTTP ${response.status}`);
 * // return await response.json();
 */
export async function saveContent(payload) {
  // ──────────────────────────────────────────────
  // SİMÜLASYON BLOĞU
  // Gerçek backend hazır olduğunda bu bloğu kaldır,
  // aşağıdaki fetch çağrısının yorumunu aç
  // ──────────────────────────────────────────────

  console.group('📤 İçerik Kaydetme İsteği');
  console.log(`📎 Endpoint: POST ${API_ENDPOINT}`);
  console.log('📋 Payload:', JSON.stringify(payload, null, 2));
  console.log(`📊 İstatistikler: ${payload.wordCount} kelime, ${payload.charCount} karakter`);

  // 1 saniyelik ağ gecikmesi simülasyonu
  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log('✅ Sunucu Yanıtı: { "status": 200, "message": "İçerik başarıyla kaydedildi" }');
  console.groupEnd();

  return {
    success: true,
    message: t('modal.content_saved_success') || 'İçerik başarıyla kaydedildi.',
  };

  // ──────────────────────────────────────────────
  // GERÇEK FETCH ÇAĞRISI (ileride yorumu aç):
  // ──────────────────────────────────────────────
  //
  // try {
  //   const response = await fetch(API_ENDPOINT, {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       // 'Authorization': `Bearer ${getAuthToken()}`,
  //     },
  //     body: JSON.stringify(payload),
  //   });
  //
  //   if (!response.ok) {
  //     const errorBody = await response.text();
  //     throw new Error(`HTTP ${response.status}: ${errorBody}`);
  //   }
  //
  //   const data = await response.json();
  //   return { success: true, message: data.message || 'Kaydedildi.' };
  //
  // } catch (error) {
  //   console.error('API hatası:', error);
  //   return { success: false, message: `Kaydetme hatası: ${error.message}` };
  // }
}
