import { BaseCommand } from './baseCommand.js';
import { PromptModal } from '../promptModal.js';

export class MergeTagCommand extends BaseCommand {
  constructor() {
    super({
      name: 'insertMergeTag',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 12h8"/><path d="M12 8v8"/><path d="M4 12h.01"/><path d="M20 12h.01"/></svg>',
      title: 'Birleştirme Etiketi',
      shortcut: null,
      tag: 'SPAN',
    });
  }

  async execute(editor) {
    editor.saveSelection();
    const tag = await PromptModal.show('Etiket adını girin (ör. ISIM, TARIH):', '', 'Birleştirme Etiketi');
    if (!tag) {
      editor.restoreSelection();
      return;
    }

    editor.restoreSelection();
    
    try {
      const span = document.createElement('span');
      span.className = 'merge-tag';
      span.contentEditable = 'false';
      span.style.backgroundColor = '#e0f2fe';
      span.style.color = '#0284c7';
      span.style.padding = '2px 6px';
      span.style.borderRadius = '4px';
      span.style.fontFamily = 'monospace';
      span.style.margin = '0 4px';
      span.textContent = '{{' + tag.toUpperCase() + '}}';
      
      editor.insertNodeAtCursor(span);
      
      // Etiketin sonrasına boşluk ekleyerek yazmaya devam edilebilmesini sağlıyoruz
      const space = document.createTextNode('\u00A0');
      span.parentNode.insertBefore(space, span.nextSibling);
      editor.setCursorAfter(space);
    } catch (e) {
      console.error('Birleştirme etiketi ekleme hatası:', e);
    }
  }
}
