import { BaseCommand } from './baseCommand.js';
import { openMediaPicker } from '../mediaPickerModal.js';

const tx = (source) => window.EditorUiLocalization?.translate(source) || source;

export class VideoCommand extends BaseCommand {
  constructor() {
    super({
      name:     'insertVideo',
      icon:     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>',
      title:    tx('Video Ekle'),
      shortcut: null,
      tag:      'VIDEO',
    });
  }

  execute(editor) {
    editor.saveSelection();

    openMediaPicker('video').then(result => {
      if (!result) {
        editor.restoreSelection();
        return;
      }
      editor.restoreSelection();
      this._insertVideo(editor, result.location);
    });
  }

  _insertVideo(editor, src) {
    const video = document.createElement('video');
    video.src          = src;
    video.controls     = true;
    video.playsInline  = true;
    video.preload      = 'metadata';
    video.style.maxWidth     = '100%';
    video.style.borderRadius = '8px';
    video.style.margin       = '1em 0';
    video.style.display      = 'block';

    editor.insertNodeAtCursor(video);
    editor.setCursorAfter(video);
  }
}
