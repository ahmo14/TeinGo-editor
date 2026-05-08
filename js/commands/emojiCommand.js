import { BaseCommand } from './baseCommand.js';
import { EmojiModal } from '../emojiModal.js';

const tx = (source) => window.EditorUiLocalization?.translate(source) || source;

/**
 * EmojiCommand - Metne emoji ekler.
 */
export class EmojiCommand extends BaseCommand {
  constructor() {
    super({
      name: 'insertEmoji',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
      title: tx('Emoji Ekle'),
    });

    this._modal = new EmojiModal();
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
