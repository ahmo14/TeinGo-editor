import { BaseCommand } from './baseCommand.js';

/**
 * AlignCommand - İmlecin bulunduğu blok elementinin metin hizalamasını değiştirir.
 *
 * CSS text-align ile çalışır, DOM yapısını değiştirmez.
 * Desteklenen değerler: left, center, right, justify
 */

const ALIGN_CONFIG = {
  left: {
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>',
    title: 'Sola Yasla',
  },
  center: {
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/></svg>',
    title: 'Ortala',
  },
  right: {
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>',
    title: 'Sağa Yasla',
  },
  justify: {
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="3" y1="14" x2="21" y2="14"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    title: 'İki Yana Yasla',
  },
};

export class AlignCommand extends BaseCommand {
  /**
   * @param {'left'|'center'|'right'|'justify'} alignment
   */
  constructor(alignment) {
    const config = ALIGN_CONFIG[alignment];
    if (!config) {
      throw new Error(`Bilinmeyen hizalama değeri: ${alignment}`);
    }

    super({
      name: `align-${alignment}`,
      icon: config.icon,
      title: config.title,
      shortcut: null,
      tag: null, // Hizalama tag bazlı aktif durum takibi yapmaz
    });

    /** @type {string} */
    this.alignment = alignment;
  }

  /**
   * @param {import('../editorCore.js').EditorCore} editor
   */
  execute(editor) {
    editor.setBlockAlignment(this.alignment);
  }
}
