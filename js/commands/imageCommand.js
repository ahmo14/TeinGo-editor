import { BaseCommand } from './baseCommand.js';
import { uploadImage } from '../imageUploader.js';
import { t } from '../i18n.js';
import { AlertModal } from '../alertModal.js';

const esc = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/**
 * ImageCommand - Editöre resim ekleme komutu.
 *
 * Akış:
 * 1. Butona tıkla → seçimi kaydet → gizli file input aç
 * 2. Dosya seçildi → imleç noktasına loading placeholder ekle
 * 3. uploadImage(file) çağır (asenkron)
 * 4. URL döndü → placeholder'ı gerçek <img> ile değiştir
 * 5. Hata olduysa → placeholder'ı kaldır, console.error yaz
 *
 * Base64 kullanılmıyor — resim her zaman URL referansı ile gösterilir.
 */
export class ImageCommand extends BaseCommand {
  constructor() {
    super({
      name: 'insertImage',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
      title: t('menu.image') || 'Resim Ekle',
      shortcut: null,
      tag: null, // Resim aktif durum takibi gerektirmez
    });

    /** @type {HTMLInputElement|null} */
    this._fileInput = null;

    /** @type {import('../editorCore.js').EditorCore|null} */
    this._editorRef = null;
  }

  /**
   * Gizli file input'u oluşturur (lazy — ilk kullanımda)
   * @private
   * @returns {HTMLInputElement}
   */
  _getFileInput() {
    if (!this._fileInput) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      document.body.appendChild(input);

      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (file && this._editorRef) {
          await this._handleFileSelected(file, this._editorRef);
        }
        // Input'u sıfırla — aynı dosyanın tekrar seçilebilmesi için
        input.value = '';
      });

      this._fileInput = input;
    }
    return this._fileInput;
  }

  /**
   * @param {import('../editorCore.js').EditorCore} editor
   */
  execute(editor) {
    // Editor referansını sakla — file input change event'i asenkron olduğu için
    this._editorRef = editor;

    // Seçimi kaydet (file dialog açılınca focus tamamen kaybolacak)
    editor.saveSelection();

    // Gizli file input'u tetikle
    this._getFileInput().click();
  }

  /**
   * Dosya seçildikten sonra çalışır:
   * 1. Loading placeholder ekle
   * 2. Upload'ı başlat
   * 3. Başarılıysa placeholder'ı <img> ile değiştir
   * 4. Hata olduysa placeholder'ı kaldır
   *
   * @private
   * @param {File} file
   * @param {import('../editorCore.js').EditorCore} editor
   */
  async _handleFileSelected(file, editor) {
    // İmleç konumuna loading placeholder ekle
    const placeholder = this._insertPlaceholder(editor, file.name);
    if (!placeholder) return;

    try {
      const result = await uploadImage(file);

      // Placeholder'ı gerçek <img> ile değiştir
      const img = document.createElement('img');
      img.src = result.url;
      img.alt = result.alt;
      img.loading = 'lazy';
      img.contentEditable = 'false'; // <-- Burası eklendi
      // Resim boyut sınırı ve temel stili inline olarak
      // Neden inline: contenteditable içinde class ataması güvenilir değil
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.borderRadius = '4px';
      img.style.margin = '0.5em 0';
      img.style.display = 'inline-block';

      placeholder.replaceWith(img);

      // İmleci resimden sonraya taşı
      editor.setCursorAfter(img);

    } catch (error) {
      console.error('Resim yükleme hatası:', error);
      // Hata durumunda placeholder'ı kaldır
      placeholder.remove();
      AlertModal.show((error && error.message) || t('modal.image_upload_error'), t('modal.error'));
    }
  }

  /**
   * İmleç konumuna yükleme sırasında gösterilecek placeholder element ekler.
   * @private
   * @param {import('../editorCore.js').EditorCore} editor
   * @param {string} fileName
   * @returns {HTMLElement|null}
   */
  _insertPlaceholder(editor, fileName) {
    // Placeholder element oluştur
    const placeholder = document.createElement('span');
    placeholder.contentEditable = 'false'; // Kullanıcının düzenleyememesi için
    placeholder.style.cssText = [
      'display: inline-flex',
      'align-items: center',
      'gap: 8px',
      'padding: 12px 16px',
      'margin: 0.5em 0',
      'background: #f1f5f9',
      'border: 1px dashed #cbd5e1',
      'border-radius: 6px',
      'color: #64748b',
      'font-size: 13px',
      'user-select: none',
    ].join('; ');

    const loadingText = t('modal.loading') !== 'modal.loading' ? t('modal.loading') : 'Yükleniyor';
    
    // Dönen animasyon (spinner)
    placeholder.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
      <span>${esc(loadingText)}: ${esc(fileName)}</span>
    `;

    editor.insertNodeAtCursor(placeholder);

    return placeholder.parentNode ? placeholder : null;
  }
}
