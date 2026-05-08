/**
 * EditorCore - Editörün çekirdek modülü
 * 
 * Sorumlulukları:
 * - Selection ve Range API yönetimi
 * - Komut kaydı ve çalıştırma (Command Registry)
 * - Klavye kısayolları
 * - Seçim kaydetme/geri yükleme (toolbar focus kaybı için)
 * 
 * document.execCommand KULLANILMIYOR.
 * Tüm metin manipülasyonu Selection/Range API ile yapılır.
 */
const MEDIA_SELECTOR = 'img, video, audio, .embed-wrapper';

const RESIZE_HANDLES = [
  { name: 'nw', cursor: 'nw-resize', fx: 0,   fy: 0   },
  { name: 'n',  cursor: 'n-resize',  fx: 0.5, fy: 0   },
  { name: 'ne', cursor: 'ne-resize', fx: 1,   fy: 0   },
  { name: 'w',  cursor: 'w-resize',  fx: 0,   fy: 0.5 },
  { name: 'e',  cursor: 'e-resize',  fx: 1,   fy: 0.5 },
  { name: 'sw', cursor: 'sw-resize', fx: 0,   fy: 1   },
  { name: 's',  cursor: 's-resize',  fx: 0.5, fy: 1   },
  { name: 'se', cursor: 'se-resize', fx: 1,   fy: 1   },
];
const HANDLE_SIZE = 10;
const MIN_MEDIA_SIZE = 40;

export class EditorCore {
  /**
   * @param {HTMLElement} editorElement - contenteditable olan div
   */
  constructor(editorElement) {
    /** @type {HTMLElement} */
    this.editorElement = editorElement;

    /** @type {Map<string, import('./commands/baseCommand.js').BaseCommand>} */
    this.commands = new Map();

    /** @type {Range|null} - Toolbar tıklaması sırasında kaybolan seçimi tutmak için */
    this._savedRange = null;

    /** @type {HTMLElement|null} - Tıklanarak seçilen medya elementi */
    this._selectedMedia = null;

    /** @type {HTMLButtonElement|null} */
    this._mediaDeleteButton = null;

    /** @type {HTMLElement[]} */
    this._resizeHandleEls = [];

    /** @type {object|null} */
    this._resizeDragState = null;

    this._positionSelectedMediaControls = () => {
      this._positionMediaDeleteButton();
      this._positionResizeHandles();
    };

    /** @type {Set<(commandName: string) => void>} */
    this._listeners = new Set();

    this._setupEventListeners();
  }

  // ──────────────────────────────────────────────
  // Komut Yönetimi
  // ──────────────────────────────────────────────

  /**
   * Yeni bir komut kaydeder
   * @param {string} name
   * @param {import('./commands/baseCommand.js').BaseCommand} command
   */
  registerCommand(name, command) {
    this.commands.set(name, command);
  }

  /**
   * Kayıtlı bir komutu çalıştırır
   * @param {string} name
   */
  executeCommand(name) {
    const command = this.commands.get(name);
    if (!command) {
      console.error(`Komut bulunamadı: ${name}`);
      return;
    }

    // Toolbar butonuna tıklandığında seçim kaybolmuş olabilir, geri yükle
    this.restoreSelection();
    command.execute(this);
    this.saveSelection();

    // Dinleyicilere bildir (aktif durum güncellemesi için)
    this._notifyListeners(name);
  }

  /**
   * Komut çalıştırıldığında çağrılacak callback ekler
   * @param {(commandName: string) => void} callback
   */
  onCommandExecuted(callback) {
    this._listeners.add(callback);
  }

  /** @private */
  _notifyListeners(commandName) {
    this._listeners.forEach((cb) => cb(commandName));
  }

  // ──────────────────────────────────────────────
  // Selection & Range API
  // ──────────────────────────────────────────────

  /**
   * Aktif Selection nesnesini döndürür
   * @returns {Selection|null}
   */
  getSelection() {
    return window.getSelection();
  }

  /**
   * Bir node'un bu editörün içinde olup olmadığını kontrol eder.
   * @private
   * @param {Node|null} node
   * @returns {boolean}
   */
  _isNodeInEditor(node) {
    return !!node && (node === this.editorElement || this.editorElement.contains(node));
  }

  /**
   * Range'in tamamen bu editörün içinde ve hâlâ DOM'a bağlı olup olmadığını kontrol eder.
   * @private
   * @param {Range|null} range
   * @returns {boolean}
   */
  _isRangeInEditor(range) {
    return !!range
      && this._isNodeInEditor(range.commonAncestorContainer)
      && this._isNodeInEditor(range.startContainer)
      && this._isNodeInEditor(range.endContainer);
  }

  /** @private */
  _focusEditor() {
    try {
      this.editorElement.focus({ preventScroll: true });
    } catch {
      this.editorElement.focus();
    }
  }

  /**
   * Editör içindeki aktif Range'i döndürür
   * Eğer seçim editör dışındaysa null döner
   * @returns {Range|null}
   */
  getRange() {
    const selection = this.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);

    // Range editör sınırları içinde mi?
    if (!this._isRangeInEditor(range)) {
      return null;
    }

    return range;
  }

  /**
   * Mevcut seçimi hafızaya alır.
   * Toolbar butonuna tıklandığında tarayıcı contenteditable'dan
   * focus'u çeker → seçim kaybolur. Bu metod bunu önler.
   */
  saveSelection() {
    const range = this.getRange();
    if (range) {
      this._savedRange = range.cloneRange();
      return true;
    }
    return false;
  }

  /**
   * Kaydedilmiş seçimi geri yükler
   * @param {{fallbackToEnd?: boolean}} [options]
   * @returns {boolean}
   */
  restoreSelection(options = {}) {
    const fallbackToEnd = options.fallbackToEnd !== false;
    const selection = this.getSelection();
    if (!selection) return false;

    const currentRange = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    if (this._isRangeInEditor(currentRange)) {
      const range = currentRange.cloneRange();
      this._focusEditor();
      selection.removeAllRanges();
      selection.addRange(range);
      this._savedRange = range.cloneRange();
      return true;
    }

    if (this._isRangeInEditor(this._savedRange)) {
      this._focusEditor();
      selection.removeAllRanges();
      selection.addRange(this._savedRange.cloneRange());
      return true;
    }

    if (fallbackToEnd) {
      this.focusAtEnd();
      return true;
    }

    return false;
  }

  // ──────────────────────────────────────────────
  // Block-Level İşlemleri (Başlık, Liste vb.)
  // ──────────────────────────────────────────────

  /**
   * İmlecin bulunduğu en yakın block-level elementi döndürür.
   * Block-level: P, H1-H6, LI, DIV, BLOCKQUOTE
   *
   * Neden gerekli: Block komutları (başlık, liste) satır/paragraf bazında
   * çalışır, inline komutlardan farklı olarak tüm bloğu dönüştürür.
   *
   * @returns {HTMLElement|null}
   */
  getClosestBlock() {
    const selection = this.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    let node = selection.anchorNode;
    if (node && node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }

    const BLOCK_TAGS = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'DIV', 'BLOCKQUOTE'];

    while (node && node !== this.editorElement) {
      if (node.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.includes(node.tagName)) {
        return node;
      }
      node = node.parentNode;
    }

    return null;
  }

  /**
   * İmlecin bulunduğu bloğu hedef block tag'ına dönüştürür (toggle).
   *
   * Senaryolar:
   * 1. Blok zaten hedef tag → <p> ye geri döndür
   * 2. Blok farklı bir tag → hedef tag'a dönüştür
   * 3. Blok bir liste öğesi (LI) ise → önce listeden çıkar, sonra dönüştür
   * 4. Editörde blok yok (düz text) → text'i <p> ile sarıp sonra dönüştür
   *
   * @param {string} tagName - Hedef tag ('H2', 'H3' vb.)
   */
  toggleBlockTag(tagName) {
    const upperTag = tagName.toUpperCase();
    let block = this.getClosestBlock();

    // Editör içinde henüz blok element yoksa (düz metin yazılmış)
    // → mevcut içeriği bir <p> ile sar
    if (!block) {
      block = this._ensureBlockWrapper();
      if (!block) return;
    }

    // Liste öğesindeyse önce listeden çıkar
    if (block.tagName === 'LI') {
      block = this._extractFromList(block);
      if (!block) return;
    }

    if (block.tagName === upperTag) {
      // Zaten hedef tag → normale (P) döndür
      this._replaceBlockTag(block, 'P');
    } else {
      // Farklı bir tag → hedef tag'a dönüştür
      this._replaceBlockTag(block, upperTag);
    }
  }

  /**
   * İmlecin bulunduğu bloğu listeye dönüştürür veya listeden çıkarır (toggle).
   *
   * Senaryolar:
   * 1. Normal blok → <ul>/<ol> liste oluştur
   * 2. Zaten aynı liste tipinde → listeyi kaldır, <p> yap
   * 3. Farklı liste tipinde → liste tipini değiştir (UL↔OL)
   *
   * @param {string} listType - 'UL' veya 'OL'
   * @param {string} [styleType] - CSS list-style-type değeri (ör: 'disc', 'circle', 'lower-alpha')
   */
  toggleList(listType, styleType) {
    const upperType = listType.toUpperCase();
    let block = this.getClosestBlock();

    // Düz metin varsa önce blok oluştur
    if (!block) {
      block = this._ensureBlockWrapper();
      if (!block) return;
    }

    if (block.tagName === 'LI') {
      // Zaten bir liste öğesindeyiz
      const parentList = block.parentNode;

      if (parentList.tagName === upperType) {
        // Aynı liste tipinde → listeyi tamamen kaldır
        this._unwrapList(parentList);
      } else {
        // Farklı liste tipinde → tip değiştir (UL↔OL)
        this._changeListType(parentList, upperType, styleType);
      }
    } else {
      // Normal blok → listeye dönüştür
      this._wrapInList(block, upperType, styleType);
    }
  }

  /**
   * İmlecin bulunduğu listenin list-style-type CSS değerini değiştirir.
   * Liste yoksa hiçbir şey yapmaz.
   *
   * @param {string} styleType - CSS list-style-type değeri (ör: 'disc', 'circle', 'upper-roman')
   */
  setListStyle(styleType) {
    const block = this.getClosestBlock();
    if (!block || block.tagName !== 'LI') return;

    const parentList = block.parentNode;
    if (!parentList) return;

    parentList.style.listStyleType = styleType;
  }

  /**
   * Bir blok elementinin tag'ını değiştirir. İçerik korunur, imleç yeni bloğa taşınır.
   * @private
   * @param {HTMLElement} block - Mevcut blok element
   * @param {string} newTagName - Yeni tag adı
   */
  _replaceBlockTag(block, newTagName) {
    const newBlock = document.createElement(newTagName);

    // Tüm child node'ları yeni bloğa taşı
    while (block.firstChild) {
      newBlock.appendChild(block.firstChild);
    }

    block.parentNode.replaceChild(newBlock, block);

    // İmleci yeni bloğun sonuna taşı
    this._setCursorToEnd(newBlock);
  }

  /**
   * Bir bloğu UL veya OL listesine sarar
   * @private
   * @param {HTMLElement} block - Listeye dönüştürülecek blok
   * @param {string} listType - 'UL' veya 'OL'
   * @param {string} [styleType] - CSS list-style-type değeri
   */
  _wrapInList(block, listType, styleType) {
    const list = document.createElement(listType);
    const li = document.createElement('LI');

    // Stil varsa inline olarak uygula
    if (styleType) {
      list.style.listStyleType = styleType;
    }

    // Bloğun içeriğini LI'ya taşı
    while (block.firstChild) {
      li.appendChild(block.firstChild);
    }

    list.appendChild(li);
    block.parentNode.replaceChild(list, block);

    this._setCursorToEnd(li);
  }

  /**
   * Bir liste elementinin tüm öğelerini <p> ye dönüştürerek listeyi kaldırır
   * @private
   * @param {HTMLElement} listElement - UL veya OL element
   */
  _unwrapList(listElement) {
    const parent = listElement.parentNode;
    let lastInserted = null;

    // Her LI'yı bir <p> ye dönüştür ve liste yerine yerleştir
    while (listElement.firstChild) {
      const li = listElement.firstChild;
      const p = document.createElement('P');

      while (li.firstChild) {
        p.appendChild(li.firstChild);
      }

      parent.insertBefore(p, listElement);
      listElement.removeChild(li);
      lastInserted = p;
    }

    parent.removeChild(listElement);

    if (lastInserted) {
      this._setCursorToEnd(lastInserted);
    }
  }

  /**
   * Liste tipini değiştirir (UL↔OL). İçerik ve LI yapısı korunur.
   * @private
   * @param {HTMLElement} listElement - Mevcut UL veya OL
   * @param {string} newType - Yeni liste tipi
   * @param {string} [styleType] - CSS list-style-type değeri
   */
  _changeListType(listElement, newType, styleType) {
    const newList = document.createElement(newType);

    // Stil varsa inline olarak uygula
    if (styleType) {
      newList.style.listStyleType = styleType;
    }

    // Tüm LI'ları yeni listeye taşı
    while (listElement.firstChild) {
      newList.appendChild(listElement.firstChild);
    }

    listElement.parentNode.replaceChild(newList, listElement);

    // İmleci son LI'nın sonuna taşı
    const lastLi = newList.lastElementChild;
    if (lastLi) {
      this._setCursorToEnd(lastLi);
    }
  }

  /**
   * Bir LI'yı içinden bulunduğu listeden çıkarır ve bağımsız bir <p> yapar.
   * @private
   * @param {HTMLElement} liElement - Çıkarılacak LI
   * @returns {HTMLElement|null} - Oluşturulan <p> elementi
   */
  _extractFromList(liElement) {
    const parentList = liElement.parentNode;
    const p = document.createElement('P');

    while (liElement.firstChild) {
      p.appendChild(liElement.firstChild);
    }

    // LI'yı listeden kaldır
    parentList.removeChild(liElement);

    // Eğer liste boş kaldıysa, listeyi tamamen kaldır ve yerine <p> koy
    if (parentList.children.length === 0) {
      parentList.parentNode.replaceChild(p, parentList);
    } else {
      // Liste hâlâ öğe içeriyorsa, <p> yi listenin önüne ekle
      parentList.parentNode.insertBefore(p, parentList);
    }

    this._setCursorToEnd(p);
    return p;
  }

  /**
   * Editör içinde blok element yoksa (düz text node'lar varsa),
   * mevcut metni bir <p> ile sarar.
   * @private
   * @returns {HTMLElement|null}
   */
  _ensureBlockWrapper() {
    const selection = this.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    let node = selection.anchorNode;

    // Text node ise ve doğrudan editör çocuğuysa → <p> ile sar
    if (node && node.nodeType === Node.TEXT_NODE && node.parentNode === this.editorElement) {
      const p = document.createElement('P');
      this.editorElement.replaceChild(p, node);
      p.appendChild(node);
      this._setCursorToEnd(p);
      return p;
    }

    // Editör elementinin doğrudan çocuğu olan bir element ise onu döndür
    if (node && node.parentNode === this.editorElement && node.nodeType === Node.ELEMENT_NODE) {
      return node;
    }

    return null;
  }

  /**
   * İmleci belirtilen elementin sonuna taşır
   * @private
   * @param {HTMLElement} element
   */
  _setCursorToEnd(element) {
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false); // false = end'e collapse
    const selection = this.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  /**
   * Editöre odaklanır ve imleci editörün sonuna taşır.
   */
  focusAtEnd() {
    this._focusEditor();
    this._setCursorToEnd(this.editorElement);
    this.saveSelection();
  }

  // ──────────────────────────────────────────────
  // İmleç Yönetimi (Public)
  // ──────────────────────────────────────────────

  /**
   * İmleci belirtilen elementin SONRASINA taşır.
   * Resim ekleme gibi blok element'lerden sonra yazma devam etsin diye kullanılır.
   *
   * @param {HTMLElement} element - Sonrasına imleç taşınacak element
   */
  setCursorAfter(element) {
    if (!element || !element.parentNode || !this._isNodeInEditor(element)) {
      this.focusAtEnd();
      return;
    }

    this._focusEditor();
    const range = document.createRange();
    range.setStartAfter(element);
    range.collapse(true);
    const selection = this.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    this.saveSelection();
  }

  /**
   * Verilen DOM node'unu kaydedilmiş imleç konumuna yerleştirir.
   *
   * Kullanım senaryoları:
   * - Formül ekleme (contenteditable="false" span)
   * - Özel inline widget'lar
   *
   * Çalışma mantığı:
   * 1. Kaydedilmiş seçimi geri yükle (modal/dialog kapatıldıktan sonra)
   * 2. Seçili metin varsa sil
   * 3. Node'u range'e ekle
   * 4. İmleci node'un sonrasına taşı
   *
   * @param {Node} node - Yerleştirilecek DOM node'u
   */
  insertNodeAtCursor(node) {
    this.restoreSelection();

    const range = this.getRange();
    const insertedNodes = node && node.nodeType === Node.DOCUMENT_FRAGMENT_NODE
      ? Array.from(node.childNodes)
      : [node].filter(Boolean);
    const lastInserted = insertedNodes[insertedNodes.length - 1] || null;

    if (!range) {
      // Seçim yoksa editörün sonuna ekle (fallback)
      this.editorElement.appendChild(node);
      if (lastInserted) {
        this.setCursorAfter(lastInserted);
      } else {
        this.focusAtEnd();
      }
      return;
    }

    // Seçili metin varsa sil
    range.deleteContents();

    // Node'u yerleştir
    range.insertNode(node);

    // İmleci node'un sonrasına taşı
    if (lastInserted) {
      this.setCursorAfter(lastInserted);
    } else {
      this.focusAtEnd();
    }
  }

  /**
   * HTML içeriğini güvenli şekilde aktif editör imlecine ekler.
   * @param {string} html
   */
  insertHtmlAtCursor(html) {
    const template = document.createElement('template');
    template.innerHTML = html || '';
    if (!template.content.childNodes.length) return;
    this.insertNodeAtCursor(template.content);
  }

  // ──────────────────────────────────────────────
  // Hizalama İşlemleri
  // ──────────────────────────────────────────────

  /**
   * İmlecin bulunduğu blok elementinin metin hizalamasını değiştirir.
   * CSS text-align ile çalışır, DOM yapısını değiştirmez.
   *
   * @param {'left'|'center'|'right'|'justify'} alignment
   */
  setBlockAlignment(alignment) {
    // Seçili medya varsa parent bloğa text-align uygula, medyayı inline-block yap
    let targetMedia = this._selectedMedia || this.editorElement.querySelector('.editor-media-selected');

    if (!targetMedia) {
      const selection = this.getSelection();
      if (selection && selection.rangeCount > 0) {
        const node = selection.anchorNode;
        if (node && node.nodeType === Node.ELEMENT_NODE && node.matches(MEDIA_SELECTOR)) {
          targetMedia = node;
        } else if (node && node.nodeType === Node.ELEMENT_NODE && node === this.editorElement) {
          const child = node.childNodes[selection.anchorOffset];
          if (child && child.nodeType === Node.ELEMENT_NODE && child.matches(MEDIA_SELECTOR)) {
            targetMedia = child;
          }
        }
      }
    }

    if (targetMedia) {
      // display:block + margin ile hizala — parent text-align'a bağımlılık olmadan
      targetMedia.style.display = 'block';
      if (alignment === 'center') {
        targetMedia.style.marginLeft  = 'auto';
        targetMedia.style.marginRight = 'auto';
      } else if (alignment === 'right') {
        targetMedia.style.marginLeft  = 'auto';
        targetMedia.style.marginRight = '0';
      } else {
        // left veya justify
        targetMedia.style.marginLeft  = '0';
        targetMedia.style.marginRight = 'auto';
      }
      requestAnimationFrame(() => this._positionSelectedMediaControls());
      return;
    }

    let block = this.getClosestBlock();

    if (!block) {
      block = this._ensureBlockWrapper();
      if (!block) return;
    }

    if (block.matches && block.matches(MEDIA_SELECTOR)) {
      block.style.display = 'block';
      if (alignment === 'center') {
        block.style.marginLeft  = 'auto';
        block.style.marginRight = 'auto';
      } else if (alignment === 'right') {
        block.style.marginLeft  = 'auto';
        block.style.marginRight = '0';
      } else {
        block.style.marginLeft  = '0';
        block.style.marginRight = 'auto';
      }
      requestAnimationFrame(() => this._positionSelectedMediaControls());
      return;
    }

    block.style.textAlign = alignment;

    // Blok içinde display:block medya varsa onları da margin ile hizala
    block.querySelectorAll(MEDIA_SELECTOR).forEach(m => {
      if (m.style.display === 'block' || window.getComputedStyle(m).display === 'block') {
        if (alignment === 'center') {
          m.style.marginLeft = 'auto'; m.style.marginRight = 'auto';
        } else if (alignment === 'right') {
          m.style.marginLeft = 'auto'; m.style.marginRight = '0';
        } else {
          m.style.marginLeft = '0'; m.style.marginRight = 'auto';
        }
      }
    });

    // mousedown'da uygulanan textAlign'dan sonra browser cursor pozisyonunu
    // hemen güncellemeyebilir — requestAnimationFrame ile selection'ı tazele
    requestAnimationFrame(() => {
      this._positionSelectedMediaControls();
      const sel = this.getSelection();
      if (sel && sel.rangeCount > 0) {
        const r = sel.getRangeAt(0).cloneRange();
        sel.removeAllRanges();
        sel.addRange(r);
      }
    });
  }

  // ──────────────────────────────────────────────
  // Inline Stil İşlemleri (Renk vb.)
  // ──────────────────────────────────────────────

  /**
   * Seçili metne inline CSS stili uygular.
   * Seçili metni bir <span> ile sararak inline style atar.
   *
   * @param {string} property - CSS property adı (camelCase: 'color', 'backgroundColor')
   * @param {string} value - CSS değeri ('#ff0000', 'red')
   */
  applyInlineStyle(property, value) {
    const selection = this.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (range.collapsed) return; // Seçim yoksa işlem yapma

    // Seçili içeriği çıkar
    const fragment = range.extractContents();

    // Yeni span oluştur ve stili uygula
    const span = document.createElement('span');
    span.style[property] = value;
    span.appendChild(fragment);

    // Span'ı orijinal konuma yerleştir
    range.insertNode(span);

    // Seçimi span içeriğine ayarla
    selection.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    selection.addRange(newRange);
    this.saveSelection();
  }

  // ──────────────────────────────────────────────
  // Bağlantı (Link) İşlemleri
  // ──────────────────────────────────────────────

  /**
   * Seçili metni bir <a href="..." target="_blank"> bağlantısına dönüştürür.
   * Seçim boşsa (collapsed) URL'yi hem metin hem href olarak kullanır.
   *
   * @param {string} url - Bağlantı URL'si
   */
  wrapWithLink(url) {
    const selection = this.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';

    if (range.collapsed) {
      // Seçim boşsa → URL'yi görünen metin olarak ekle
      anchor.textContent = url;
      range.insertNode(anchor);
    } else {
      // Seçili metni link ile sar
      anchor.appendChild(range.extractContents());
      range.insertNode(anchor);
    }

    this.setCursorAfter(anchor);
  }

  /**
   * İmleç konumundaki belirtilen tag'ı kaldırır (genel amaçlı public unwrap).
   * Mevcut _unwrapTag'den farklı olarak bu metod public ve doğrudan çağrılabilir.
   *
   * @param {string} tagName - Kaldırılacak tag adı (ör: 'A')
   */
  unwrapTag(tagName) {
    const selection = this.getSelection();
    if (!selection) return;
    this._unwrapTag(tagName, selection);
  }

  // ──────────────────────────────────────────────
  // Inline Tag İşlemleri (Bold, Italic vb.)
  // ──────────────────────────────────────────────

  /**
   * İmleç konumunun belirli bir tag içinde olup olmadığını kontrol eder.
   * Örnek: isTagActive('STRONG') → true/false
   * 
   * @param {string} tagName - Büyük harfle tag adı (ör: 'STRONG', 'EM')
   * @returns {boolean}
   */
  isTagActive(tagName) {
    const selection = this.getSelection();
    if (!selection || selection.rangeCount === 0) return false;

    let node = selection.anchorNode;

    // Text node ise element parent'a çık
    if (node && node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }

    // DOM ağacında yukarı doğru yürü, hedef tag'ı ara
    while (node && node !== this.editorElement) {
      if (
        node.nodeType === Node.ELEMENT_NODE &&
        node.tagName === tagName.toUpperCase()
      ) {
        return true;
      }
      node = node.parentNode;
    }

    return false;
  }

  /**
   * Seçili metni belirtilen tag ile sarar veya sarmalı kaldırır (toggle).
   * 
   * Çalışma mantığı:
   * 1. Seçim yoksa (collapsed) → hiçbir şey yapma
   * 2. Seçim zaten hedef tag içindeyse → tag'ı kaldır (unwrap)
   * 3. Değilse → seçili metni tag ile sar (wrap)
   * 
   * @param {string} tagName - HTML tag adı (ör: 'STRONG', 'EM')
   */
  toggleInlineTag(tagName) {
    const selection = this.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    // Collapsed = imleç var ama metin seçili değil
    if (range.collapsed) return;

    if (this.isTagActive(tagName)) {
      this._unwrapTag(tagName, selection);
    } else {
      this._wrapTag(tagName, range, selection);
    }
  }

  /**
   * Seçili metni yeni bir HTML elementi ile sarar
   * @private
   */
  _wrapTag(tagName, range, selection) {
    // Seçili DOM parçasını çıkar
    const fragment = range.extractContents();

    // Yeni wrapper element oluştur
    const wrapper = document.createElement(tagName);
    wrapper.appendChild(fragment);

    // Wrapper'ı orijinal konuma yerleştir
    range.insertNode(wrapper);

    // Seçimi yeni wrapper'ın içeriğine ayarla
    selection.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(wrapper);
    selection.addRange(newRange);
  }

  /**
   * Seçili metnin etrafındaki hedef tag'ı kaldırır
   * 
   * NOT: Bu ilk sürüm, tag'ın tüm içeriğini unwrap eder.
   * Kısmi seçim senaryoları (tag içeriğinin sadece bir kısmı seçili)
   * sonraki iterasyonlarda ele alınacak.
   * 
   * @private
   */
  _unwrapTag(tagName, selection) {
    let node = selection.anchorNode;

    // Text node ise parent'a çık
    if (node && node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }

    // Hedef tag'ı bul (yukarı doğru yürü)
    let targetNode = null;
    while (node && node !== this.editorElement) {
      if (
        node.nodeType === Node.ELEMENT_NODE &&
        node.tagName === tagName.toUpperCase()
      ) {
        targetNode = node;
        break;
      }
      node = node.parentNode;
    }

    if (!targetNode) return;

    const parent = targetNode.parentNode;

    // Tag'ın çocuklarını tag'ın önüne taşı, sonra tag'ı sil
    // Böylece içerik korunur, sadece sarmal (wrapper) kalkar
    while (targetNode.firstChild) {
      parent.insertBefore(targetNode.firstChild, targetNode);
    }
    parent.removeChild(targetNode);

    // Ardışık text node'ları birleştir (DOM temizliği)
    parent.normalize();
  }

  // ──────────────────────────────────────────────
  // Medya Seçimi
  // ──────────────────────────────────────────────

  /**
   * @private
   * @param {EventTarget|null} target
   * @returns {HTMLElement|null}
   */
  _getMediaTarget(target) {
    if (!(target instanceof Element)) return null;
    const media = target.matches(MEDIA_SELECTOR) ? target : target.closest(MEDIA_SELECTOR);
    return media instanceof HTMLElement && this._isNodeInEditor(media) ? media : null;
  }

  /**
   * @private
   * @param {HTMLElement} media
   */
  _saveRangeAfterMedia(media) {
    if (!media.parentNode || !this._isNodeInEditor(media)) return;
    const range = document.createRange();
    range.setStartAfter(media);
    range.collapse(true);
    this._savedRange = range;
  }

  /**
   * @private
   * @param {HTMLElement} media
   */
  _selectMedia(media) {
    if (this._selectedMedia && this._selectedMedia !== media) {
      this._clearSelectedMedia();
    }

    this._selectedMedia = media;
    media.classList.add('editor-media-selected');
    media.setAttribute('data-cre-media-selected', 'true');
    this._saveRangeAfterMedia(media);
    this._focusEditor();

    const selection = this.getSelection();
    if (selection) selection.removeAllRanges();

    this._showMediaDeleteButton();
    this._showResizeHandles();
    this._notifyListeners('selectionchange');
  }

  /** @private */
  _clearSelectedMedia() {
    if (this._selectedMedia) {
      this._selectedMedia.classList.remove('editor-media-selected');
      this._selectedMedia.removeAttribute('data-cre-media-selected');
      this._selectedMedia.style.outline = '';
      this._selectedMedia.style.outlineOffset = '';
      this._selectedMedia.style.boxShadow = '';
      this._selectedMedia = null;
    }
    this._hideMediaDeleteButton();
    this._hideResizeHandles();
  }

  /** @private */
  _ensureMediaDeleteButton() {
    if (this._mediaDeleteButton) return this._mediaDeleteButton;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cre-media-delete-button';
    button.textContent = 'Sil';
    button.title = 'Medyayı sil';
    button.style.cssText = [
      'position: fixed',
      'display: none',
      'align-items: center',
      'justify-content: center',
      'height: 28px',
      'padding: 0 10px',
      'border: 0',
      'border-radius: 6px',
      'background: #dc2626',
      'color: #fff',
      'font: 600 12px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      'box-shadow: 0 8px 20px rgba(15, 23, 42, 0.22)',
      'cursor: pointer',
      'z-index: 2147483647',
      'user-select: none',
    ].join('; ');

    button.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._removeSelectedMedia();
    });

    document.body.appendChild(button);
    this._mediaDeleteButton = button;
    return button;
  }

  /** @private */
  _showMediaDeleteButton() {
    const button = this._ensureMediaDeleteButton();
    button.style.display = 'inline-flex';
    this._positionMediaDeleteButton();
  }

  /** @private */
  _hideMediaDeleteButton() {
    if (this._mediaDeleteButton) {
      this._mediaDeleteButton.style.display = 'none';
    }
  }

  /** @private */
  _positionMediaDeleteButton() {
    const media = this._selectedMedia;
    const button = this._mediaDeleteButton;
    if (!media || !button || button.style.display === 'none' || !this._isNodeInEditor(media)) return;

    const rect = media.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      this._hideMediaDeleteButton();
      return;
    }

    const width = button.offsetWidth || 48;
    const left = Math.min(
      Math.max(8, rect.right - width - 8),
      Math.max(8, window.innerWidth - width - 8)
    );
    const top = Math.max(8, rect.top + 8);

    button.style.left = `${left}px`;
    button.style.top = `${top}px`;
  }

  /** @private */
  _removeSelectedMedia() {
    const media = this._selectedMedia;
    if (!media || !media.parentNode) return;

    const parent = media.parentNode;
    const index = Array.prototype.indexOf.call(parent.childNodes, media);
    this._clearSelectedMedia();
    media.remove();

    if (this._isNodeInEditor(parent)) {
      this._focusEditor();
      const range = document.createRange();
      range.setStart(parent, Math.max(0, Math.min(index, parent.childNodes.length)));
      range.collapse(true);
      const selection = this.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      this._savedRange = range.cloneRange();
    } else {
      this.focusAtEnd();
    }

    this.editorElement.dispatchEvent(new Event('input', { bubbles: true }));
    this._notifyListeners('selectionchange');
  }

  // ──────────────────────────────────────────────
  // Resize Handles
  // ──────────────────────────────────────────────

  /** @private */
  _ensureResizeHandles() {
    if (this._resizeHandleEls.length) return this._resizeHandleEls;
    RESIZE_HANDLES.forEach(def => {
      const el = document.createElement('div');
      el.style.cssText = [
        'position: fixed',
        'display: none',
        `width: ${HANDLE_SIZE}px`,
        `height: ${HANDLE_SIZE}px`,
        'background: #3b82f6',
        'border: 2px solid #fff',
        'border-radius: 2px',
        `cursor: ${def.cursor}`,
        'z-index: 2147483646',
        'box-shadow: 0 1px 4px rgba(0,0,0,0.3)',
        'touch-action: none',
        'user-select: none',
      ].join('; ');
      el.setAttribute('data-resize-handle', def.name);
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._startResizeDrag(def, e);
      });
      document.body.appendChild(el);
      this._resizeHandleEls.push(el);
    });
    return this._resizeHandleEls;
  }

  /** @private */
  _showResizeHandles() {
    this._ensureResizeHandles();
    this._resizeHandleEls.forEach(el => { el.style.display = 'block'; });
    this._positionResizeHandles();
  }

  /** @private */
  _hideResizeHandles() {
    this._resizeHandleEls.forEach(el => { el.style.display = 'none'; });
  }

  /** @private */
  _positionResizeHandles() {
    if (!this._selectedMedia || !this._resizeHandleEls.length) return;
    const rect = this._selectedMedia.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) { this._hideResizeHandles(); return; }
    this._resizeHandleEls.forEach((el, i) => {
      if (el.style.display === 'none') return;
      const def = RESIZE_HANDLES[i];
      el.style.left = `${rect.left + def.fx * rect.width - HANDLE_SIZE / 2}px`;
      el.style.top  = `${rect.top  + def.fy * rect.height - HANDLE_SIZE / 2}px`;
    });
  }

  /** @private */
  _startResizeDrag(def, e) {
    const media = this._selectedMedia;
    if (!media) return;
    const rect = media.getBoundingClientRect();
    this._resizeDragState = { def, media, startX: e.clientX, startY: e.clientY, startW: rect.width, startH: rect.height };

    const onMove = (ev) => {
      if (!this._resizeDragState) return;
      const { def: d, media: m, startX, startY, startW, startH } = this._resizeDragState;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const hasE = d.name.includes('e'), hasW = d.name.includes('w');
      const hasS = d.name.includes('s'), hasN = d.name.includes('n');

      if ((hasS || hasN) && !hasE && !hasW) {
        const dh = hasS ? dy : -dy;
        m.style.height = `${Math.max(MIN_MEDIA_SIZE, startH + dh)}px`;
      } else {
        const dw = hasE ? dx : hasW ? -dx : 0;
        const newW = Math.max(MIN_MEDIA_SIZE, startW + dw);
        m.style.width = `${newW}px`;
        if (m.tagName !== 'IMG') {
          m.style.height = `${Math.max(MIN_MEDIA_SIZE, (newW / startW) * startH)}px`;
        } else {
          m.style.height = 'auto';
        }
      }
      this._positionResizeHandles();
      this._positionMediaDeleteButton();
    };

    const onUp = () => {
      this._resizeDragState = null;
      document.body.style.cursor = '';
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      this.editorElement.dispatchEvent(new Event('input', { bubbles: true }));
    };

    document.body.style.cursor = def.cursor;
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  // ──────────────────────────────────────────────
  // Event Listeners
  // ──────────────────────────────────────────────

  /** @private */
  _setupEventListeners() {
    this.editorElement.addEventListener('pointerdown', (e) => {
      const media = this._getMediaTarget(e.target);
      if (!media) return;

      e.preventDefault();
      e.stopPropagation();
      this._selectMedia(media);
    }, true);

    // Medya dışına tıklandığında seçimi kaydet ve medyaları temizle
    this.editorElement.addEventListener('mouseup', (e) => {
      if (this._resizeDragState) return;
      if (this._getMediaTarget(e.target)) return;

      this._clearSelectedMedia();

      this.saveSelection();
      this._notifyListeners('selectionchange');
    });

    this.editorElement.addEventListener('keyup', () => {
      this.saveSelection();
      if (this.getRange()) this._clearSelectedMedia();
      this._notifyListeners('selectionchange');
    });

    // Klavye kısayolları + seçili medyayı Delete/Backspace ile sil
    this.editorElement.addEventListener('keydown', (e) => {
      if ((e.key === 'Backspace' || e.key === 'Delete') && this._selectedMedia) {
        e.preventDefault();
        this._removeSelectedMedia();
        return;
      }

      this.commands.forEach((command, name) => {
        if (command.shortcut && this._matchShortcut(e, command.shortcut)) {
          e.preventDefault();
          this.executeCommand(name);
        }
      });
    });

    this.editorElement.addEventListener('scroll', this._positionSelectedMediaControls);
    window.addEventListener('scroll', this._positionSelectedMediaControls, true);
    window.addEventListener('resize', this._positionSelectedMediaControls);
  }

  /**
   * Bir keyboard event'in belirtilen kısayolla eşleşip eşleşmediğini kontrol eder
   * @private
   * @param {KeyboardEvent} event
   * @param {string} shortcut - 'ctrl+b', 'ctrl+shift+k' gibi
   * @returns {boolean}
   */
  _matchShortcut(event, shortcut) {
    const parts = shortcut.toLowerCase().split('+');
    const key = parts.pop();
    const modifiers = parts;

    if (modifiers.includes('ctrl') && !event.ctrlKey) return false;
    if (modifiers.includes('shift') && !event.shiftKey) return false;
    if (modifiers.includes('alt') && !event.altKey) return false;

    return event.key.toLowerCase() === key;
  }
}
