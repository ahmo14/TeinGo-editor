import { t } from './i18n.js';

/**
 * PromptModal - Standart tarayıcı prompt() fonksiyonu yerine kullanılacak özel modal
 */
export class PromptModal {
  static _backdrop = null;
  static _built = false;
  static _titleEl = null;
  static _msgEl = null;
  static _inputEl = null;
  static _resolve = null;

  /**
   * Modalı gösterir
   * @param {string} message Gösterilecek mesaj
   * @param {string} defaultValue Girdi alanındaki varsayılan değer
   * @param {string} title Modal başlığı
   * @returns {Promise<string|null>} Kullanıcının girdiği değer veya iptal edildiyse null
   */
  static show(message, defaultValue = '', title) {
    return new Promise((resolve) => {
      if (!title) title = t('modal.info');
      this._resolve = resolve;
      
      if (!this._built) {
        this._build();
        this._built = true;
      }
      
      this._titleEl.textContent = title;
      this._msgEl.textContent = message;
      this._inputEl.value = defaultValue;
      
      this._backdrop.classList.remove('hidden');
      requestAnimationFrame(() => {
        this._backdrop.classList.add('modal-visible');
        this._inputEl.focus();
        if (defaultValue) {
          // Yazının tamamını seçili getir (kullanıcı kolayca silebilsin diye)
          this._inputEl.select();
        }
      });
    });
  }

  static _close(result) {
    if (!this._backdrop) return;
    this._backdrop.classList.remove('modal-visible');
    setTimeout(() => {
      this._backdrop.classList.add('hidden');
    }, 200);
    
    if (this._resolve) {
      this._resolve(result);
      this._resolve = null;
    }
  }

  static _build() {
    const backdrop = document.createElement('div');
    backdrop.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm hidden opacity-0 transition-opacity duration-200';
    backdrop.addEventListener('mousedown', (e) => {
      if (e.target === backdrop) this._close(null);
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
    closeBtn.addEventListener('click', () => this._close(null));
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'p-5';

    const msgEl = document.createElement('p');
    msgEl.className = 'text-sm text-gray-600 mb-3';
    body.appendChild(msgEl);

    const inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.className = 'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400';
    body.appendChild(inputEl);

    const footer = document.createElement('div');
    footer.className = 'flex justify-end gap-2 px-5 py-3 border-t border-gray-200';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = t('modal.cancel');
    cancelBtn.className = 'px-4 py-1.5 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors cursor-pointer';
    cancelBtn.addEventListener('click', () => this._close(null));
    
    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.textContent = t('modal.ok');
    okBtn.className = 'px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer';
    okBtn.addEventListener('click', () => this._close(inputEl.value));

    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        okBtn.click();
      } else if (e.key === 'Escape') {
        this._close(null);
      }
    });

    footer.appendChild(cancelBtn);
    footer.appendChild(okBtn);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);
    backdrop.appendChild(card);
    document.body.appendChild(backdrop);

    this._backdrop = backdrop;
    this._titleEl = titleEl;
    this._msgEl = msgEl;
    this._inputEl = inputEl;
  }
}
