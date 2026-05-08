import { BaseCommand } from './baseCommand.js';
import { openMediaPicker } from '../mediaPickerModal.js';

const tx = (source) => window.EditorUiLocalization?.translate(source) || source;

export class ImageCommand extends BaseCommand {
  constructor() {
    super({
      name:     'insertImage',
      icon:     '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
      title:    tx('Resim Ekle'),
      shortcut: null,
      tag:      null,
    });
  }

  execute(editor) {
    editor.saveSelection();

    openMediaPicker('image').then(result => {
      if (!result) {
        editor.restoreSelection();
        return;
      }
      editor.restoreSelection();
      this._insertImage(editor, result.location);
    });
  }

  _insertImage(editor, src) {
    const img = document.createElement('img');
    img.src              = src;
    img.loading          = 'lazy';
    img.contentEditable  = 'false';
    img.style.maxWidth   = '100%';
    img.style.height     = 'auto';
    img.style.borderRadius = '4px';
    img.style.margin     = '0.5em 0';
    img.style.display    = 'block';

    editor.insertNodeAtCursor(img);
    editor.setCursorAfter(img);
  }
}
