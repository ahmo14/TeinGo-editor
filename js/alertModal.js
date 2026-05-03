import { t } from './i18n.js';

/**
 * AlertModal - Standart tarayıcı alert() fonksiyonu yerine kullanılacak özel modal
 */
export class AlertModal {
  static _backdrop = null;
  static _built = false;
  static _titleEl = null;
  static _msgEl = null;
  static _resolve = null;

  /**
   * Modalı gösterir
   * @param {string} message Gösterilecek mesaj
   * @param {string} title Modal başlığı
   * @returns {Promise<void>} Modal kapandığında çözümlenir
   */
  static show(message, title) {
    return new Promise((resolve) => {
      if (!title) title = t('modal.info');
      this._resolve = resolve;
      
      if (!this._built) {
        this._build();
        this._built = true;
      }
      
      this._titleEl.textContent = title;
      this._msgEl.textContent = message;
      
      this._backdrop.classList.remove('hidden');
      requestAnimationFrame(() => {
        this._backdrop.classList.add('modal-visible');
      });
    });
  }

  static _close() {
    if (!this._backdrop) return;
    this._backdrop.classList.remove('modal-visible');
    setTimeout(() => {
      this._backdrop.classList.add('hidden');
    }, 200);
    
    if (this._resolve) {
      this._resolve();
      this._resolve = null;
    }
  }

  static _build() {
    const backdrop = document.createElement('div');
    backdrop.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm hidden opacity-0 transition-opacity duration-200';
    backdrop.addEventListener('mousedown', (e) => {
      if (e.target === backdrop) this._close();
    });

    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-sm mx-4 transform scale-95 transition-transform duration-200 flex flex-col';

    const header = document.createElement('div');
    header.className = 'flex items-center justify-between px-5 py-3 border-b border-gray-200';
    
    const titleEl = document.createElement('h3');
    titleEl.className = 'text-base font-semibold text-gray-800';
    header.appendChild(titleEl);
    
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.innerHTML = '✕';
    closeBtn.className = 'text-gray-400 hover:text-gray-700 text-lg cursor-pointer transition-colors p-1';
    closeBtn.addEventListener('click', () => this._close());
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'p-5';

    const msgEl = document.createElement('p');
    msgEl.className = 'text-sm text-gray-600 whitespace-pre-wrap';
    body.appendChild(msgEl);

    const footer = document.createElement('div');
    footer.className = 'flex justify-end gap-2 px-5 py-3 border-t border-gray-200';
    
    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.textContent = t('modal.ok');
    okBtn.className = 'px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer';
    okBtn.addEventListener('click', () => this._close());

    // Enter veya Escape tuşuna basınca kapansın diye global dinleyici
    document.addEventListener('keydown', (e) => {
      if (!backdrop.classList.contains('hidden') && (e.key === 'Enter' || e.key === 'Escape')) {
        e.preventDefault();
        this._close();
      }
    });

    footer.appendChild(okBtn);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);
    backdrop.appendChild(card);
    document.body.appendChild(backdrop);

    this._backdrop = backdrop;
    this._titleEl = titleEl;
    this._msgEl = msgEl;
  }
}
