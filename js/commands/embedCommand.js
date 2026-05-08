import { BaseCommand } from './baseCommand.js';
import { AlertModal } from '../alertModal.js';
import { PromptModal } from '../promptModal.js';

const tx = (source) => window.EditorUiLocalization?.translate(source) || source;

/**
 * EmbedCommand - YouTube/Vimeo veya genel iframe embed kodu ekler.
 *
 * Desteklenen girdi formatları:
 * 1. Tam iframe kodu: <iframe src="..." ...></iframe>
 * 2. YouTube URL: https://www.youtube.com/watch?v=xxxxx
 * 3. YouTube kısa URL: https://youtu.be/xxxxx
 *
 * Güvenlik:
 * - Sadece bilinen domainlerden iframe kabul edilir (YouTube, Vimeo)
 * - Genel iframe kodlarında src domaini kontrol edilir
 * - XSS koruması: doğrudan innerHTML kullanılmaz, DOM API ile oluşturulur
 */

/** @type {string[]} İzin verilen iframe kaynak domainleri */
const ALLOWED_DOMAINS = [
  'youtube.com',
  'www.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'youtu.be',
  'player.vimeo.com',
  'vimeo.com',
  'dailymotion.com',
  'www.dailymotion.com',
];

export class EmbedCommand extends BaseCommand {
  constructor() {
    super({
      name: 'embedMedia',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
      title: tx('Video/Medya Göm'),
      shortcut: null,
      tag: null,
    });
  }

  /**
   * @param {import('../editorCore.js').EditorCore} editor
   */
  async execute(editor) {
    editor.saveSelection();

    const input = await PromptModal.show(
      tx('YouTube URL veya iframe embed kodu yapıştırın:'),
      'https://www.youtube.com/watch?v=',
      tx('Video/Medya Ekle')
    );

    if (!input || input === 'https://www.youtube.com/watch?v=') return;

    const embedUrl = this._resolveEmbedUrl(input.trim());

    if (!embedUrl) {
      await AlertModal.show(tx('Geçersiz veya desteklenmeyen embed kaynağı.\n\nDesteklenen: YouTube, Vimeo, Dailymotion'), tx('Hata'));
      return;
    }

    // Güvenli iframe wrapper oluştur
    const wrapper = this._createEmbedWrapper(embedUrl);

    editor.restoreSelection();
    editor.insertNodeAtCursor(wrapper);
  }

  /**
   * Kullanıcı girdisinden embed URL'si çıkarır.
   * @private
   * @param {string} input - URL veya iframe kodu
   * @returns {string|null} - Geçerli embed URL'si veya null
   */
  _resolveEmbedUrl(input) {
    // 1. YouTube watch URL → embed URL
    const ytWatch = input.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
    if (ytWatch) {
      return `https://www.youtube-nocookie.com/embed/${ytWatch[1]}`;
    }

    // 2. Zaten embed URL ise
    const ytEmbed = input.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})/);
    if (ytEmbed) {
      return `https://www.youtube-nocookie.com/embed/${ytEmbed[1]}`;
    }

    // 3. Vimeo URL
    const vimeo = input.match(/vimeo\.com\/(\d+)/);
    if (vimeo) {
      return `https://player.vimeo.com/video/${vimeo[1]}`;
    }

    // 4. iframe kodu parse et → src attribute'unu çıkar
    if (input.includes('<iframe')) {
      const srcMatch = input.match(/src=["'](https?:\/\/[^"']+)["']/);
      if (srcMatch) {
        const url = srcMatch[1];
        // Domain güvenlik kontrolü
        if (this._isDomainAllowed(url)) {
          return url;
        }
      }
      return null;
    }

    // 5. Doğrudan URL — domain kontrolü
    if (input.startsWith('https://') && this._isDomainAllowed(input)) {
      return input;
    }

    return null;
  }

  /**
   * URL'nin izin verilen domainlerden olup olmadığını kontrol eder
   * @private
   * @param {string} url
   * @returns {boolean}
   */
  _isDomainAllowed(url) {
    try {
      const hostname = new URL(url).hostname;
      return ALLOWED_DOMAINS.some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
      );
    } catch {
      return false;
    }
  }

  /**
   * Güvenli iframe wrapper element oluşturur
   * @private
   * @param {string} embedUrl
   * @returns {HTMLElement}
   */
  _createEmbedWrapper(embedUrl) {
    // Dış wrapper — contenteditable="false" ile korumalı
    const wrapper = document.createElement('div');
    wrapper.contentEditable = 'false';
    wrapper.className = 'embed-wrapper';
    wrapper.style.cssText = [
      'position: relative',
      'width: 100%',
      'margin: 0.75em 0',
      'border-radius: 8px',
      'overflow: hidden',
      'background: #000',
    ].join('; ');

    // 16:9 aspect ratio container
    const ratioBox = document.createElement('div');
    ratioBox.style.cssText = [
      'position: relative',
      'width: 100%',
      'padding-bottom: 56.25%', // 16:9 oran
    ].join('; ');

    // iframe — DOM API ile oluşturuldu, innerHTML yok (XSS koruması)
    const iframe = document.createElement('iframe');
    iframe.src = embedUrl;
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    iframe.setAttribute('loading', 'lazy');
    iframe.style.cssText = [
      'position: absolute',
      'top: 0',
      'left: 0',
      'width: 100%',
      'height: 100%',
      'border: none',
    ].join('; ');

    ratioBox.appendChild(iframe);
    wrapper.appendChild(ratioBox);

    return wrapper;
  }
}
