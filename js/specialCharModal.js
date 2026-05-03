/**
 * SpecialCharModal - Özel Karakter seçim modalı
 */
export class SpecialCharModal {
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
    card.className = 'bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md mx-4 transform scale-95 transition-transform duration-200 flex flex-col max-h-[80vh]';

    const header = document.createElement('div');
    header.className = 'flex items-center justify-between px-5 py-3 border-b border-gray-200';
    header.innerHTML = '<h3 class="text-base font-semibold text-gray-800">Özel Karakter (Special Character)</h3>';
    
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.innerHTML = '✕';
    closeBtn.className = 'text-gray-400 hover:text-gray-700 text-lg cursor-pointer transition-colors p-1';
    closeBtn.addEventListener('click', () => this._close(null));
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'p-4 flex gap-4 overflow-hidden';

    // Kategoriler yan menüsü
    const sidebar = document.createElement('div');
    sidebar.className = 'w-1/3 border-r border-gray-200 pr-2 overflow-y-auto';
    
    const categories = [
      { id: 'all', name: 'Tümü (All)' },
      { id: 'currency', name: 'Para Birimi (Currency)' },
      { id: 'text', name: 'Metin (Text)' },
      { id: 'math', name: 'Matematik (Mathematical)' },
      { id: 'symbols', name: 'Semboller (Symbols)' },
      { id: 'arrows', name: 'Oklar (Arrows)' }
    ];

    let activeCategoryBtn = null;

    // Karakterler alanı
    const contentArea = document.createElement('div');
    contentArea.className = 'w-2/3 flex flex-col gap-3';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Ara... (Search)';
    searchInput.className = 'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400';
    
    const charsContainer = document.createElement('div');
    charsContainer.className = 'flex flex-wrap gap-2 overflow-y-auto max-h-[300px] content-start';

    const renderChars = (filterStr = '', categoryId = 'all') => {
      charsContainer.innerHTML = '';
      const chars = this._getCharacters();
      let filtered = chars;
      
      if (categoryId !== 'all') {
        filtered = filtered.filter(c => c.category === categoryId);
      }
      if (filterStr) {
        filtered = filtered.filter(c => c.char.includes(filterStr) || c.name.toLowerCase().includes(filterStr.toLowerCase()));
      }

      filtered.forEach(item => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'w-10 h-10 flex items-center justify-center text-lg rounded border border-gray-200 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors text-slate-800';
        btn.textContent = item.char;
        btn.title = item.name;
        btn.addEventListener('click', () => this._close(item.char));
        charsContainer.appendChild(btn);
      });
    };

    searchInput.addEventListener('input', (e) => {
      renderChars(e.target.value, activeCategoryBtn ? activeCategoryBtn.dataset.categoryId : 'all');
    });

    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.categoryId = cat.id;
      btn.className = 'w-full text-left px-3 py-1.5 text-sm rounded text-gray-600 hover:bg-gray-100 transition-colors mb-1 cursor-pointer';
      btn.textContent = cat.name;
      if (cat.id === 'all') {
        btn.classList.add('font-semibold', 'text-blue-600', 'bg-blue-50');
        activeCategoryBtn = btn;
      }
      
      btn.addEventListener('click', () => {
        if (activeCategoryBtn) {
          activeCategoryBtn.classList.remove('font-semibold', 'text-blue-600', 'bg-blue-50');
        }
        btn.classList.add('font-semibold', 'text-blue-600', 'bg-blue-50');
        activeCategoryBtn = btn;
        renderChars(searchInput.value, cat.id);
      });
      sidebar.appendChild(btn);
    });

    contentArea.appendChild(searchInput);
    contentArea.appendChild(charsContainer);
    
    body.appendChild(sidebar);
    body.appendChild(contentArea);

    const footer = document.createElement('div');
    footer.className = 'flex justify-end px-5 py-3 border-t border-gray-200';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Kapat (Close)';
    cancelBtn.className = 'px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer';
    cancelBtn.addEventListener('click', () => this._close(null));
    footer.appendChild(cancelBtn);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);
    backdrop.appendChild(card);
    document.body.appendChild(backdrop);

    this._backdrop = backdrop;
    
    // İlk render
    renderChars();
  }

  _getCharacters() {
    return [
      // Currency
      { char: '$', name: 'Dollar', category: 'currency' },
      { char: '¢', name: 'Cent', category: 'currency' },
      { char: '€', name: 'Euro', category: 'currency' },
      { char: '£', name: 'Pound', category: 'currency' },
      { char: '¥', name: 'Yen', category: 'currency' },
      { char: '₺', name: 'Turkish Lira', category: 'currency' },
      { char: '₽', name: 'Ruble', category: 'currency' },
      { char: '₹', name: 'Rupee', category: 'currency' },
      { char: '₩', name: 'Won', category: 'currency' },
      { char: '฿', name: 'Baht', category: 'currency' },
      
      // Text
      { char: '©', name: 'Copyright', category: 'text' },
      { char: '®', name: 'Registered', category: 'text' },
      { char: '™', name: 'Trademark', category: 'text' },
      { char: '§', name: 'Section', category: 'text' },
      { char: '¶', name: 'Paragraph', category: 'text' },
      { char: '†', name: 'Dagger', category: 'text' },
      { char: '‡', name: 'Double Dagger', category: 'text' },
      
      // Mathematical
      { char: '±', name: 'Plus-Minus', category: 'math' },
      { char: '×', name: 'Multiply', category: 'math' },
      { char: '÷', name: 'Divide', category: 'math' },
      { char: '∞', name: 'Infinity', category: 'math' },
      { char: '≈', name: 'Almost Equal', category: 'math' },
      { char: '≠', name: 'Not Equal', category: 'math' },
      { char: '≤', name: 'Less or Equal', category: 'math' },
      { char: '≥', name: 'Greater or Equal', category: 'math' },
      { char: '∑', name: 'Sum', category: 'math' },
      { char: '∏', name: 'Product', category: 'math' },
      { char: '√', name: 'Square Root', category: 'math' },
      { char: '∫', name: 'Integral', category: 'math' },
      
      // Symbols
      { char: '°', name: 'Degree', category: 'symbols' },
      { char: '‰', name: 'Per Mille', category: 'symbols' },
      { char: 'µ', name: 'Micro', category: 'symbols' },
      { char: 'π', name: 'Pi', category: 'symbols' },
      { char: 'Ω', name: 'Omega', category: 'symbols' },
      { char: '∆', name: 'Delta', category: 'symbols' },
      
      // Arrows
      { char: '←', name: 'Left Arrow', category: 'arrows' },
      { char: '↑', name: 'Up Arrow', category: 'arrows' },
      { char: '→', name: 'Right Arrow', category: 'arrows' },
      { char: '↓', name: 'Down Arrow', category: 'arrows' },
      { char: '↔', name: 'Left Right Arrow', category: 'arrows' },
      { char: '↕', name: 'Up Down Arrow', category: 'arrows' },
      { char: '⇐', name: 'Left Double Arrow', category: 'arrows' },
      { char: '⇑', name: 'Up Double Arrow', category: 'arrows' },
      { char: '⇒', name: 'Right Double Arrow', category: 'arrows' },
      { char: '⇓', name: 'Down Double Arrow', category: 'arrows' },
      { char: '⇔', name: 'Left Right Double Arrow', category: 'arrows' }
    ];
  }
}
