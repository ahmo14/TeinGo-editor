export class MenuBar {
  /**
   * @param {HTMLElement} menuBarElement
   * @param {import('./editorCore.js').EditorCore} editor
   */
  constructor(menuBarElement, editor) {
    this.menuBarElement = menuBarElement;
    this.editor = editor;
    this.menus = [];
    this.activeMenu = null;

    // Dışarı tıklanınca menüyü kapat
    document.addEventListener('mousedown', (e) => {
      if (this.activeMenu && !this.activeMenu.wrapper.contains(e.target)) {
        this.closeAll();
      }
    });
  }

  /**
   * @param {string} title - Menü başlığı (Örn: "Dosya")
   * @param {Array<Object|string>} options - Menü seçenekleri ('separator' veya obje)
   */
  addMenu(title, options) {
    const wrapper = document.createElement('div');
    wrapper.className = 'relative inline-block';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = title;
    btn.className = [
      'px-3 py-1.5 text-sm font-medium text-slate-600 rounded-md',
      'hover:text-blue-600 hover:bg-slate-100 transition-colors',
      'cursor-pointer focus:outline-none select-none',
    ].join(' ');

    const dropdown = document.createElement('div');
    dropdown.className = [
      'absolute left-0 top-full mt-1 z-50',
      'bg-white border border-slate-200/80 rounded-lg shadow-xl',
      'py-1.5 min-w-[200px] max-h-[75vh] overflow-y-auto',
      'opacity-0 invisible translate-y-[-4px]',
      'transition-all duration-150',
    ].join(' ');

    options.forEach(opt => {
      if (opt === 'separator') {
        const sep = document.createElement('div');
        sep.className = 'h-px bg-slate-200/60 my-1.5';
        dropdown.appendChild(sep);
        return;
      }

      const item = document.createElement('button');
      item.type = 'button';
      item.className = [
        'w-full px-4 py-1.5 text-left text-[13px] text-slate-700',
        'hover:bg-blue-50 hover:text-blue-600 flex items-center justify-between',
        'cursor-pointer transition-colors',
      ].join(' ');

      const leftPart = document.createElement('div');
      leftPart.className = 'flex items-center gap-2.5';
      if (opt.icon) {
        leftPart.innerHTML = `<span class="w-4 h-4 flex items-center justify-center text-slate-400">${opt.icon}</span> <span>${opt.label}</span>`;
      } else {
        leftPart.innerHTML = `<span>${opt.label}</span>`;
      }
      
      item.appendChild(leftPart);

      if (opt.shortcut) {
        const rightPart = document.createElement('span');
        rightPart.className = 'text-[11px] text-slate-400 tracking-wider';
        rightPart.textContent = opt.shortcut;
        item.appendChild(rightPart);
      }

      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closeAll();
        
        if (opt.action) {
           opt.action(this.editor);
        } else if (opt.commandName) {
           this.editor.executeCommand(opt.commandName);
        }
      });
      
      dropdown.appendChild(item);
    });

    const menuObj = { wrapper, btn, dropdown };

    // Tıklayınca aç/kapat
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.activeMenu === menuObj) {
        this.closeAll();
      } else {
        this.openMenu(menuObj);
      }
    });

    // Menü açıkken fareyle diğer menülerin üzerine gelince otomatik geçiş yap
    btn.addEventListener('mouseenter', () => {
      if (this.activeMenu && this.activeMenu !== menuObj) {
        this.openMenu(menuObj);
      }
    });

    wrapper.appendChild(btn);
    wrapper.appendChild(dropdown);
    this.menuBarElement.appendChild(wrapper);

    this.menus.push(menuObj);
  }

  openMenu(menuObj) {
    this.closeAll();
    menuObj.btn.classList.add('bg-slate-100', 'text-blue-600');
    menuObj.dropdown.classList.remove('opacity-0', 'invisible', 'translate-y-[-4px]');
    menuObj.dropdown.classList.add('opacity-100', 'visible', 'translate-y-0');
    this.activeMenu = menuObj;
  }

  closeAll() {
    this.menus.forEach(m => {
      m.btn.classList.remove('bg-slate-100', 'text-blue-600');
      m.dropdown.classList.remove('opacity-100', 'visible', 'translate-y-0');
      m.dropdown.classList.add('opacity-0', 'invisible', 'translate-y-[-4px]');
    });
    this.activeMenu = null;
  }
}
