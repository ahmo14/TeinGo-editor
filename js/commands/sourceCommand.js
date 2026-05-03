import { BaseCommand } from './baseCommand.js';

/**
 * SourceCommand - Görsel editör ↔ Kaynak kodu (HTML) görünümünü değiştirir.
 *
 * Toggle mantığıyla çalışır:
 * 1. İlk tıklama → contenteditable gizlenir, textarea gösterilir (içinde saf HTML)
 * 2. İkinci tıklama → textarea'daki HTML editöre yazılır, textarea gizlenir
 *
 * Bu komut diğerlerinden farklıdır:
 * - DOM manipülasyonu yapmaz
 * - Editör alanını doğrudan yönetir
 * - Aktif olduğunda diğer butonlar devre dışı kalmalıdır (ileride geliştirilebilir)
 */
export class SourceCommand extends BaseCommand {
  constructor() {
    super({
      name: 'toggleSource',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
      title: 'Kaynak Kodu Görünümü',
      shortcut: null,
      tag: null,
    });

    /** @type {boolean} */
    this.isSourceMode = false;

    /** @type {HTMLTextAreaElement|null} */
    this._textarea = null;
  }

  /**
   * Kaynak kodu textarea'sını oluşturur (lazy)
   * @private
   * @param {HTMLElement} editorElement
   * @returns {HTMLTextAreaElement}
   */
  _getTextarea(editorElement) {
    if (!this._textarea) {
      const textarea = document.createElement('textarea');
      textarea.id = 'source-editor';
      textarea.className = [
        'w-full px-5 py-4 min-h-[300px] max-h-[60vh]',
        'text-sm font-mono text-gray-800 leading-relaxed',
        'bg-gray-50 border-none resize-none',
        'focus:outline-none',
        'overflow-y-auto',
      ].join(' ');
      textarea.spellcheck = false;
      textarea.placeholder = '<p>HTML kodunuzu buraya yazın...</p>';

      // Editör elemanının hemen sonrasına ekle
      editorElement.parentNode.insertBefore(textarea, editorElement.nextSibling);

      // Başlangıçta gizle
      textarea.style.display = 'none';

      this._textarea = textarea;
    }
    return this._textarea;
  }

  /**
   * @param {import('../editorCore.js').EditorCore} editor
   */
  execute(editor) {
    const editorElement = editor.editorElement;
    const textarea = this._getTextarea(editorElement);

    if (!this.isSourceMode) {
      // ── Görsel → Kaynak ──
      // HTML'i güzelleştirerek textarea'ya yaz
      textarea.value = this._formatHtml(editorElement.innerHTML);

      // Editörü gizle, textarea'yı göster
      editorElement.style.display = 'none';
      textarea.style.display = 'block';
      textarea.focus();

      this.isSourceMode = true;

      // Status bar güncelle
      const statusBar = document.getElementById('status-bar');
      if (statusBar) statusBar.textContent = 'Kaynak Kodu Modu';

    } else {
      // ── Kaynak → Görsel ──
      // Textarea'daki HTML'i editöre yaz
      editorElement.innerHTML = textarea.value;

      // Textarea'yı gizle, editörü göster
      textarea.style.display = 'none';
      editorElement.style.display = 'block';
      editorElement.focus();

      this.isSourceMode = false;

      // Status bar güncelle
      const statusBar = document.getElementById('status-bar');
      if (statusBar) statusBar.textContent = 'Hazır';
    }
  }

  /**
   * HTML kodunu okunabilir şekilde formatlar (basit indentation).
   * Tam bir HTML formatter değil, temel blok tag'ları ayrı satıra alır.
   * @private
   * @param {string} html
   * @returns {string}
   */
  _formatHtml(html) {
    // Boş string kontrolü
    if (!html || !html.trim()) return '';

    // Block-level tag'ları yeni satıra al
    const blockTags = ['p', 'h[1-6]', 'div', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'blockquote', 'pre', 'hr', 'br'];
    let formatted = html;

    // Açılış tag'larından önce yeni satır
    blockTags.forEach((tag) => {
      const openRegex = new RegExp(`(<${tag}[^>]*>)`, 'gi');
      formatted = formatted.replace(openRegex, '\n$1');
    });

    // Kapanış tag'larından sonra yeni satır
    blockTags.forEach((tag) => {
      const closeRegex = new RegExp(`(</${tag}>)`, 'gi');
      formatted = formatted.replace(closeRegex, '$1\n');
    });

    // Ardışık boş satırları temizle
    formatted = formatted.replace(/\n{3,}/g, '\n\n');

    return formatted.trim();
  }
}
