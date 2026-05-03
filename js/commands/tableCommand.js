import { BaseCommand } from './baseCommand.js';

/**
 * TableCommand - İmlecin bulunduğu yere 3x3 HTML tablosu ekler.
 *
 * Tablo yapısı:
 * - <table> → contenteditable="false" DEĞİL (hücrelere yazılabilmeli)
 * - <tr><td> yapısı, her hücrede <br> (tarayıcıların boş hücrelere imleç koyması için)
 * - Temel kenarlık ve padding inline style ile
 *
 * insertNodeAtCursor() ile Range API kullanılarak imleç noktasına yerleştirilir.
 */
export class TableCommand extends BaseCommand {
  constructor() {
    super({
      name: 'insertTable',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>',
      title: 'Tablo Ekle (3×3)',
      shortcut: null,
      tag: null,
    });
  }

  /**
   * @param {import('../editorCore.js').EditorCore} editor
   */
  execute(editor) {
    const table = this._createTable(3, 3);
    editor.insertNodeAtCursor(table);
  }

  /**
   * Belirtilen boyutta HTML tablosu oluşturur
   * @private
   * @param {number} rows
   * @param {number} cols
   * @returns {HTMLTableElement}
   */
  _createTable(rows, cols) {
    const table = document.createElement('table');

    // Neden inline style: contenteditable içinde class güvenilir değil
    table.style.cssText = [
      'width: 100%',
      'border-collapse: collapse',
      'margin: 0.75em 0',
      'table-layout: fixed',
    ].join('; ');

    for (let r = 0; r < rows; r++) {
      const tr = document.createElement('tr');

      for (let c = 0; c < cols; c++) {
        const td = document.createElement('td');
        td.style.cssText = [
          'border: 1px solid #d1d5db',
          'padding: 8px 12px',
          'min-height: 1.5em',
          'vertical-align: top',
        ].join('; ');

        // Boş hücrede imleç konabilmesi için <br> ekle
        td.appendChild(document.createElement('br'));
        tr.appendChild(td);
      }

      table.appendChild(tr);
    }

    return table;
  }
}
