import { BaseCommand } from './baseCommand.js';

/**
 * SubSupCommand - Seçili metni alt simge (<sub>) veya üst simge (<sup>) yapar.
 *
 * Inline toggle mantığı Bold/Italic ile aynı:
 * - Seçili metin tag içinde değilse → tag ile sar
 * - Zaten tag içindeyse → tag'ı kaldır (toggle)
 *
 * Fizik: H₂O, CO₂
 * Matematik: x², aₙ
 */
export class SubSupCommand extends BaseCommand {
  /**
   * @param {'SUB'|'SUP'} type
   */
  constructor(type) {
    const isSup = type.toUpperCase() === 'SUP';

    super({
      name: isSup ? 'superscript' : 'subscript',
      icon: isSup
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m4 19 8-8"/><path d="m12 19-8-8"/><path d="M20 12h-4c0-1.5.44-2 1.5-2.5S20 8.33 20 7.5C20 6.67 19.33 6 18.5 6 17.67 6 17 6.67 17 7.5"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m4 5 8 8"/><path d="m12 5-8 8"/><path d="M20 19h-4c0-1.5.44-2 1.5-2.5S20 15.33 20 14.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5"/></svg>',
      title: isSup ? 'Üst Simge' : 'Alt Simge',
      shortcut: null,
      tag: type.toUpperCase(),
    });

    /** @type {string} */
    this.tagName = type.toUpperCase();
  }

  /**
   * @param {import('../editorCore.js').EditorCore} editor
   */
  execute(editor) {
    editor.toggleInlineTag(this.tagName);
  }
}
