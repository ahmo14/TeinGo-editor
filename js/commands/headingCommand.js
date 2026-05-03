import { BaseCommand } from './baseCommand.js';

/**
 * HeadingCommand - İmlecin bulunduğu bloğu başlık etiketine dönüştürür veya geri alır.
 *
 * Çalışma mantığı:
 * - İmleç bir <p>, <div> veya text node üzerindeyse → hedef başlık tag'ına (H2/H3) dönüştürür
 * - İmleç zaten hedef başlık tag'ı içindeyse → <p> ye geri döndürür (toggle)
 * - İmleç farklı bir başlık tag'ı içindeyse → hedef tag'a dönüştürür
 */
export class HeadingCommand extends BaseCommand {
  /**
   * @param {'H1'|'H2'|'H3'|'H4'|'H5'|'H6'|'P'} level - Başlık veya paragraf seviyesi
   * @param {object} [overrides] - İkon ve başlık gibi değerleri geçersiz kılmak için
   */
  constructor(level, overrides = {}) {
    const levelNumber = level.replace('H', '');
    const isHeading = level.startsWith('H');

    // Varsayılan ikonlar
    let defaultIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M4 18V6"/><path d="M20 18V6"/></svg>'; // Generic H
    
    if (level === 'H1') {
      defaultIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="m17 12 3-2v8"/></svg>';
    } else if (level === 'H2') {
      defaultIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/></svg>';
    } else if (level === 'H3') {
      defaultIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2"/><path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2c-1.2-.9-3.2-1.2-4 .5"/></svg>';
    } else if (level === 'P') {
      defaultIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h12"/><path d="M3 9h12"/><path d="M3 13h12"/><path d="M3 17h12"/></svg>'; // Generic Type/Pilcrow
    }

    super({
      name: overrides.name || (isHeading ? `heading${levelNumber}` : 'paragraph'),
      icon: overrides.icon || defaultIcon,
      title: overrides.title || (isHeading ? `Başlık ${levelNumber}` : 'Normal Metin'),
      shortcut: null,
      tag: level.toUpperCase(),
    });

    /** @type {string} */
    this.level = level.toUpperCase();
  }

  /**
   * @param {import('../editorCore.js').EditorCore} editor
   */
  execute(editor) {
    editor.toggleBlockTag(this.level);
  }
}
