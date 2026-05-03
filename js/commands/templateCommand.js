import { BaseCommand } from './baseCommand.js';
import { TemplateModal } from '../templateModal.js';

/**
 * TemplateCommand - Metne önceden hazırlanmış HTML şablonları ekler.
 */
export class TemplateCommand extends BaseCommand {
  constructor() {
    super({
      name: 'insertTemplate',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>',
      title: 'Şablon Ekle',
    });

    this._modal = new TemplateModal();
  }

  /**
   * @param {import('../editorCore.js').EditorCore} editor
   */
  async execute(editor) {
    editor.saveSelection();
    
    const htmlStr = await this._modal.open();
    
    if (!htmlStr) {
      editor.restoreSelection();
      return;
    }

    editor.restoreSelection();
    
    // String html'i node'lara çevirip ekleyelim
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlStr.trim();
    
    // Fragment oluşturup nodeları taşıyalım
    const fragment = document.createDocumentFragment();
    while (tempDiv.firstChild) {
      fragment.appendChild(tempDiv.firstChild);
    }
    
    editor.insertNodeAtCursor(fragment);
  }
}
