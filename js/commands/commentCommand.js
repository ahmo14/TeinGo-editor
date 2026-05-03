import { BaseCommand } from './baseCommand.js';
import { PromptModal } from '../promptModal.js';

export class CommentCommand extends BaseCommand {
  constructor() {
    super({
      name: 'insertComment',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>',
      title: 'Yorum Ekle',
      shortcut: 'Ctrl+Alt+M',
      tag: 'SPAN',
    });
  }

  async execute(editor) {
    const selection = editor.getSelection();
    if (!selection || selection.isCollapsed) {
      // Neden uyarı: Yorum eklemek için bir metin parçası seçili olmalıdır.
      alert('Lütfen yorum eklemek için bir metin seçin.');
      return;
    }
    
    editor.saveSelection();
    const comment = await PromptModal.show('Yorumunuzu girin:', '', 'Yorum Ekle');
    if (!comment) {
      editor.restoreSelection();
      return;
    }

    editor.restoreSelection();
    
    try {
      const range = editor.getSelection().getRangeAt(0);
      const span = document.createElement('span');
      span.className = 'editor-comment';
      span.title = comment;
      span.setAttribute('data-comment', comment);
      span.style.backgroundColor = '#fef08a';
      span.style.borderBottom = '2px dashed #eab308';
      span.style.cursor = 'help';
      
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
      
      // İmleci yorumun sonuna taşıyoruz
      editor.setCursorAfter(span);
    } catch (e) {
      console.error('Yorum eklenirken hata oluştu:', e);
    }
  }
}
