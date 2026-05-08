import { BaseCommand } from './baseCommand.js';

const tx = (source) => window.EditorUiLocalization?.translate(source) || source;

/**
 * ListCommand - İmlecin bulunduğu bloğu sıralı veya sırasız listeye dönüştürür.
 *
 * Çalışma mantığı:
 * - Normal blok → <ul><li>...</li></ul> veya <ol><li>...</li></ol>
 * - Zaten aynı liste tipindeyse → listeyi kaldır, <p> yap (toggle)
 * - Farklı liste tipindeyse → liste tipini değiştir (UL↔OL)
 * - styleType parametresiyle CSS list-style-type inline olarak uygulanır
 */
export class ListCommand extends BaseCommand {
  /**
   * @param {'UL'|'OL'} listType - Liste tipi
   * @param {string} [styleType] - CSS list-style-type değeri (ör: 'disc', 'lower-alpha')
   * @param {object} [overrides] - İkon ve başlık gibi varsayılan değerleri geçersiz kılmak için
   */
  constructor(listType, styleType, overrides = {}) {
    const isOrdered = listType.toUpperCase() === 'OL';
    const defaultName = isOrdered ? 'orderedList' : 'unorderedList';
    const defaultIcon = isOrdered
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>';
    const defaultTitle = isOrdered ? 'Sıralı Liste' : 'Madde İmli Liste';

    super({
      name: overrides.name || defaultName,
      icon: overrides.icon || defaultIcon,
      title: tx(overrides.title || defaultTitle),
      shortcut: overrides.shortcut || null,
      tag: listType.toUpperCase(),
    });

    /** @type {string} */
    this.listType = listType.toUpperCase();

    /** @type {string|undefined} */
    this.styleType = styleType;
  }

  /**
   * @param {import('../editorCore.js').EditorCore} editor
   */
  execute(editor) {
    editor.toggleList(this.listType, this.styleType);
  }
}
