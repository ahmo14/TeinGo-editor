import { BaseCommand } from './baseCommand.js';
import { PromptModal } from '../promptModal.js';

/**
 * LinkCommand - Seçili metni <a href="..." target="_blank"> bağlantısına dönüştürür.
 *
 * Akış:
 * 1. Butona tıkla → seçimi kaydet
 * 2. PromptModal ile URL sor
 * 3. Seçimi geri yükle → seçili metni <a> ile sar
 *
 * Eğer seçim boşsa (collapsed) → URL aynı zamanda görünen metin olarak kullanılır.
 * Eğer imleç zaten bir <a> içindeyse → bağlantıyı kaldırır (toggle).
 */
export class LinkCommand extends BaseCommand {
  constructor() {
    super({
      name: 'insertLink',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
      title: 'Bağlantı Ekle (Ctrl+K)',
      shortcut: 'ctrl+k',
      tag: 'A',
    });
  }

  /**
   * @param {import('../editorCore.js').EditorCore} editor
   */
  async execute(editor) {
    // Zaten bir link içindeyse → linki kaldır
    if (editor.isTagActive('A')) {
      editor.unwrapTag('A');
      return;
    }

    // Seçimi kaydet (prompt focus'u bozar)
    editor.saveSelection();

    // URL sor
    const url = await PromptModal.show('Bağlantı URL\'si girin:', 'https://', 'Bağlantı Ekle');

    // İptal edildiyse hiçbir şey yapma
    if (!url || url === 'https://') return;

    // Seçimi geri yükle ve linki ekle
    editor.restoreSelection();
    editor.wrapWithLink(url);
  }
}
