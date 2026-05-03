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

    /** @type {Set<(commandName: string) => void>} */
    this._listeners = new Set();

    // Medya elemanlarının native selection (mavi overlay) almasını engellemek için global stil
    if (!document.getElementById('editor-core-styles')) {
      const style = document.createElement('style');
      style.id = 'editor-core-styles';
      style.innerHTML = `
        .editor-media-selected::selection { background: transparent !important; }
        .editor-media-selected::-moz-selection { background: transparent !important; }
        img.editor-media-selected, video.editor-media-selected { 
          user-select: none !important; 
          -webkit-user-select: none !important; 
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
   * Editör içindeki aktif Range'i döndürür
   * Eğer seçim editör dışındaysa null döner
   * @returns {Range|null}
   */
  getRange() {
    const selection = this.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);

    // Range editör sınırları içinde mi?
    if (!this.editorElement.contains(range.commonAncestorContainer)) {
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
    }
  }

  /**
   * Kaydedilmiş seçimi geri yükler
   */
  restoreSelection() {
    if (this._savedRange) {
      const selection = this.getSelection();
      selection.removeAllRanges();
      selection.addRange(this._savedRange);
    }
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

    const selection = this.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // Seçim yoksa editörün sonuna ekle (fallback)
      this.editorElement.appendChild(node);
      return;
    }

    const range = selection.getRangeAt(0);

    // Seçili metin varsa sil
    range.deleteContents();

    // Node'u yerleştir
    range.insertNode(node);

    // İmleci node'un sonrasına taşı
    this.setCursorAfter(node);
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
    let targetMedia = this.editorElement.querySelector('.editor-media-selected');
    
    // Eğer custom seçili medya yoksa normal selection'a bak
    if (!targetMedia) {
      const selection = this.getSelection();
      if (selection && selection.rangeCount > 0) {
        const node = selection.anchorNode;
        if (node && node.nodeType === Node.ELEMENT_NODE && ['IMG', 'VIDEO'].includes(node.tagName)) {
          targetMedia = node;
        } else if (node && node.nodeType === Node.ELEMENT_NODE && node === this.editorElement) {
          const child = node.childNodes[selection.anchorOffset];
          if (child && child.nodeType === Node.ELEMENT_NODE && ['IMG', 'VIDEO'].includes(child.tagName)) {
            targetMedia = child;
          }
        }
      }
    }

    let block = this.getClosestBlock();

    // Özel durum: Custom Media seçiliyse block bulunamayabilir, çünkü selection sıfırlanmıştır.
    // O yüzden block'u atlayıp doğrudan targetMedia üzerinden işlem yapmalıyız.

    if (!block && !targetMedia) {
      block = this._ensureBlockWrapper();
      if (!block) return;
    }

    if (targetMedia || (block && ['IMG', 'VIDEO'].includes(block.tagName))) {
      const media = targetMedia || block;
      media.style.display = 'block';
      if (alignment === 'center') {
        media.style.marginLeft = 'auto';
        media.style.marginRight = 'auto';
      } else if (alignment === 'right') {
        media.style.marginLeft = 'auto';
        media.style.marginRight = '0';
      } else {
        media.style.marginLeft = '0';
        media.style.marginRight = 'auto';
      }
      return;
    }

    // LI içindeyse hem LI'yı hem parent listeyi hizala
    if (block && block.tagName === 'LI') {
      block.style.textAlign = alignment;
    } else if (block) {
      block.style.textAlign = alignment;
    }
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
  // Event Listeners
  // ──────────────────────────────────────────────

  /** @private */
  _setupEventListeners() {
    // Medya dışına tıklandığında seçimi kaydet ve medyaları temizle
    this.editorElement.addEventListener('mouseup', (e) => {
      // Eğer bir medyaya tıklandıysa mouseup işlemini atla (click'te hallediyoruz)
      if (e.target && (['IMG', 'VIDEO'].includes(e.target.tagName) || e.target.classList.contains('embed-wrapper'))) {
        return;
      }

      // Medya dışı bir yere tıklandıysa, eski medya seçimlerini temizle
      this.editorElement.querySelectorAll('.editor-media-selected').forEach(m => {
        m.style.outline = 'none';
        m.style.boxShadow = 'none';
        m.classList.remove('editor-media-selected');
      });

      this.saveSelection();
      this._notifyListeners('selectionchange');
    });

    this.editorElement.addEventListener('keyup', () => {
      this.saveSelection();
      this._notifyListeners('selectionchange');
    });

    // Medya elemanlarına tıklandığında (Custom Object Selection)
    this.editorElement.addEventListener('click', (e) => {
      if (e.target && (['IMG', 'VIDEO'].includes(e.target.tagName) || e.target.classList.contains('embed-wrapper'))) {
         // Diğer medyaların seçimlerini temizle
         this.editorElement.querySelectorAll('.editor-media-selected').forEach(m => {
           m.style.outline = 'none';
           m.style.boxShadow = 'none';
           m.classList.remove('editor-media-selected');
         });

         // Tıklanan medyayı "seçili" yap (sadece görsel olarak)
         e.target.style.outline = '3px solid #3b82f6';
         e.target.style.outlineOffset = '2px';
         e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.2)';
         e.target.classList.add('editor-media-selected');

         // Tarayıcının o kocaman mavi filteri basmasını engellemek için metin seçimini temizliyoruz!
         const selection = this.getSelection();
         if (selection) selection.removeAllRanges();

         this._notifyListeners('selectionchange');
      }
    });

    // Klavye kısayolları ve Silme İşlemi (Backspace/Delete)
    this.editorElement.addEventListener('keydown', (e) => {
      // Özel medya seçiliyse ve silmeye basıldıysa:
      if (e.key === 'Backspace' || e.key === 'Delete') {
        const selectedMedia = this.editorElement.querySelector('.editor-media-selected');
        if (selectedMedia) {
          e.preventDefault();
          selectedMedia.remove();
          this._notifyListeners('selectionchange');
          return;
        }
      }

      this.commands.forEach((command, name) => {
        if (command.shortcut && this._matchShortcut(e, command.shortcut)) {
          e.preventDefault();
          this.executeCommand(name);
        }
      });
    });
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
