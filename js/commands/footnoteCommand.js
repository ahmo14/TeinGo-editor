import { BaseCommand } from './baseCommand.js';
import { PromptModal } from '../promptModal.js';

export class FootnoteCommand extends BaseCommand {
  constructor() {
    super({
      name: 'insertFootnote',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"/><polyline points="14 2 14 8 20 8"/><path d="M2 15h6"/><path d="M5 12v6"/></svg>',
      title: 'Dipnot Ekle',
      shortcut: null,
      tag: 'SUP',
    });
  }

  async execute(editor) {
    editor.saveSelection();
    const note = await PromptModal.show('Dipnot metnini girin:', '', 'Dipnot Ekle');
    if (!note) {
      editor.restoreSelection();
      return;
    }

    editor.restoreSelection();
    
    try {
      // Neden DOM araması: Dipnotların sıra numarasını otomatik belirlemek için.
      const existingFootnotes = editor.editorElement.querySelectorAll('.editor-footnote');
      const noteId = existingFootnotes.length + 1;
      
      const sup = document.createElement('sup');
      sup.className = 'editor-footnote';
      sup.style.cursor = 'help';
      sup.style.color = '#2563eb';
      sup.title = note;
      sup.textContent = '[' + noteId + ']';
      
      editor.insertNodeAtCursor(sup);
    } catch (e) {
      console.error('Dipnot ekleme hatası:', e);
    }
  }
}
