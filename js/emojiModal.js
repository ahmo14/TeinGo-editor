/**
 * EmojiModal - Emoji seçim modalı
 */
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
    header.innerHTML = '<h3 class="text-base font-semibold text-gray-800">Emojiler (Emojis)</h3>';
    
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
      { id: 'all', name: 'Tümü' },
      { id: 'smileys', name: 'Yüzler' },
      { id: 'gestures', name: 'El Hareketleri' },
      { id: 'animals', name: 'Hayvanlar' },
      { id: 'food', name: 'Yiyecek & İçecek' },
      { id: 'travel', name: 'Seyahat & Yerler' },
      { id: 'objects', name: 'Nesneler' },
      { id: 'symbols', name: 'Semboller' }
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
    cancelBtn.textContent = 'Kapat';
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
      { char: '😀', name: 'Grinning Face', category: 'smileys' },
      { char: '😂', name: 'Face with Tears of Joy', category: 'smileys' },
      { char: '😊', name: 'Smiling Face with Smiling Eyes', category: 'smileys' },
      { char: '😍', name: 'Smiling Face with Heart-Eyes', category: 'smileys' },
      { char: '🥰', name: 'Smiling Face with Hearts', category: 'smileys' },
      { char: '😎', name: 'Smiling Face with Sunglasses', category: 'smileys' },
      { char: '🤔', name: 'Thinking Face', category: 'smileys' },
      { char: '😢', name: 'Crying Face', category: 'smileys' },
      { char: '😭', name: 'Loudly Crying Face', category: 'smileys' },
      { char: '😡', name: 'Pouting Face', category: 'smileys' },
      
      // Gestures
      { char: '👍', name: 'Thumbs Up', category: 'gestures' },
      { char: '👎', name: 'Thumbs Down', category: 'gestures' },
      { char: '👌', name: 'OK Hand', category: 'gestures' },
      { char: '✌️', name: 'Victory Hand', category: 'gestures' },
      { char: '🤞', name: 'Crossed Fingers', category: 'gestures' },
      { char: '🙏', name: 'Folded Hands', category: 'gestures' },
      { char: '👏', name: 'Clapping Hands', category: 'gestures' },
      { char: '🙌', name: 'Raising Hands', category: 'gestures' },
      
      // Animals
      { char: '🐶', name: 'Dog Face', category: 'animals' },
      { char: '🐱', name: 'Cat Face', category: 'animals' },
      { char: '🐭', name: 'Mouse Face', category: 'animals' },
      { char: '🐰', name: 'Rabbit Face', category: 'animals' },
      { char: '🦊', name: 'Fox', category: 'animals' },
      { char: '🐻', name: 'Bear', category: 'animals' },
      { char: '🐼', name: 'Panda', category: 'animals' },
      { char: '🦁', name: 'Lion', category: 'animals' },
      
      // Food
      { char: '🍎', name: 'Red Apple', category: 'food' },
      { char: '🍌', name: 'Banana', category: 'food' },
      { char: '🍉', name: 'Watermelon', category: 'food' },
      { char: '🍇', name: 'Grapes', category: 'food' },
      { char: '🍕', name: 'Pizza', category: 'food' },
      { char: '🍔', name: 'Hamburger', category: 'food' },
      { char: '🍟', name: 'French Fries', category: 'food' },
      { char: '☕', name: 'Hot Beverage', category: 'food' },
      
      // Travel
      { char: '🚗', name: 'Automobile', category: 'travel' },
      { char: '🚕', name: 'Taxi', category: 'travel' },
      { char: '🚌', name: 'Bus', category: 'travel' },
      { char: '✈️', name: 'Airplane', category: 'travel' },
      { char: '🚀', name: 'Rocket', category: 'travel' },
      { char: '🌍', name: 'Globe Showing Europe-Africa', category: 'travel' },
      { char: '🏝️', name: 'Desert Island', category: 'travel' },
      { char: '⛰️', name: 'Mountain', category: 'travel' },
      
      // Objects
      { char: '📱', name: 'Mobile Phone', category: 'objects' },
      { char: '💻', name: 'Laptop', category: 'objects' },
      { char: '⌚', name: 'Watch', category: 'objects' },
      { char: '📷', name: 'Camera', category: 'objects' },
      { char: '📚', name: 'Books', category: 'objects' },
      { char: '✏️', name: 'Pencil', category: 'objects' },
      { char: '🎁', name: 'Wrapped Gift', category: 'objects' },
      { char: '💡', name: 'Light Bulb', category: 'objects' },
      
      // Symbols
      { char: '❤️', name: 'Red Heart', category: 'symbols' },
      { char: '💔', name: 'Broken Heart', category: 'symbols' },
      { char: '💯', name: 'Hundred Points', category: 'symbols' },
      { char: '🔥', name: 'Fire', category: 'symbols' },
      { char: '✨', name: 'Sparkles', category: 'symbols' },
      { char: '⭐', name: 'Star', category: 'symbols' },
      { char: '✅', name: 'Check Mark Button', category: 'symbols' },
      { char: '❌', name: 'Cross Mark', category: 'symbols' }
    ];
  }
}
