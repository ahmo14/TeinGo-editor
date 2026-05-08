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
    const tx = (source) => window.EditorUiLocalization?.translate(source) || source;
    const backdrop = document.createElement('div');
    backdrop.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm hidden opacity-0 transition-opacity duration-200';
    backdrop.addEventListener('mousedown', (e) => {
      if (e.target === backdrop) this._close(null);
    });

    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md mx-4 transform scale-95 transition-transform duration-200 flex flex-col max-h-[80vh]';

    const header = document.createElement('div');
    header.className = 'flex items-center justify-between px-5 py-3 border-b border-gray-200';
    header.innerHTML = `<h3 class="text-base font-semibold text-gray-800">${tx('Özel Karakter')}</h3>`;
    
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
      { id: 'all', name: tx('Tümü') },
      { id: 'currency', name: tx('Para Birimi') },
      { id: 'text', name: tx('Metin') },
      { id: 'math', name: tx('Matematik') },
      { id: 'symbols', name: tx('Semboller') },
      { id: 'arrows', name: tx('Oklar') }
    ];

    let activeCategoryBtn = null;

    // Karakterler alanı
    const contentArea = document.createElement('div');
    contentArea.className = 'w-2/3 flex flex-col gap-3';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = tx('Ara...');
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
        btn.title = tx(item.name);
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
    cancelBtn.textContent = tx('Kapat');
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
      { char: '$', name: 'Dolar', category: 'currency' },
      { char: '¢', name: 'Sent', category: 'currency' },
      { char: '€', name: 'Euro', category: 'currency' },
      { char: '£', name: 'Sterlin', category: 'currency' },
      { char: '¥', name: 'Yen', category: 'currency' },
      { char: '₺', name: 'Türk lirası', category: 'currency' },
      { char: '₽', name: 'Ruble', category: 'currency' },
      { char: '₹', name: 'Rupi', category: 'currency' },
      { char: '₩', name: 'Won', category: 'currency' },
      { char: '฿', name: 'Baht', category: 'currency' },
      
      // Text
      { char: '©', name: 'Telif hakkı', category: 'text' },
      { char: '®', name: 'Tescilli marka', category: 'text' },
      { char: '™', name: 'Ticari marka', category: 'text' },
      { char: '§', name: 'Bölüm işareti', category: 'text' },
      { char: '¶', name: 'Paragraf işareti', category: 'text' },
      { char: '†', name: 'Hançer işareti', category: 'text' },
      { char: '‡', name: 'Çift hançer işareti', category: 'text' },
      
      // Mathematical
      { char: '±', name: 'Artı eksi', category: 'math' },
      { char: '×', name: 'Çarpma', category: 'math' },
      { char: '÷', name: 'Bölme', category: 'math' },
      { char: '∞', name: 'Sonsuzluk', category: 'math' },
      { char: '≈', name: 'Yaklaşık eşit', category: 'math' },
      { char: '≠', name: 'Eşit değil', category: 'math' },
      { char: '≤', name: 'Küçük veya eşit', category: 'math' },
      { char: '≥', name: 'Büyük veya eşit', category: 'math' },
      { char: '∑', name: 'Toplam', category: 'math' },
      { char: '∏', name: 'Çarpım', category: 'math' },
      { char: '√', name: 'Karekök', category: 'math' },
      { char: '∫', name: 'İntegral', category: 'math' },
      
      // Symbols
      { char: '°', name: 'Derece', category: 'symbols' },
      { char: '‰', name: 'Binde', category: 'symbols' },
      { char: 'µ', name: 'Mikro', category: 'symbols' },
      { char: 'π', name: 'Pi', category: 'symbols' },
      { char: 'Ω', name: 'Omega', category: 'symbols' },
      { char: '∆', name: 'Delta', category: 'symbols' },
      
      // Arrows
      { char: '←', name: 'Sol ok', category: 'arrows' },
      { char: '↑', name: 'Yukarı ok', category: 'arrows' },
      { char: '→', name: 'Sağ ok', category: 'arrows' },
      { char: '↓', name: 'Aşağı ok', category: 'arrows' },
      { char: '↔', name: 'Sol sağ ok', category: 'arrows' },
      { char: '↕', name: 'Yukarı aşağı ok', category: 'arrows' },
      { char: '⇐', name: 'Sol çift ok', category: 'arrows' },
      { char: '⇑', name: 'Yukarı çift ok', category: 'arrows' },
      { char: '⇒', name: 'Sağ çift ok', category: 'arrows' },
      { char: '⇓', name: 'Aşağı çift ok', category: 'arrows' },
      { char: '⇔', name: 'Sol sağ çift ok', category: 'arrows' }
    ];
  }
}
