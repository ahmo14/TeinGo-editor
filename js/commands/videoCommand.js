import { BaseCommand } from './baseCommand.js';
import { PromptModal } from '../promptModal.js';
import { t } from '../i18n.js';

export class VideoCommand extends BaseCommand {
  constructor() {
    super({
      name: 'insertVideo',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>',
      title: t('menu.video') || 'Video Ekle',
      shortcut: null,
      tag: 'VIDEO',
    });
  }

  async execute(editor) {
    editor.saveSelection();
    const promptText = t('modal.videoUrlPrompt') !== 'modal.videoUrlPrompt' ? t('modal.videoUrlPrompt') : 'Video URL\'sini girin (MP4, WebM vb.):';
    const url = await PromptModal.show(promptText, '', t('menu.video') || 'Video Ekle');
    if (!url) {
      editor.restoreSelection();
      return;
    }

    editor.restoreSelection();
    
    try {
      const video = document.createElement('video');
      video.src = url;
      video.controls = true;
      video.contentEditable = 'false'; // <-- Burası eklendi
      video.style.maxWidth = '100%';
      video.style.borderRadius = '8px';
      video.style.margin = '1em 0';
      video.style.display = 'inline-block';

      editor.insertNodeAtCursor(video);
    } catch (e) {
      console.error('Video ekleme hatası:', e);
    }
  }
}
