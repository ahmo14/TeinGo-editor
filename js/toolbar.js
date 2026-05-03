/**
 * Toolbar - Editör araç çubuğunu yönetir
 * 
 * Kayıtlı komutlar için otomatik buton oluşturur.
 * Aktif durumları (bold metin üzerindeyken buton highlight) takip eder.
 * Dropdown butonları destekler (liste stil seçenekleri gibi).
 */
export class Toolbar {
  /**
   * @param {HTMLElement} toolbarElement - Araç çubuğu container'ı
   * @param {import('./editorCore.js').EditorCore} editor
   */
  constructor(toolbarElement, editor) {
    /** @type {HTMLElement} */
    this.toolbarElement = toolbarElement;

    /** @type {import('./editorCore.js').EditorCore} */
    this.editor = editor;

    /** @type {Map<string, HTMLButtonElement>} */
    this.buttons = new Map();

    /** @type {HTMLElement|null} - Şu an açık olan dropdown menü */
    this._activeDropdown = null;

    // Komut çalıştırıldığında veya seçim değiştiğinde aktif durumları güncelle
    this.editor.onCommandExecuted(() => {
      this._updateActiveStates();
    });

    // Dropdown dışına tıklandığında menüyü kapat
    document.addEventListener('mousedown', (e) => {
      if (this._activeDropdown && !this._activeDropdown.closest('.dropdown-wrapper')?.contains(e.target)) {
        this._closeDropdown();
      }
    });
  }

  // ──────────────────────────────────────────────
  // Stil sabitleri (tekrarı önlemek için)
  // ──────────────────────────────────────────────

  /** @private */
  static get BUTTON_BASE_CLASS() {
    return [
      'relative inline-flex items-center justify-center',
      'w-8 h-8 rounded-lg',
      'text-slate-500 hover:text-blue-600',
      'hover:bg-blue-50/80 hover:shadow-sm',
      'transition-all duration-200 ease-out',
      'cursor-pointer select-none',
      'focus:outline-none focus:ring-2 focus:ring-blue-500/30',
    ].join(' ');
  }

  /** @private */
  static get ACTIVE_CLASSES() {
    return ['bg-blue-50', 'text-blue-600', 'shadow-inner'];
  }

  /** @private */
  static get INACTIVE_CLASSES() {
    return ['text-slate-500'];
  }

  // ──────────────────────────────────────────────
  // Basit Buton
  // ──────────────────────────────────────────────

  /**
   * Bir komut için araç çubuğuna basit buton ekler
   * @param {import('./commands/baseCommand.js').BaseCommand} command
   */
  addButton(command) {
    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = command.icon;
    button.title = command.title;
    button.dataset.command = command.name;
    button.className = Toolbar.BUTTON_BASE_CLASS;

    // mousedown + preventDefault → seçim koruması
    button.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.editor.executeCommand(command.name);
    });

    this.toolbarElement.appendChild(button);
    this.buttons.set(command.name, button);
  }

  // ──────────────────────────────────────────────
  // Dropdown Buton (Liste stil seçenekleri gibi)
  // ──────────────────────────────────────────────

  /**
   * Dropdown menülü buton ekler.
   *
   * Yapı:
   * ┌──────────┬───┐
   * │  Ana Btn  │ ▾ │  ← Ana buton + ok butonu
   * └──────────┴───┘
   *    ┌──────────────┐
   *    │ Seçenek 1    │  ← Dropdown menü
   *    │ Seçenek 2    │
   *    │ Seçenek 3    │
   *    └──────────────┘
   *
   * @param {import('./commands/baseCommand.js').BaseCommand} mainCommand - Ana komut (varsayılan tıklama)
   * @param {Array<{label: string, icon: string, command: import('./commands/baseCommand.js').BaseCommand}>} options - Alt seçenekler
   */
  addDropdownButton(mainCommand, options) {
    // ── Wrapper ──
    const wrapper = document.createElement('div');
    wrapper.className = 'dropdown-wrapper relative inline-flex items-center';

    // ── Ana buton (varsayılan stili uygular) ──
    const mainBtn = document.createElement('button');
    mainBtn.type = 'button';
    mainBtn.innerHTML = mainCommand.icon;
    mainBtn.title = mainCommand.title;
    mainBtn.dataset.command = mainCommand.name;
    mainBtn.className = [
      'relative inline-flex items-center justify-center',
      'w-8 h-8 rounded-l-lg',
      'text-slate-500 hover:text-blue-600',
      'hover:bg-blue-50/80 hover:shadow-sm',
      'transition-all duration-200 ease-out',
      'cursor-pointer select-none',
      'focus:outline-none focus:ring-2 focus:ring-blue-500/30',
    ].join(' ');

    mainBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this._closeDropdown();
      this.editor.executeCommand(mainCommand.name);
    });

    // ── Ok butonu (dropdown'ı açar/kapatır) ──
    const arrowBtn = document.createElement('button');
    arrowBtn.type = 'button';
    arrowBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3.5L5 7L8 3.5H2Z"/></svg>';
    arrowBtn.title = `${mainCommand.title} Seçenekleri`;
    arrowBtn.className = [
      'px-1 py-1.5 rounded-r-lg text-sm',
      'text-slate-400 hover:text-blue-600',
      'hover:bg-blue-50/80 hover:shadow-sm',
      'transition-all duration-200 ease-out',
      'cursor-pointer select-none',
      'focus:outline-none focus:ring-2 focus:ring-blue-500/30',
      'border-l border-slate-200/50',
    ].join(' ');

    // ── Dropdown menü ──
    const dropdown = document.createElement('div');
    dropdown.className = [
      'absolute left-0 top-full mt-1.5 z-50',
      'bg-white/95 backdrop-blur-md border border-slate-200/70 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)]',
      'py-1.5 min-w-[180px]',
      'max-h-[320px] overflow-y-auto',
      'opacity-0 invisible translate-y-[-4px]',
      'transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
    ].join(' ');

    // Her seçenek için menü öğesi oluştur
    options.forEach((option) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = [
        'w-full px-4 py-2 text-left text-sm font-medium',
        'text-slate-600 hover:text-blue-600 hover:bg-slate-50',
        'flex items-center gap-2.5',
        'transition-colors duration-150',
        'cursor-pointer',
      ].join(' ');
      item.innerHTML = `<span class="w-5 text-center text-slate-400">${option.icon}</span><span>${option.label}</span>`;

      // mousedown + preventDefault → seçim koruması
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Komutu kaydet ve çalıştır
        // Neden: Alt seçenekler de birer command, registerCommand + executeCommand ile çalışır
        if (!this.editor.commands.has(option.command.name)) {
          this.editor.registerCommand(option.command.name, option.command);
        }
        this.editor.executeCommand(option.command.name);
        this._closeDropdown();
      });

      dropdown.appendChild(item);
    });

    // Ok butonuna tıklanınca dropdown aç/kapat
    arrowBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (this._activeDropdown === dropdown) {
        this._closeDropdown();
      } else {
        this._closeDropdown();
        this._openDropdown(dropdown);
      }
    });

    wrapper.appendChild(mainBtn);
    wrapper.appendChild(arrowBtn);
    wrapper.appendChild(dropdown);
    this.toolbarElement.appendChild(wrapper);

    // Ana butonu aktif durum takibi için kaydet
    this.buttons.set(mainCommand.name, mainBtn);
  }

  // ──────────────────────────────────────────────
  // Dropdown Yönetimi
  // ──────────────────────────────────────────────

  /** @private */
  _openDropdown(dropdown) {
    dropdown.classList.remove('opacity-0', 'invisible', 'translate-y-[-4px]');
    dropdown.classList.add('opacity-100', 'visible', 'translate-y-0');
    this._activeDropdown = dropdown;
  }

  /** @private */
  _closeDropdown() {
    if (this._activeDropdown) {
      this._activeDropdown.classList.remove('opacity-100', 'visible', 'translate-y-0');
      this._activeDropdown.classList.add('opacity-0', 'invisible', 'translate-y-[-4px]');
      this._activeDropdown = null;
    }
  }

  // ──────────────────────────────────────────────
  // Renk Seçici Buton
  // ──────────────────────────────────────────────

  /**
   * Renk seçici butonu ekler.
   * Normal buton gibi görünür, tıklanınca komutu çalıştırır
   * (komut kendi color input'unu yönetir).
   *
   * @param {import('./commands/baseCommand.js').BaseCommand} command
   */
  addColorPicker(command) {
    const button = document.createElement('button');
    button.type = 'button';
    button.innerHTML = command.icon;
    button.title = command.title;
    button.dataset.command = command.name;
    button.className = Toolbar.BUTTON_BASE_CLASS;

    button.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.editor.executeCommand(command.name);
    });

    this.toolbarElement.appendChild(button);
    this.buttons.set(command.name, button);
  }

  // ──────────────────────────────────────────────
  // Diğer
  // ──────────────────────────────────────────────

  /**
   * Bir ayırıcı (separator) ekler - buton gruplarını görsel olarak ayırır
   */
  addSeparator() {
    const separator = document.createElement('div');
    separator.className = 'w-px h-5 bg-slate-200/80 mx-1.5 rounded-full';
    this.toolbarElement.appendChild(separator);
  }

  /**
   * Tüm butonların aktif/pasif durumlarını günceller.
   * İmleç bold metin üzerindeyse Bold butonu highlight olur vb.
   * @private
   */
  _updateActiveStates() {
    this.buttons.forEach((button, name) => {
      const command = this.editor.commands.get(name);
      if (!command || !command.tag) return;

      const isActive = this.editor.isTagActive(command.tag);

      if (isActive) {
        Toolbar.ACTIVE_CLASSES.forEach((c) => button.classList.add(c));
        Toolbar.INACTIVE_CLASSES.forEach((c) => button.classList.remove(c));
      } else {
        Toolbar.ACTIVE_CLASSES.forEach((c) => button.classList.remove(c));
        Toolbar.INACTIVE_CLASSES.forEach((c) => button.classList.add(c));
      }
    });
  }
}
