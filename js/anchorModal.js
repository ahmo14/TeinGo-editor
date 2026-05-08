/**
 * AnchorModal - Çapa (ID) girişi için modal
 */
const tx = (source) => window.EditorUiLocalization?.translate(source) || source;

export class AnchorModal {
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
      this._input.value = '';
      requestAnimationFrame(() => {
        this._backdrop.classList.add('modal-visible');
        this._input.focus();
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
    card.className = 'bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-sm mx-4 transform scale-95 transition-transform duration-200 flex flex-col';

    const header = document.createElement('div');
    header.className = 'flex items-center justify-between px-5 py-3 border-b border-gray-200';
    header.innerHTML = `<h3 class="text-base font-semibold text-gray-800">${tx('Çapa (Anchor) Ekle')}</h3>`;
    
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.innerHTML = '✕';
    closeBtn.className = 'text-gray-400 hover:text-gray-700 text-lg cursor-pointer transition-colors p-1';
    closeBtn.addEventListener('click', () => this._close(null));
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'p-5';

    const label = document.createElement('label');
    label.className = 'block text-sm font-medium text-gray-600 mb-2';
    label.textContent = tx('Çapa ID:');

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = tx('Örn: bolum-1');
    input.className = 'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400';
    
    body.appendChild(label);
    body.appendChild(input);

    const footer = document.createElement('div');
    footer.className = 'flex justify-end gap-2 px-5 py-3 border-t border-gray-200';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = tx('İptal');
    cancelBtn.className = 'px-4 py-1.5 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors cursor-pointer';
    cancelBtn.addEventListener('click', () => this._close(null));
    
    const insertBtn = document.createElement('button');
    insertBtn.type = 'button';
    insertBtn.textContent = tx('Ekle');
    insertBtn.className = 'px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer';
    insertBtn.addEventListener('click', () => {
      // Boşlukları ve geçersiz karakterleri temizle
      let val = input.value.trim().replace(/\s+/g, '-');
      if (val) this._close(val);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        insertBtn.click();
      } else if (e.key === 'Escape') {
        this._close(null);
      }
    });

    footer.appendChild(cancelBtn);
    footer.appendChild(insertBtn);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);
    backdrop.appendChild(card);
    document.body.appendChild(backdrop);

    this._backdrop = backdrop;
    this._input = input;
  }
}
