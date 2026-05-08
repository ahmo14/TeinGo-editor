import { BaseCommand } from './baseCommand.js';
import { SpecialCharModal } from '../specialCharModal.js';

/**
 * SpecialCharCommand - Metne özel karakter ekler.
 */
export class SpecialCharCommand extends BaseCommand {
  constructor() {
    const tx = (source) => window.EditorUiLocalization?.translate(source) || source;
    super({
      name: 'insertSpecialChar',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
      title: tx('Özel Karakter Ekle'),
    });

    this._modal = new SpecialCharModal();
  }

  /**
   * @param {import('../editorCore.js').EditorCore} editor
   */
  async execute(editor) {
    editor.saveSelection();
    
    const char = await this._modal.open();
    
    if (!char) {
      editor.restoreSelection();
      return;
    }

    editor.restoreSelection();
    const textNode = document.createTextNode(char);
    editor.insertNodeAtCursor(textNode);
  }
}
