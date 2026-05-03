import { BaseCommand } from './baseCommand.js';

/**
 * ColorCommand - Seçili metnin rengini değiştirir.
 *
 * Akış (ImageCommand pattern'ı ile benzer):
 * 1. Butona tıkla → seçimi kaydet → gizli color input'u tetikle
 * 2. Renk seçildi → seçimi geri yükle → seçili metni <span style="color:..."> ile sar
 *
 * Base64 veya execCommand kullanılmaz.
 * Inline CSS color ile çalışır.
 */
export class ColorCommand extends BaseCommand {
  constructor() {
    super({
      name: 'foreColor',
      icon: '<span style="display:inline-flex;flex-direction:column;align-items:center;line-height:1;gap:2px"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a1 1 0 0 1 0-20 10 9.5 0 0 1 10 10 3.5 3.5 0 0 1-3.5 3.5h-2.8a1.5 1.5 0 0 0-1.1 2.5 1.5 1.5 0 0 1-1.1 2.5H12z"/><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17" cy="10" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12" r=".5" fill="currentColor"/></svg><span class="color-indicator" style="width:16px;height:3px;background:#ef4444;border-radius:1px"></span></span>',
      title: 'Metin Rengi',
      shortcut: null,
      tag: null,
    });

    /** @type {HTMLInputElement|null} */
    this._colorInput = null;

    /** @type {import('../editorCore.js').EditorCore|null} */
    this._editorRef = null;
  }

  /**
   * Gizli color input'u oluşturur (lazy)
   * @private
   * @returns {HTMLInputElement}
   */
  _getColorInput() {
    if (!this._colorInput) {
      const input = document.createElement('input');
      input.type = 'color';
      input.value = '#ef4444'; // Varsayılan kırmızı
      input.style.cssText = 'position:absolute;width:0;height:0;opacity:0;pointer-events:none';
      document.body.appendChild(input);

      // Renk seçildiğinde (input event = canlı, change = kapanınca)
      input.addEventListener('input', () => {
        if (!this._editorRef) return;

        this._editorRef.restoreSelection();
        this._editorRef.applyInlineStyle('color', input.value);

        // Toolbar'daki renk göstergesini güncelle
        this._updateIndicatorColor(input.value);
      });

      this._colorInput = input;
    }
    return this._colorInput;
  }

  /**
   * Toolbar butonundaki alt renk çubuğunu günceller
   * @private
   * @param {string} color
   */
  _updateIndicatorColor(color) {
    const indicator = document.querySelector('[data-command="foreColor"] .color-indicator');
    if (indicator) {
      indicator.style.backgroundColor = color;
    }
  }

  /**
   * @param {import('../editorCore.js').EditorCore} editor
   */
  execute(editor) {
    this._editorRef = editor;
    editor.saveSelection();
    this._getColorInput().click();
  }
}
