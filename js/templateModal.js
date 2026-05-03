/**
 * TemplateModal - Hazır şablon seçimi için modal
 */
export class TemplateModal {
  constructor() {
    this._backdrop = null;
    this._resolve = null;
    this._built = false;
  }

  open() {
    return new Promise((resolve) => {
      this._resolve = resolve;
      if (!this._built) {
        this._build();
        this._built = true;
      }
      this._backdrop.classList.remove('hidden');
      requestAnimationFrame(() => {
        this._backdrop.classList.add('modal-visible');
      });
    });
  }

  _close(result) {
    this._backdrop.classList.remove('modal-visible');
    setTimeout(() => {
      this._backdrop.classList.add('hidden');
    }, 200);
    if (this._resolve) {
      this._resolve(result);
      this._resolve = null;
    }
  }

  _build() {
    const backdrop = document.createElement('div');
    backdrop.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm hidden opacity-0 transition-opacity duration-200';
    backdrop.addEventListener('mousedown', (e) => {
      if (e.target === backdrop) this._close(null);
    });

    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-2xl mx-4 transform scale-95 transition-transform duration-200 flex flex-col max-h-[85vh]';

    const header = document.createElement('div');
    header.className = 'flex items-center justify-between px-5 py-4 border-b border-gray-200';
    header.innerHTML = '<h3 class="text-base font-bold text-gray-800">Şablon Seç (Templates)</h3>';
    
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.innerHTML = '✕';
    closeBtn.className = 'text-gray-400 hover:text-gray-700 text-lg cursor-pointer transition-colors p-1';
    closeBtn.addEventListener('click', () => this._close(null));
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'p-5 overflow-y-auto grid grid-cols-2 gap-4';

    const templates = this._getTemplates();

    templates.forEach(tpl => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'flex flex-col text-left border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer group bg-white';
      
      const title = document.createElement('div');
      title.className = 'font-semibold text-gray-800 group-hover:text-blue-700 mb-1';
      title.textContent = tpl.name;
      
      const desc = document.createElement('div');
      desc.className = 'text-xs text-gray-500 mb-3';
      desc.textContent = tpl.description;
      
      const preview = document.createElement('div');
      preview.className = 'w-full h-24 bg-gray-50 border border-gray-100 rounded overflow-hidden p-2 flex flex-col gap-1 pointer-events-none opacity-70';
      preview.innerHTML = tpl.previewHtml;

      btn.appendChild(title);
      btn.appendChild(desc);
      btn.appendChild(preview);

      btn.addEventListener('click', () => this._close(tpl.html));
      body.appendChild(btn);
    });

    card.appendChild(header);
    card.appendChild(body);
    backdrop.appendChild(card);
    document.body.appendChild(backdrop);

    this._backdrop = backdrop;
  }

  _getTemplates() {
    return [
      {
        name: 'İki Sütunlu Düzen',
        description: 'Metni yan yana iki eşit sütuna böler.',
        previewHtml: '<div class="flex gap-2 h-full w-full"><div class="flex-1 bg-gray-200 rounded"></div><div class="flex-1 bg-gray-200 rounded"></div></div>',
        html: `
          <div class="editor-template-twocol" style="display: flex; gap: 1rem; margin: 1em 0;">
            <div style="flex: 1;"><p>Sol sütun içeriği...</p></div>
            <div style="flex: 1;"><p>Sağ sütun içeriği...</p></div>
          </div>
          <p><br></p>
        `
      },
      {
        name: 'Uyarı Kutusu',
        description: 'Önemli bilgileri vurgulamak için renkli bir kutu.',
        previewHtml: '<div class="w-full h-12 bg-yellow-100 border-l-4 border-yellow-400 rounded"></div>',
        html: `
          <div class="editor-template-alert" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 1rem; margin: 1em 0; border-radius: 4px;">
            <p style="margin: 0; color: #92400e;"><strong>Dikkat:</strong> Buraya önemli uyarınızı yazın...</p>
          </div>
          <p><br></p>
        `
      },
      {
        name: 'Bilgi Kartı',
        description: 'Mavi renkli genel bilgi notu.',
        previewHtml: '<div class="w-full h-12 bg-blue-50 border border-blue-200 rounded"></div>',
        html: `
          <div class="editor-template-info" style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 1rem; margin: 1em 0; border-radius: 8px;">
            <h3 style="margin-top: 0; color: #1e40af;">Bilgi</h3>
            <p style="margin-bottom: 0; color: #1e3a8a;">Ek bilgi notu buraya gelecek...</p>
          </div>
          <p><br></p>
        `
      },
      {
        name: 'Başarılı / Onay Kutusu',
        description: 'Yeşil renkli başarılı işlem mesajı.',
        previewHtml: '<div class="w-full h-12 bg-green-50 border border-green-200 rounded flex items-center px-2"><span class="text-green-600 text-xs">✓</span></div>',
        html: `
          <div class="editor-template-success" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 1rem; margin: 1em 0; border-radius: 8px;">
            <p style="margin: 0; color: #166534;">✅ İşlem başarılı bir şekilde tamamlandı.</p>
          </div>
          <p><br></p>
        `
      }
    ];
  }
}
