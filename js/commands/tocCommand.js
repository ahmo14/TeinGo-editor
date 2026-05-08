import { BaseCommand } from './baseCommand.js';

const tx = (source) => window.EditorUiLocalization?.translate(source) || source;

export class TocCommand extends BaseCommand {
  constructor() {
    super({
      name: 'insertToc',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
      title: tx('İçindekiler Tablosu'),
      shortcut: null,
      tag: null,
    });
  }

  execute(editor) {
    // Neden querySelectorAll: İçindekiler tablosunu oluşturmak için tüm başlıkları alıyoruz.
    const headings = editor.editorElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length === 0) {
      alert(tx('Belgede başlık bulunamadı. İçindekiler tablosu oluşturmak için başlık ekleyin.'));
      return;
    }

    try {
      const tocContainer = document.createElement('div');
      tocContainer.className = 'editor-toc';
      tocContainer.contentEditable = 'false';
      tocContainer.style.backgroundColor = '#f8fafc';
      tocContainer.style.padding = '16px';
      tocContainer.style.border = '1px solid #e2e8f0';
      tocContainer.style.borderRadius = '8px';
      tocContainer.style.marginBottom = '1em';

      const title = document.createElement('strong');
      title.style.display = 'block';
      title.style.marginBottom = '8px';
      title.textContent = tx('İçindekiler');
      tocContainer.appendChild(title);

      const ul = document.createElement('ul');
      ul.style.listStyleType = 'none';
      ul.style.paddingLeft = '0';

      headings.forEach((h, index) => {
        if (!h.id) {
          h.id = 'heading-' + Date.now() + '-' + index;
        }
        
        const li = document.createElement('li');
        const level = parseInt(h.tagName.substring(1)) - 1;
        li.style.marginLeft = (level * 16) + 'px';
        li.style.marginBottom = '4px';

        const a = document.createElement('a');
        a.href = '#' + h.id;
        a.textContent = h.textContent;
        a.style.color = '#2563eb';
        a.style.textDecoration = 'none';
        
        li.appendChild(a);
        ul.appendChild(li);
      });

      tocContainer.appendChild(ul);
      editor.insertNodeAtCursor(tocContainer);
      
      // Boşluk bırakarak yeni satıra geçmeyi kolaylaştırıyoruz
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      editor.insertNodeAtCursor(p);
    } catch (e) {
      console.error('İçindekiler tablosu oluşturulurken hata:', e);
    }
  }
}
