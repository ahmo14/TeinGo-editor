import { BaseCommand } from './baseCommand.js';

/**
 * ItalicCommand - Seçili metni <em> ile sarar veya kaldırır
 */
export class ItalicCommand extends BaseCommand {
  constructor() {
    super({
      name: 'italic',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>',
      title: 'İtalik (Ctrl+I)',
      shortcut: 'ctrl+i',
      tag: 'EM',
    });
  }

  /**
   * @param {import('../editorCore.js').EditorCore} editor
   */
  execute(editor) {
    editor.toggleInlineTag('EM');
  }
}
