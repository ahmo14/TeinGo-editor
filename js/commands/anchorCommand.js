import { BaseCommand } from './baseCommand.js';
import { AnchorModal } from '../anchorModal.js';

/**
 * AnchorCommand - Metne bir çapa (<a id="xxx"></a>) ekler.
 */
export class AnchorCommand extends BaseCommand {
  constructor() {
    super({
      name: 'insertAnchor',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M5 12H2a10 10 0 0 0 20 0h-3"/></svg>',
      title: 'Çapa Ekle',
    });

    this._modal = new AnchorModal();
  }

  /**
   * @param {import('../editorCore.js').EditorCore} editor
   */
  async execute(editor) {
    editor.saveSelection();
    
    const id = await this._modal.open();
    
    if (!id) {
      editor.restoreSelection();
      return;
    }

    editor.restoreSelection();
    
    const anchorNode = document.createElement('a');
    anchorNode.id = id;
    anchorNode.className = 'editor-anchor';
    // Editör modunda görünür olması için boş bırakılmaz, CSS ile bir ikon gösterilir
    
    editor.insertNodeAtCursor(anchorNode);
  }
}
