import { BaseCommand } from './baseCommand.js';

export class FontSizeCommand extends BaseCommand {
  /**
   * @param {string} size - CSS font-size değeri (ör: '12px', '1.5em')
   * @param {object} options - BaseCommand seçenekleri
   */
  constructor(size, options) {
    super(options);
    this.size = size;
  }

  execute(editorCore) {
    editorCore.applyInlineStyle('fontSize', this.size);
  }
}
