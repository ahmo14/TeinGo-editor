import { BaseCommand } from './baseCommand.js';

const tx = (source) => window.EditorUiLocalization?.translate(source) || source;

/**
 * AccordionCommand - Metne açılır-kapanır akordiyon (details/summary) ekler.
 */
export class AccordionCommand extends BaseCommand {
  constructor() {
    super({
      name: 'insertAccordion',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/><path d="M8 12l4 4 4-4"/></svg>',
      title: tx('Akordiyon Ekle'),
    });
  }

  /**
   * @param {import('../editorCore.js').EditorCore} editor
   */
  async execute(editor) {
    const details = document.createElement('details');
    details.className = 'editor-accordion';
    details.open = true; // İçini düzenleyebilmeleri için başlangıçta açık olsun

    const summary = document.createElement('summary');
    summary.textContent = tx('Akordiyon Başlığı (Değiştirmek için tıklayın)');

    const content = document.createElement('div');
    content.className = 'accordion-content';
    content.innerHTML = '<p>' + tx('Akordiyon içeriğini buraya yazın...') + '</p>';

    details.appendChild(summary);
    details.appendChild(content);

    editor.insertNodeAtCursor(details);

    // Akordiyonun sonrasına boş bir paragraf ekleyelim ki imleç sıkışmasın
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    details.after(p);
  }
}
