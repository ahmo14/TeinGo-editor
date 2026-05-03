import { BaseCommand } from './baseCommand.js';

export class UnderlineCommand extends BaseCommand {
  constructor() {
    super({
      name: 'underline',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>',
      title: 'Altı Çizili',
      tag: 'U'
    });
  }

  execute(editorCore) {
    editorCore.toggleInlineTag('U');
  }
}
