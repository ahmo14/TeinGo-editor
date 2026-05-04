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
import { t } from './i18n.js';

const MEDIA_SELECTOR = 'img, video, audio, .embed-wrapper';

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

    this._positionSelectedMediaControls = () => this._positionMediaDeleteButton();

    /** @type {Set<(commandName: string) => void>} */
    this._listeners = new Set();

    // Medya elemanlarının native selection (mavi overlay) almasını engellemek için global stil
    if (!document.getElementById('editor-core-styles')) {
      const style = document.createElement('style');
      style.id = 'editor-core-styles';
      style.innerHTML = `
        #editor img,
        #editor video,
        #editor audio,
        .editor-content img,
        .editor-content video,
        .editor-content audio {
          max-width: 100%;
          height: auto;
          cursor: pointer;
        }
        #editor img:hover,
        #editor video:hover,
        #editor audio:hover,
        #editor .embed-wrapper:hover,
        .editor-content img:hover,
        .editor-content video:hover,
        .editor-content audio:hover,
        .editor-content .embed-wrapper:hover {
          outline: 2px solid rgba(59, 130, 246, 0.4);
          outline-offset: 2px;
        }
        .editor-media-selected::selection { background: transparent !important; }
        .editor-media-selected::-moz-selection { background: transparent !important; }
        img.editor-media-selected,
        video.editor-media-selected,
        audio.editor-media-selected,
        .embed-wrapper.editor-media-selected {
          outline: 2px solid #3b82f6 !important;
          outline-offset: 3px !important;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.18) !important;
          user-select: none !important;
          -webkit-user-select: none !important;
        }
        .embed-wrapper {
          position: relative;
          cursor: pointer;
        }
        .embed-wrapper::after {
          content: "";
          position: absolute;
          inset: 0;
          background: transparent;
          pointer-events: auto;
        }
        .cre-media-delete-button:hover {
          background: #b91c1c !important;
        }
      `;
      document.head.appendChild(style);
    }

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
      targetMedia.style.display = 'inline-block';
      targetMedia.style.marginLeft  = '';
      targetMedia.style.marginRight = '';

      const blockTags = ['P','DIV','H1','H2','H3','H4','H5','H6','LI','BLOCKQUOTE'];
      let parentBlock = targetMedia.parentElement;
      while (parentBlock && parentBlock !== this.editorElement && !blockTags.includes(parentBlock.tagName)) {
        parentBlock = parentBlock.parentElement;
      }
      if (!parentBlock || parentBlock === this.editorElement) {
        const p = document.createElement('p');
        p.style.textAlign = alignment;
        targetMedia.parentNode.insertBefore(p, targetMedia);
        p.appendChild(targetMedia);
      } else {
        parentBlock.style.textAlign = alignment;
      }
      return;
    }

    let block = this.getClosestBlock();

    if (!block) {
      block = this._ensureBlockWrapper();
      if (!block) return;
    }

    if (block.matches && block.matches(MEDIA_SELECTOR)) {
      block.style.display = 'inline-block';
      block.style.marginLeft  = '';
      block.style.marginRight = '';
      const p = document.createElement('p');
      p.style.textAlign = alignment;
      block.parentNode.insertBefore(p, block);
      p.appendChild(block);
      return;
    }

    block.style.textAlign = alignment;
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
  }

  /** @private */
  _ensureMediaDeleteButton() {
    if (this._mediaDeleteButton) return this._mediaDeleteButton;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cre-media-delete-button';
    button.textContent = t('modal.delete') || 'Sil';
    button.title = t('modal.delete_media') || 'Medyayı sil';
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

    // Klavye kısayolları ve Silme İşlemi (Backspace/Delete)
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
