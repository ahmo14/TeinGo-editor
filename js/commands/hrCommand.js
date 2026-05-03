import { BaseCommand } from './baseCommand.js';

export class HrCommand extends BaseCommand {
  constructor() {
    super({
      name: 'insertHr',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>',
      title: 'Yatay Çizgi Ekle',
      tag: 'HR'
    });
  }

  execute(editorCore) {
    const hr = document.createElement('hr');
    // CSS class ekleyebiliriz (isteğe bağlı)
    hr.className = 'my-4 border-t-2 border-slate-200';
    editorCore.insertNodeAtCursor(hr);
  }
}
