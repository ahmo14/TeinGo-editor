import { BaseCommand } from './baseCommand.js';

export class FontFamilyCommand extends BaseCommand {
  /**
   * @param {string} family - CSS font-family değeri (ör: 'Arial, sans-serif')
   * @param {object} options - BaseCommand seçenekleri
   */
  constructor(family, options) {
    super(options);
    this.family = family;
  }

  execute(editorCore) {
    editorCore.applyInlineStyle('fontFamily', this.family);
  }
}
