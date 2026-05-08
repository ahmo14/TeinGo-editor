/**
 * EmojiModal - Emoji seçim modalı
 */
const tx = (source) => window.EditorUiLocalization?.translate(source) || source;

export class EmojiModal {
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
    header.innerHTML = `<h3 class="text-base font-semibold text-gray-800">${tx('Emojiler')}</h3>`;
    
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
      { id: 'smileys', name: tx('Yüzler') },
      { id: 'gestures', name: tx('El Hareketleri') },
      { id: 'animals', name: tx('Hayvanlar') },
      { id: 'food', name: tx('Yiyecek & İçecek') },
      { id: 'travel', name: tx('Seyahat & Yerler') },
      { id: 'objects', name: tx('Nesneler') },
      { id: 'symbols', name: tx('Semboller') }
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
      const chars = this._getEmojis();
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
        btn.className = 'w-10 h-10 flex items-center justify-center text-2xl rounded border border-transparent hover:bg-gray-100 hover:scale-110 cursor-pointer transition-all';
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
    
    renderChars();
  }

  _getEmojis() {
    return [
      // Smileys
      { char: '😀', name: 'Sırıtan yüz', category: 'smileys' },
      { char: '😂', name: 'Sevinç gözyaşlı yüz', category: 'smileys' },
      { char: '😊', name: 'Gülen gözlü yüz', category: 'smileys' },
      { char: '😍', name: 'Kalpli gözlü yüz', category: 'smileys' },
      { char: '🥰', name: 'Kalpli gülen yüz', category: 'smileys' },
      { char: '😎', name: 'Güneş gözlüklü yüz', category: 'smileys' },
      { char: '🤔', name: 'Düşünen yüz', category: 'smileys' },
      { char: '😢', name: 'Ağlayan yüz', category: 'smileys' },
      { char: '😭', name: 'Hıçkırarak ağlayan yüz', category: 'smileys' },
      { char: '😡', name: 'Somurtan yüz', category: 'smileys' },
      
      // Gestures
      { char: '👍', name: 'Beğen', category: 'gestures' },
      { char: '👎', name: 'Beğenme', category: 'gestures' },
      { char: '👌', name: 'Tamam işareti', category: 'gestures' },
      { char: '✌️', name: 'Zafer işareti', category: 'gestures' },
      { char: '🤞', name: 'Çapraz parmaklar', category: 'gestures' },
      { char: '🙏', name: 'Birleşik eller', category: 'gestures' },
      { char: '👏', name: 'Alkışlayan eller', category: 'gestures' },
      { char: '🙌', name: 'Havaya kalkan eller', category: 'gestures' },
      
      // Animals
      { char: '🐶', name: 'Köpek yüzü', category: 'animals' },
      { char: '🐱', name: 'Kedi yüzü', category: 'animals' },
      { char: '🐭', name: 'Fare yüzü', category: 'animals' },
      { char: '🐰', name: 'Tavşan yüzü', category: 'animals' },
      { char: '🦊', name: 'Tilki', category: 'animals' },
      { char: '🐻', name: 'Ayı', category: 'animals' },
      { char: '🐼', name: 'Panda', category: 'animals' },
      { char: '🦁', name: 'Aslan', category: 'animals' },
      
      // Food
      { char: '🍎', name: 'Kırmızı elma', category: 'food' },
      { char: '🍌', name: 'Muz', category: 'food' },
      { char: '🍉', name: 'Karpuz', category: 'food' },
      { char: '🍇', name: 'Üzüm', category: 'food' },
      { char: '🍕', name: 'Pizza', category: 'food' },
      { char: '🍔', name: 'Hamburger', category: 'food' },
      { char: '🍟', name: 'Patates kızartması', category: 'food' },
      { char: '☕', name: 'Sıcak içecek', category: 'food' },
      
      // Travel
      { char: '🚗', name: 'Otomobil', category: 'travel' },
      { char: '🚕', name: 'Taksi', category: 'travel' },
      { char: '🚌', name: 'Otobüs', category: 'travel' },
      { char: '✈️', name: 'Uçak', category: 'travel' },
      { char: '🚀', name: 'Roket', category: 'travel' },
      { char: '🌍', name: 'Avrupa-Afrika küresi', category: 'travel' },
      { char: '🏝️', name: 'Issız ada', category: 'travel' },
      { char: '⛰️', name: 'Dağ', category: 'travel' },
      
      // Objects
      { char: '📱', name: 'Cep telefonu', category: 'objects' },
      { char: '💻', name: 'Dizüstü bilgisayar', category: 'objects' },
      { char: '⌚', name: 'Saat', category: 'objects' },
      { char: '📷', name: 'Kamera', category: 'objects' },
      { char: '📚', name: 'Kitaplar', category: 'objects' },
      { char: '✏️', name: 'Kurşun kalem', category: 'objects' },
      { char: '🎁', name: 'Hediye paketi', category: 'objects' },
      { char: '💡', name: 'Ampul', category: 'objects' },
      
      // Symbols
      { char: '❤️', name: 'Kırmızı kalp', category: 'symbols' },
      { char: '💔', name: 'Kırık kalp', category: 'symbols' },
      { char: '💯', name: 'Yüz puan', category: 'symbols' },
      { char: '🔥', name: 'Ateş', category: 'symbols' },
      { char: '✨', name: 'Parıltılar', category: 'symbols' },
      { char: '⭐', name: 'Yıldız', category: 'symbols' },
      { char: '✅', name: 'Onay işareti', category: 'symbols' },
      { char: '❌', name: 'Çarpı işareti', category: 'symbols' }
    ];
  }
}
