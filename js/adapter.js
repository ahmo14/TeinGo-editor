/**
 * adapter.js - Custom editor adapter that replaces content-rich-editor.js (TinyMCE wrapper).
 *
 * Exposes window.ContentRichEditor with the same API as the old TinyMCE wrapper so
 * all existing views (McqForm, DragAndDropForm, FillInTheBlanks, etc.) work without
 * modification to their JS call sites.
 *
 * ES Module — loaded as <script type="module"> from _Layout.cshtml AFTER the view's
 * @section Scripts. The queue proxy set up in _Layout.cshtml before @section Scripts
 * ensures calls made in DOMContentLoaded handlers are queued and replayed once this
 * module finishes loading.
 */
import { t, translateUI } from './i18n.js';
import { EditorCore }        from './editorCore.js';
import { Toolbar }           from './toolbar.js';
import { MenuBar }           from './menuBar.js';
import { AlertModal }        from './alertModal.js';
import { BoldCommand }       from './commands/boldCommand.js';
import { ItalicCommand }     from './commands/italicCommand.js';
import { SubSupCommand }     from './commands/subSupCommand.js';
import { UnderlineCommand }  from './commands/underlineCommand.js';
import { StrikethroughCommand } from './commands/strikethroughCommand.js';
import { BlockquoteCommand } from './commands/blockquoteCommand.js';
import { HrCommand }         from './commands/hrCommand.js';
import { FontFamilyCommand } from './commands/fontFamilyCommand.js';
import { FontSizeCommand }   from './commands/fontSizeCommand.js';
import { HeadingCommand }    from './commands/headingCommand.js';
import { ListCommand }       from './commands/listCommand.js';
import { AlignCommand }      from './commands/alignCommand.js';
import { ColorCommand }      from './commands/colorCommand.js';
import { LinkCommand }       from './commands/linkCommand.js';
import { ImageCommand }      from './commands/imageCommand.js';
import { FormulaCommand }    from './commands/formulaCommand.js';
import { TableCommand }      from './commands/tableCommand.js';
import { EmbedCommand }      from './commands/embedCommand.js';
import { SourceCommand }     from './commands/sourceCommand.js';
import { SpecialCharCommand } from './commands/specialCharCommand.js';
import { EmojiCommand }      from './commands/emojiCommand.js';
import { AnchorCommand }     from './commands/anchorCommand.js';
import { AccordionCommand }  from './commands/accordionCommand.js';
import { TemplateCommand }   from './commands/templateCommand.js';
import { FootnoteCommand }   from './commands/footnoteCommand.js';
import { CommentCommand }    from './commands/commentCommand.js';
import { TocCommand }        from './commands/tocCommand.js';
import { VideoCommand }      from './commands/videoCommand.js';
import { MergeTagCommand }   from './commands/mergeTagCommand.js';
import { getCleanHTML }      from './contentService.js';

// ── Instance registry ─────────────────────────────────────────────────────────
/** @type {Map<string, EditorInstance>} Maps textarea.id → EditorInstance */
const _instances = new Map();

/** Most recently focused instance — used by media panel insert */
let _lastFocused = null;

// ── Media panel state ─────────────────────────────────────────────────────────
const _mediaPanel = {
  initialized: false,
  fallbackEditorId: null,
  customInsertHandler: null,
};

// ── EditorInstance ────────────────────────────────────────────────────────────
/**
 * Wraps an active custom editor, exposing a TinyMCE-compatible surface so
 * existing view code (getContent, setContent, on, insertContent, focus) keeps working.
 */
class EditorInstance {
  constructor(core, editorDiv, textarea, wrapper) {
    this.core      = core;
    this.editorDiv = editorDiv;
    this.textarea  = textarea;
    this.wrapper   = wrapper;
  }

  getContent() {
    return getCleanHTML(this.editorDiv);
  }

  setContent(html) {
    this.editorDiv.innerHTML = html || '';
    this.textarea.value      = html || '';
  }

  /** Partial TinyMCE event API: maps event name strings to DOM 'input' */
  on(_events, handler) {
    this.editorDiv.addEventListener('input', handler);
  }

  /** Insert raw HTML at the current cursor position */
  insertContent(html) {
    this.core.restoreSelection();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const tpl   = document.createElement('template');
      tpl.innerHTML = html;
      range.deleteContents();
      range.insertNode(tpl.content.cloneNode(true));
      this.core.saveSelection();
    } else {
      this.editorDiv.insertAdjacentHTML('beforeend', html);
    }
  }

  focus() {
    this.editorDiv.focus();
  }
}

// ── Command & Toolbar setup ───────────────────────────────────────────────────
/** Registers all commands and populates the toolbar + menu bar for one editor instance. */
function setupEditor(core, toolbar, menuBar) {
  // Inline formatting
  const boldCmd          = new BoldCommand();
  const italicCmd        = new ItalicCommand();
  const underlineCmd     = new UnderlineCommand();
  const strikethroughCmd = new StrikethroughCommand();
  const subscriptCmd     = new SubSupCommand('SUB');
  const superscriptCmd   = new SubSupCommand('SUP');

  core.registerCommand('bold',          boldCmd);
  core.registerCommand('italic',        italicCmd);
  core.registerCommand('underline',     underlineCmd);
  core.registerCommand('strikethrough', strikethroughCmd);
  core.registerCommand('subscript',     subscriptCmd);
  core.registerCommand('superscript',   superscriptCmd);

  // Font family dropdown
  const genericFontCmd = new FontFamilyCommand('inherit', {
    name:  'fontFamilyMenu',
    icon:  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>',
    title: t('toolbar.fontFamily'),
  });
  const fontFamilyOptions = [
    { label: 'Arial',            icon: 'A', command: new FontFamilyCommand('Arial,Helvetica,sans-serif',          { name:'font-arial',    icon:'A', title:'Arial'           }) },
    { label: 'Calibri',          icon: 'C', command: new FontFamilyCommand('Calibri,sans-serif',                  { name:'font-calibri',  icon:'C', title:'Calibri'         }) },
    { label: 'Comic Sans MS',    icon: 'C', command: new FontFamilyCommand("'Comic Sans MS',cursive",             { name:'font-comic',    icon:'C', title:'Comic Sans MS'   }) },
    { label: 'Courier New',      icon: 'C', command: new FontFamilyCommand("'Courier New',Courier,monospace",     { name:'font-courier',  icon:'C', title:'Courier New'     }) },
    { label: 'Georgia',          icon: 'G', command: new FontFamilyCommand('Georgia,serif',                       { name:'font-georgia',  icon:'G', title:'Georgia'         }) },
    { label: 'Segoe UI',         icon: 'S', command: new FontFamilyCommand("'Segoe UI',sans-serif",               { name:'font-segoe',    icon:'S', title:'Segoe UI'        }) },
    { label: 'Tahoma',           icon: 'T', command: new FontFamilyCommand('Tahoma,Geneva,sans-serif',            { name:'font-tahoma',   icon:'T', title:'Tahoma'          }) },
    { label: 'Times New Roman',  icon: 'T', command: new FontFamilyCommand("'Times New Roman',Times,serif",       { name:'font-times',    icon:'T', title:'Times New Roman' }) },
    { label: 'Verdana',          icon: 'V', command: new FontFamilyCommand('Verdana,Geneva,sans-serif',           { name:'font-verdana',  icon:'V', title:'Verdana'         }) },
  ];

  // Font size dropdown
  const genericSizeCmd = new FontSizeCommand('inherit', {
    name:  'fontSizeMenu',
    icon:  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7V5h14v2"/><path d="M10 5v14"/><path d="M7 19h6"/><path d="M15 13V11h6v2"/><path d="M18 11v8"/><path d="M16 19h4"/></svg>',
    title: t('toolbar.fontSize'),
  });
  const mkSz = (pt) => ({ label: pt, icon: pt.replace('pt',''), command: new FontSizeCommand(pt, { name:`sz-${pt}`, icon:pt.replace('pt',''), title:pt }) });
  const fontSizeOptions = ['8pt','10pt','11pt','12pt','14pt','16pt','18pt','20pt','24pt','28pt','32pt','36pt','48pt','64pt'].map(mkSz);

  // Headings
  const pCmd  = new HeadingCommand('P');
  const h1Cmd = new HeadingCommand('H1');
  const h2Cmd = new HeadingCommand('H2');
  const h3Cmd = new HeadingCommand('H3');
  const h4Cmd = new HeadingCommand('H4');
  core.registerCommand('paragraph', pCmd);
  core.registerCommand('heading1',  h1Cmd);
  core.registerCommand('heading2',  h2Cmd);
  core.registerCommand('heading3',  h3Cmd);
  core.registerCommand('heading4',  h4Cmd);

  const genericHeadingCmd = new HeadingCommand('H2', {
    name:  'textStyleMenu',
    icon:  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h16"/><path d="M4 18V6"/><path d="M20 18V6"/></svg>',
    title: t('toolbar.paragraph'),
  });
  const blockquoteCmd = new BlockquoteCommand();
  core.registerCommand('blockquote', blockquoteCmd);
  const headingOptions = [
    { label: t('toolbar.paragraph'), icon: pCmd.icon,        command: pCmd        },
    { label: t('toolbar.h1'), icon: h1Cmd.icon,       command: h1Cmd       },
    { label: t('toolbar.h2'), icon: h2Cmd.icon,       command: h2Cmd       },
    { label: t('toolbar.h3'), icon: h3Cmd.icon,       command: h3Cmd       },
    { label: t('toolbar.h4'), icon: h4Cmd.icon,       command: h4Cmd       },
    { label: t('toolbar.blockquote'),   icon: blockquoteCmd.icon, command: blockquoteCmd },
  ];

  // Lists
  const ulCmd = new ListCommand('UL', 'disc');
  const olCmd = new ListCommand('OL', 'decimal');
  core.registerCommand('unorderedList', ulCmd);
  core.registerCommand('orderedList',   olCmd);
  const ulOptions = [
    { label: t('toolbar.ulDisc'), icon: '●', command: new ListCommand('UL','disc',       { name:'ul-disc',    icon:'●',  title:'Disc'    }) },
    { label: t('toolbar.ulCircle'),     icon: '○', command: new ListCommand('UL','circle',     { name:'ul-circle',  icon:'○',  title:'Circle'  }) },
    { label: t('toolbar.ulSquare'),       icon: '■', command: new ListCommand('UL','square',     { name:'ul-square',  icon:'■',  title:'Square'  }) },
  ];
  const olOptions = [
    { label: t('toolbar.olDecimal'),    icon: '1.', command: new ListCommand('OL','decimal',     { name:'ol-decimal', icon:'1.', title:'Sayısal' }) },
    { label: t('toolbar.olAlpha'), icon: 'a.', command: new ListCommand('OL','lower-alpha', { name:'ol-alpha',   icon:'a.', title:'Alpha'   }) },
    { label: t('toolbar.olRoman'),       icon: 'Ⅰ.', command: new ListCommand('OL','upper-roman', { name:'ol-roman',   icon:'Ⅰ.', title:'Roma'    }) },
  ];

  // Alignment
  const alignLCmd = new AlignCommand('left');
  const alignCCmd = new AlignCommand('center');
  const alignRCmd = new AlignCommand('right');
  const alignJCmd = new AlignCommand('justify');
  core.registerCommand('align-left',    alignLCmd);
  core.registerCommand('align-center',  alignCCmd);
  core.registerCommand('align-right',   alignRCmd);
  core.registerCommand('align-justify', alignJCmd);
  const alignOptions = [
    { label: t('toolbar.alignLeft'),     icon: alignLCmd.icon, command: alignLCmd },
    { label: t('toolbar.alignCenter'),   icon: alignCCmd.icon, command: alignCCmd },
    { label: t('toolbar.alignRight'),     icon: alignRCmd.icon, command: alignRCmd },
    { label: t('toolbar.alignJustify'), icon: alignJCmd.icon, command: alignJCmd },
  ];

  // Media, insert, utilities
  const colorCmd      = new ColorCommand();
  const linkCmd       = new LinkCommand();
  const imageCmd      = new ImageCommand();
  const formulaCmd    = new FormulaCommand();
  const tableCmd      = new TableCommand();
  const embedCmd      = new EmbedCommand();
  const sourceCmd     = new SourceCommand();
  const hrCmd         = new HrCommand();
  const specialCharCmd = new SpecialCharCommand();
  const emojiCmd      = new EmojiCommand();
  const anchorCmd     = new AnchorCommand();
  const accordionCmd  = new AccordionCommand();
  const templateCmd   = new TemplateCommand();

  core.registerCommand('foreColor',         colorCmd);
  core.registerCommand('insertLink',        linkCmd);
  core.registerCommand('insertImage',       imageCmd);
  core.registerCommand('insertFormula',     formulaCmd);
  core.registerCommand('insertTable',       tableCmd);
  core.registerCommand('embedMedia',        embedCmd);
  core.registerCommand('toggleSource',      sourceCmd);
  core.registerCommand('insertHr',          hrCmd);
  core.registerCommand('insertSpecialChar', specialCharCmd);
  core.registerCommand('insertEmoji',       emojiCmd);
  core.registerCommand('insertAnchor',      anchorCmd);
  core.registerCommand('insertAccordion',   accordionCmd);
  core.registerCommand('insertTemplate',    templateCmd);

  const footnoteCmd  = new FootnoteCommand();
  const commentCmd   = new CommentCommand();
  const tocCmd       = new TocCommand();
  const videoCmd     = new VideoCommand();
  const mergeTagCmd  = new MergeTagCommand();
  core.registerCommand('insertFootnote',  footnoteCmd);
  core.registerCommand('insertComment',   commentCmd);
  core.registerCommand('insertToc',       tocCmd);
  core.registerCommand('insertVideo',     videoCmd);
  core.registerCommand('insertMergeTag',  mergeTagCmd);

  // Build toolbar
  toolbar.addDropdownButton(genericFontCmd,    fontFamilyOptions);
  toolbar.addDropdownButton(genericSizeCmd,    fontSizeOptions);
  toolbar.addSeparator();
  toolbar.addButton(boldCmd);
  toolbar.addButton(italicCmd);
  toolbar.addButton(underlineCmd);
  toolbar.addButton(strikethroughCmd);
  toolbar.addButton(subscriptCmd);
  toolbar.addButton(superscriptCmd);
  toolbar.addSeparator();
  toolbar.addDropdownButton(genericHeadingCmd, headingOptions);
  toolbar.addSeparator();
  toolbar.addDropdownButton(ulCmd, ulOptions);
  toolbar.addDropdownButton(olCmd, olOptions);
  toolbar.addSeparator();
  toolbar.addDropdownButton(alignLCmd, alignOptions);
  toolbar.addSeparator();
  toolbar.addColorPicker(colorCmd);
  toolbar.addButton(linkCmd);
  toolbar.addSeparator();
  toolbar.addButton(imageCmd);
  toolbar.addButton(formulaCmd);
  toolbar.addButton(tableCmd);
  toolbar.addButton(embedCmd);
  toolbar.addButton(hrCmd);
  toolbar.addSeparator();
  toolbar.addButton(sourceCmd);

  // Build menu bar (Dosya, Düzenle, Görünüm, Ekle, Biçim)
  if (menuBar) {
    menuBar.addMenu(t('menu.file'), [
      { label: t('menu.newDoc'), icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>', action: (ed) => { ed.editorElement.innerHTML = ''; } },
      { label: t('menu.preview'), icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>', action: () => AlertModal.show(t('modal.info'), 'Bilgi') },
      'separator',
      { label: t('menu.print'), icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>', shortcut: 'Ctrl+P', action: () => window.print() },
    ]);

    menuBar.addMenu(t('menu.edit'), [
      { label: t('menu.undo'),  icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>', shortcut: 'Ctrl+Z', action: () => document.execCommand('undo') },
      { label: t('menu.redo'), icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>', shortcut: 'Ctrl+Y', action: () => document.execCommand('redo') },
      'separator',
      { label: t('menu.cut'),      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>', shortcut: 'Ctrl+X', action: () => document.execCommand('cut') },
      { label: t('menu.copy'),  icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>', shortcut: 'Ctrl+C', action: () => document.execCommand('copy') },
      { label: t('menu.paste'), icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>', shortcut: 'Ctrl+V', action: async () => { try { const t = await navigator.clipboard.readText(); document.execCommand('insertText', false, t); } catch { AlertModal.show(t('modal.info'), 'Bilgi'); } } },
      'separator',
      { label: t('menu.selectAll'), icon: '📝', shortcut: 'Ctrl+A', action: () => document.execCommand('selectAll') },
    ]);

    menuBar.addMenu(t('menu.view'), [
      { label: t('menu.sourceCode'), icon: sourceCmd.icon, commandName: 'toggleSource' },
    ]);

    menuBar.addMenu(t('menu.insert'), [
      { label: t('menu.image'),             icon: imageCmd.icon,       commandName: 'insertImage' },
      { label: t('menu.video'),             icon: videoCmd.icon,       commandName: 'insertVideo' },
      { label: t('menu.link'),   icon: linkCmd.icon,        commandName: 'insertLink',        shortcut: 'Ctrl+K' },
      { label: t('menu.media'),             icon: embedCmd.icon,       commandName: 'embedMedia' },
      { label: t('menu.comment'),          icon: commentCmd.icon,     commandName: 'insertComment',   shortcut: 'Ctrl+Alt+M' },
      { label: t('menu.template'),            icon: templateCmd.icon,    commandName: 'insertTemplate' },
      { label: t('menu.table'),               icon: tableCmd.icon,       commandName: 'insertTable' },
      { label: t('menu.accordion'),           icon: accordionCmd.icon,   commandName: 'insertAccordion' },
      { label: t('menu.formula'), icon: formulaCmd.icon,     commandName: 'insertFormula' },
      'separator',
      { label: t('menu.specialChar'),     icon: specialCharCmd.icon, commandName: 'insertSpecialChar' },
      { label: t('menu.emoji'),          icon: emojiCmd.icon,       commandName: 'insertEmoji' },
      { label: t('menu.hr'),         icon: hrCmd.icon,          commandName: 'insertHr' },
      'separator',
      { label: t('menu.anchor'),             icon: anchorCmd.icon,      commandName: 'insertAnchor' },
      { label: t('menu.toc'), icon: tocCmd.icon,          commandName: 'insertToc' },
      { label: t('menu.footnote'),         icon: footnoteCmd.icon,    commandName: 'insertFootnote' },
      'separator',
      { label: t('menu.mergeTag'), icon: mergeTagCmd.icon,    commandName: 'insertMergeTag' },
    ]);

    menuBar.addMenu(t('menu.format'), [
      { label: t('menu.bold'),                  icon: boldCmd.icon,          shortcut: 'Ctrl+B', commandName: 'bold' },
      { label: t('menu.italic'),                 icon: italicCmd.icon,        shortcut: 'Ctrl+I', commandName: 'italic' },
      { label: t('menu.underline'),            icon: underlineCmd.icon,     shortcut: 'Ctrl+U', commandName: 'underline' },
      { label: t('menu.strikethrough'),            icon: strikethroughCmd.icon,                     commandName: 'strikethrough' },
      'separator',
      { label: t('menu.superscript'),              icon: superscriptCmd.icon,                       commandName: 'superscript' },
      { label: t('menu.subscript'),              icon: subscriptCmd.icon,                         commandName: 'subscript' },
      'separator',
      { label: t('menu.clearFormat'), icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>', action: () => document.execCommand('removeFormat') },
    ]);
  }
}

// ── Create one editor instance ────────────────────────────────────────────────
function createInstance(textarea, options) {
  const wrapper = document.createElement('div');
  wrapper.className = 'cre-wrapper';

  const menuBarDiv = document.createElement('div');
  menuBarDiv.className = 'cre-menubar';

  const toolbarDiv = document.createElement('div');
  toolbarDiv.className = 'cre-toolbar-bar';

  const editorDiv = document.createElement('div');
  editorDiv.className = 'editor-content cre-editor-area';
  editorDiv.contentEditable = 'true';
  editorDiv.setAttribute('data-placeholder', t('placeholder'));
  editorDiv.setAttribute('spellcheck',       'true');
  editorDiv.setAttribute('role',             'textbox');
  editorDiv.setAttribute('aria-multiline',   'true');

  if (options && options.height) {
    editorDiv.style.minHeight = parseInt(options.height, 10) + 'px';
  }

  if (textarea.value) {
    editorDiv.innerHTML = textarea.value;
  }

  // Editör alt bilgi çubuğu (marka + açıklama)
  const footerBar = document.createElement('div');
  footerBar.className = 'cre-footer-bar';
  footerBar.style.cssText = 'display:flex;align-items:center;gap:6px;padding:5px 10px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;user-select:none;';
  footerBar.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none" style="flex-shrink:0;">
      <rect width="32" height="32" rx="7" fill="#2563eb"/>
      <text x="16" y="22" text-anchor="middle" fill="white" font-size="18" font-weight="bold" font-family="system-ui">T</text>
    </svg>
    <span>Metin, formül, görsel ve medya için <strong style="color:#64748b;">TeinGo</strong> zengin editörü kullanın.</span>
  `;

  wrapper.appendChild(menuBarDiv);
  wrapper.appendChild(toolbarDiv);
  wrapper.appendChild(editorDiv);
  wrapper.appendChild(footerBar);

  // TeinGo markasını menü çubuğunun başına ekle
  const brand = document.createElement('div');
  brand.id = 'editor-brand-' + (textarea.id || Math.random().toString(36).slice(2, 8));
  brand.style.cssText = 'display:flex;align-items:center;gap:6px;padding-right:12px;margin-right:4px;border-right:1px solid #d1d5db;user-select:none;flex-shrink:0;';
  brand.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="7" fill="#2563eb"/>
      <text x="16" y="22" text-anchor="middle" fill="white" font-size="18" font-weight="bold" font-family="system-ui">T</text>
    </svg>
    <span style="font-weight:700;font-size:14px;background:linear-gradient(135deg,#2563eb,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">TeinGo</span>
  `;
  menuBarDiv.prepend(brand);

  // Hide original textarea; mount wrapper right after it
  textarea.style.display = 'none';
  textarea.insertAdjacentElement('afterend', wrapper);

  // Host uygulamanın oluşturduğu eski açıklama metnini gizle
  // (ⓘ "Metin, formül, görsel ve medya için zengin editörü kullanın." gibi)
  const parent = textarea.parentElement;
  if (parent) {
    const hints = parent.querySelectorAll('.form-text, .text-muted, small');
    hints.forEach(el => {
      if (el.textContent.includes('zengin editör')) {
        el.style.display = 'none';
      }
    });
  }

  const core = new EditorCore(editorDiv);
  const tb   = new Toolbar(toolbarDiv, core);
  const mb   = new MenuBar(menuBarDiv, core);
  setupEditor(core, tb, mb);

  const instance = new EditorInstance(core, editorDiv, textarea, wrapper);

  editorDiv.addEventListener('focus', () => { _lastFocused = instance; });
  // Keep textarea in sync so a plain form submit still captures content
  editorDiv.addEventListener('input', () => { textarea.value = getCleanHTML(editorDiv); });

  return instance;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Initialises a rich editor on every <textarea> matched by selector.
 *
 * @param {string|HTMLElement} selector - CSS selector or element
 * @param {object}  [options]
 * @param {number}  [options.height]   - Minimum editor height in pixels
 * @returns {Promise<EditorInstance[]>}
 */
function initEditor(selector, options) {
  const targets =
    typeof selector === 'string'
      ? Array.from(document.querySelectorAll(selector))
      : (selector instanceof HTMLElement ? [selector] : []);

  const instances = targets
    .filter(el => el && el.tagName === 'TEXTAREA' && !_instances.has(el.id || ''))
    .map(el => {
      if (!el.id) {
        el.id = 'cre-' + Math.random().toString(36).slice(2, 10);
      }
      const inst = createInstance(el, options || {});
      _instances.set(el.id, inst);
      return inst;
    });

  return Promise.resolve(instances);
}

/**
 * Destroys the editor attached to a textarea with the given id.
 * The original textarea is restored and made visible.
 *
 * @param {string} id - textarea element id
 */
function removeEditor(id) {
  const inst = _instances.get(id);
  if (!inst) return;
  inst.wrapper.remove();
  inst.textarea.style.display = '';
  if (_lastFocused === inst) _lastFocused = null;
  _instances.delete(id);
}

/**
 * Syncs every active editor's contenteditable content back to its textarea.
 * Call before programmatic form.submit() to ensure values are captured.
 */
function triggerSave() {
  _instances.forEach(inst => {
    inst.textarea.value = getCleanHTML(inst.editorDiv);
  });
}

/**
 * Returns the EditorInstance for a textarea id, or null.
 * @param {string} id
 * @returns {EditorInstance|null}
 */
function get(id) {
  return _instances.get(id) || null;
}

/** Pass-through: clean/normalize an HTML string (no-op — cleanups happen on save). */
function normalizeHtml(html) {
  return html || '';
}

// ── Image import helpers ──────────────────────────────────────────────────────
function _readJsonResponse(response) {
  const ct = response.headers.get('content-type') || '';
  if (ct.toLowerCase().includes('application/json')) return response.json();
  return response.text().then(() => { throw new Error(`Sunucu hatası: ${response.status}`); });
}

function _normalizeSourceUrl(src) {
  const raw = String(src || '').trim();
  if (!raw) return '';
  if (raw.startsWith('//')) return location.protocol + raw;
  return raw;
}

function _isImportCandidate(src) {
  const s = _normalizeSourceUrl(src);
  if (!s) return false;
  if (s.startsWith('data:') || s.startsWith('blob:')) return true;
  if (s.startsWith('/') || s.startsWith('./') || s.startsWith('../')) return false;
  try { return new URL(s, location.origin).origin !== location.origin; } catch { return false; }
}

function _uploadImageBlob(blob, fileName) {
  const fd = new FormData();
  fd.append('file', blob, fileName || 'gorsel.png');
  return fetch('/Upload/Image', { method: 'POST', body: fd, credentials: 'same-origin' })
    .then(_readJsonResponse)
    .then(data => {
      if (data.location) return data.location;
      throw new Error((data && data.error) || 'Görsel yüklenemedi.');
    });
}

function _importRemoteImage(url) {
  return fetch('/Upload/ImportImage', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl: url }),
  })
    .then(_readJsonResponse)
    .then(data => {
      if (data.location) return data.location;
      throw new Error((data && data.error) || 'Harici görsel içe alınamadı.');
    });
}

function _importImageSource(src) {
  const s = _normalizeSourceUrl(src);
  if (s.startsWith('data:') || s.startsWith('blob:')) {
    return fetch(s).then(r => r.blob()).then(blob => _uploadImageBlob(blob, 'yapistirilan.png'));
  }
  return _importRemoteImage(s);
}

function _replaceImportedImagesInHtml(html) {
  const wrap = document.createElement('div');
  wrap.innerHTML = html || '';
  const imgs  = Array.from(wrap.querySelectorAll('img[src]'));
  if (!imgs.length) return Promise.resolve(html || '');
  const tasks = imgs
    .filter(img => _isImportCandidate(img.getAttribute('src')))
    .map(img => _importImageSource(img.getAttribute('src')).then(localUrl => {
      img.setAttribute('src', localUrl);
      img.removeAttribute('srcset');
    }));
  if (!tasks.length) return Promise.resolve(html || '');
  return Promise.all(tasks).then(() => wrap.innerHTML);
}

function _getFormInstances(form) {
  if (!form) return [];
  return Array.from(form.querySelectorAll('textarea[id]'))
    .map(ta => _instances.get(ta.id))
    .filter(Boolean);
}

/**
 * Syncs editors, imports any external/pasted images, then resolves.
 * Returns a Promise so callers can re-submit the form after the async work.
 *
 * @param {HTMLFormElement} form
 * @returns {Promise<void>}
 */
function prepareFormEditorsForSubmit(form) {
  triggerSave();
  if (!form) return Promise.resolve();
  const insts = _getFormInstances(form);
  if (!insts.length) return Promise.resolve();
  return insts.reduce((chain, inst) => {
    return chain.then(() => {
      const html = getCleanHTML(inst.editorDiv);
      return _replaceImportedImagesInHtml(html).then(updated => {
        if (updated !== html) {
          inst.editorDiv.innerHTML = updated;
          inst.textarea.value      = updated;
        }
      });
    });
  }, Promise.resolve());
}

// ── Media Panel ───────────────────────────────────────────────────────────────
function _buildMediaMarkup(url, kind) {
  if (kind === 'video') {
    return `<video controls playsinline preload="metadata" style="max-width:100%;height:auto;"><source src="${url}"></video><p></p>`;
  }
  return `<img src="${url}" style="max-width:100%;height:auto;">`;
}

function _resolveMediaKind(fileOrUrl) {
  if (!fileOrUrl) return 'image';
  if (typeof fileOrUrl === 'string') {
    return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(fileOrUrl) ? 'video' : 'image';
  }
  return String(fileOrUrl.type || '').toLowerCase().startsWith('video/') ? 'video' : 'image';
}

/**
 * Initialises the media upload side panel (same DOM contract as TinyMCE version).
 *
 * @param {object}   [options]
 * @param {string}   [options.fallbackEditorId]    - textarea id used when no editor is focused
 * @param {Function} [options.customInsertHandler] - override insert behaviour
 */
function initMediaPanel(options) {
  if (options) {
    if (options.fallbackEditorId)                            _mediaPanel.fallbackEditorId    = options.fallbackEditorId;
    if (typeof options.customInsertHandler === 'function')   _mediaPanel.customInsertHandler = options.customInsertHandler;
  }

  const panelToggle  = document.getElementById('mediaPanelToggle');
  const panelBody    = document.getElementById('mediaPanelBody');
  const panelChevron = document.getElementById('mediaPanelChevron');
  const fileInput    = document.getElementById('mediaFileInput');
  const status       = document.getElementById('mediaUploadStatus');
  const gallery      = document.getElementById('mediaGallery');

  if (!panelToggle || !panelBody || !fileInput || !status || !gallery) return;
  if (_mediaPanel.initialized) return;
  _mediaPanel.initialized = true;

  panelToggle.addEventListener('click', () => {
    const open = panelBody.style.display !== 'none';
    panelBody.style.display = open ? 'none' : 'block';
    if (panelChevron) panelChevron.className = open ? 'bi bi-chevron-down small' : 'bi bi-chevron-up small';
  });

  fileInput.addEventListener('change', () => {
    Array.from(fileInput.files || []).forEach(_uploadMediaFile);
    fileInput.value = '';
  });

  function _uploadMediaFile(file) {
    const kind = _resolveMediaKind(file);
    status.textContent = `Yükleniyor: ${file.name}…`;
    const fd = new FormData();
    fd.append('file', file);
    fetch(kind === 'video' ? '/Upload/Video' : '/Upload/Image', {
      method: 'POST', body: fd, credentials: 'same-origin',
    })
      .then(_readJsonResponse)
      .then(data => {
        if (data.location) {
          status.textContent = '✓ Yüklendi';
          setTimeout(() => { status.textContent = ''; }, 2000);
          _addToGallery(data.location, file.name, kind);
        } else {
          status.textContent = '✗ ' + ((data && data.error) || 'Yükleme başarısız.');
        }
      })
      .catch(err => { status.textContent = '✗ ' + ((err && err.message) || 'Yükleme başarısız.'); });
  }

  function _addToGallery(url, name, kind) {
    const emptyMsg = document.getElementById('mediaEmptyMsg');
    if (emptyMsg) emptyMsg.remove();
    const wrap = document.createElement('div');
    wrap.className  = 'position-relative';
    wrap.style.width = '110px';
    const preview = kind === 'video'
      ? '<div style="width:110px;height:68px;border-radius:6px;border:1.5px solid #e2e8f0;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:.74rem;font-weight:700;">Video</div>'
      : `<img src="${url}" alt="${name}" style="width:110px;height:68px;object-fit:cover;border-radius:6px;border:1.5px solid #e2e8f0;display:block;">`;
    wrap.innerHTML = [
      preview,
      '<div class="d-flex gap-1 mt-1">',
      `  <button type="button" class="btn btn-xs flex-fill py-0 media-insert-btn" style="font-size:.7rem;background:#f1f5f9;border:1px solid #e2e8f0;" data-url="${url}" data-media-kind="${kind}" title="Aktif editöre ekle"><i class="bi bi-plus-lg"></i> Ekle</button>`,
      `  <button type="button" class="btn btn-xs py-0 media-copy-btn" style="font-size:.7rem;background:#f1f5f9;border:1px solid #e2e8f0;" data-url="${url}" title="URL kopyala"><i class="bi bi-link-45deg"></i></button>`,
      '</div>',
    ].join('');
    gallery.appendChild(wrap);
    if (panelBody.style.display === 'none') {
      panelBody.style.display = 'block';
      if (panelChevron) panelChevron.className = 'bi bi-chevron-up small';
    }
  }

  function _insertIntoEditor(url, kind) {
    if (typeof _mediaPanel.customInsertHandler === 'function') {
      _mediaPanel.customInsertHandler(url, kind || 'image');
      return;
    }
    const inst = _lastFocused || _instances.get(_mediaPanel.fallbackEditorId);
    if (!inst) { alert("Önce bir metin alanına tıklayın, sonra Ekle'ye basın."); return; }
    inst.insertContent(_buildMediaMarkup(url, kind || 'image'));
    inst.focus();
  }

  function _copyUrl(url, button) {
    navigator.clipboard.writeText(location.origin + url).then(() => {
      const orig = button.innerHTML;
      button.innerHTML = '<i class="bi bi-check"></i>';
      button.style.color = '#22c55e';
      setTimeout(() => { button.innerHTML = orig; button.style.color = ''; }, 1800);
    });
  }

  gallery.addEventListener('click', e => {
    const ib = e.target.closest('.media-insert-btn');
    if (ib) { _insertIntoEditor(ib.dataset.url, ib.dataset.mediaKind || 'image'); return; }
    const cb = e.target.closest('.media-copy-btn');
    if (cb) _copyUrl(cb.dataset.url, cb);
  });

  ['dragenter', 'dragover'].forEach(ev => gallery.addEventListener(ev, e => { e.preventDefault(); panelBody.style.background = '#eff6ff'; }));
  ['dragleave', 'drop'].forEach(ev     => gallery.addEventListener(ev, e => { e.preventDefault(); panelBody.style.background = ''; }));
  gallery.addEventListener('drop', e => {
    Array.from((e.dataTransfer && e.dataTransfer.files) || []).forEach(_uploadMediaFile);
    panelBody.style.display = 'block';
    if (panelChevron) panelChevron.className = 'bi bi-chevron-up small';
  });
}

// ── Auto submit (imports external images before the form hits the server) ──────
function _bindAutoSubmit() {
  if (document.documentElement.dataset.richEditorImportBound === '1') return;
  document.documentElement.dataset.richEditorImportBound = '1';

  document.addEventListener('submit', e => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.getAttribute('data-rich-editor-manual-submit') === 'true') return;
    if (form.dataset.richEditorImportReady === '1') { delete form.dataset.richEditorImportReady; return; }

    const insts = _getFormInstances(form);
    if (!insts.length) return;

    e.preventDefault();
    const submitter = e.submitter || null;

    prepareFormEditorsForSubmit(form)
      .then(() => {
        form.dataset.richEditorImportReady = '1';
        setTimeout(() => {
          if (typeof form.requestSubmit === 'function') form.requestSubmit(submitter);
          else form.submit();
        }, 0);
      })
      .catch(err => {
        form.dataset.richEditorImportReady = '0';
        alert((err && err.message) || 'Görseller yüklenirken hata oluştu. Kaydetmeden önce tekrar deneyin.');
      });
  }, true);
}

// ── Wire up to the queue proxy set in _Layout.cshtml ─────────────────────────
const _impl = {
  initEditor,
  removeEditor,
  triggerSave,
  get,
  normalizeHtml,
  prepareHtml: normalizeHtml,
  initMediaPanel,
  prepareFormEditorsForSubmit,
};

if (window.ContentRichEditor && typeof window.ContentRichEditor._setImpl === 'function') {
  window.ContentRichEditor._setImpl(_impl);
} else {
  window.ContentRichEditor = _impl;
}

_bindAutoSubmit();
