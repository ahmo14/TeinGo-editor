import { BaseCommand } from './baseCommand.js';
import { FormulaModal } from '../formulaModal.js';

/**
 * FormulaCommand - Editöre KaTeX ile render edilmiş matematik formülü ekler.
 *
 * Akış:
 * 1. Butona tıkla → seçimi kaydet → modal aç
 * 2. Kullanıcı LaTeX yazar, canlı önizleme görür
 * 3. "Ekle" tıklar → KaTeX render → contenteditable="false" span oluştur
 * 4. Range/Selection API ile imleç noktasına yerleştir
 *
 * Formül elementinin özellikleri:
 * - contenteditable="false" → kullanıcı formülün iç HTML'sini bozamaz
 * - data-latex attribute → orijinal LaTeX kodu saklanır (düzenleme için)
 * - Tek blok olarak silinir (Backspace/Delete ile)
 */
export class FormulaCommand extends BaseCommand {
  constructor() {
    super({
      name: 'insertFormula',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 7V4H6l6 8-6 8h12v-3"/></svg>',
      title: 'Denklem Ekle',
      shortcut: null,
      tag: null, // Formül aktif durum takibi gerektirmez
    });

    /** @type {FormulaModal} */
    this._modal = new FormulaModal();
  }

  /**
   * @param {import('../editorCore.js').EditorCore} editor
   */
  async execute(editor) {
    // Seçimi kaydet — modal açılınca focus tamamen kaybolacak
    editor.saveSelection();

    // Modal aç ve kullanıcı etkileşimini bekle
    const latex = await this._modal.open();

    // Kullanıcı iptal ettiyse hiçbir şey yapma
    if (!latex) return;

    // KaTeX ile HTML'e render et
    // eslint-disable-next-line no-undef -- KaTeX global CDN'den yüklü
    const renderedHtml = katex.renderToString(latex, {
      throwOnError: false,
      displayMode: false, // Inline render (metin içinde akış)
    });

    // Formül wrapper span oluştur
    const formulaSpan = document.createElement('span');
    formulaSpan.contentEditable = 'false';
    formulaSpan.className = 'formula-inline';
    formulaSpan.dataset.latex = latex; // Orijinal LaTeX'i sakla
    formulaSpan.title = latex; // Hover'da LaTeX göster
    formulaSpan.innerHTML = renderedHtml;

    // İmleç noktasına yerleştir
    editor.insertNodeAtCursor(formulaSpan);
  }
}
