/**
 * App - Editörün giriş noktası
 * 
 * EditorCore, Toolbar ve komutları birleştirir.
 * Yeni komut eklemek için:
 * 1. commands/ klasöründe BaseCommand'dan extend eden yeni sınıf oluştur
 * 2. Bu dosyada import et, registerCommand ve addButton çağır
 */
import { t, translateUI } from './i18n.js';
import { EditorCore } from './editorCore.js';
import { Toolbar } from './toolbar.js';
import { MenuBar } from './menuBar.js';
import { BoldCommand } from './commands/boldCommand.js';
import { ItalicCommand } from './commands/italicCommand.js';
import { SubSupCommand } from './commands/subSupCommand.js';
import { UnderlineCommand } from './commands/underlineCommand.js';
import { StrikethroughCommand } from './commands/strikethroughCommand.js';
import { BlockquoteCommand } from './commands/blockquoteCommand.js';
import { HrCommand } from './commands/hrCommand.js';
import { FontFamilyCommand } from './commands/fontFamilyCommand.js';
import { FontSizeCommand } from './commands/fontSizeCommand.js';
import { HeadingCommand } from './commands/headingCommand.js';
import { ListCommand } from './commands/listCommand.js';
import { AlignCommand } from './commands/alignCommand.js';
import { ColorCommand } from './commands/colorCommand.js';
import { LinkCommand } from './commands/linkCommand.js';
import { ImageCommand } from './commands/imageCommand.js';
import { FormulaCommand } from './commands/formulaCommand.js';
import { TableCommand } from './commands/tableCommand.js';
import { EmbedCommand } from './commands/embedCommand.js';
import { SourceCommand } from './commands/sourceCommand.js';
import { SpecialCharCommand } from './commands/specialCharCommand.js';
import { EmojiCommand } from './commands/emojiCommand.js';
import { AnchorCommand } from './commands/anchorCommand.js';
import { AccordionCommand } from './commands/accordionCommand.js';
import { TemplateCommand } from './commands/templateCommand.js';
import { VideoCommand } from './commands/videoCommand.js';
import { CommentCommand } from './commands/commentCommand.js';
import { TocCommand } from './commands/tocCommand.js';
import { FootnoteCommand } from './commands/footnoteCommand.js';
import { MergeTagCommand } from './commands/mergeTagCommand.js';
import { AlertModal } from './alertModal.js';
import { buildPayload, saveContent } from './contentService.js';

export function initEditor(userOptions = {}) {
  const config = {
    editorId: 'editor',
    toolbarId: 'toolbar',
    menuBarId: 'menubar',
    showMenuBar: true,
    showToolbar: true,
    menus: ['file', 'edit', 'view', 'insert', 'format'],
    toolbarGroups: ['font', 'inline', 'headings', 'lists', 'align', 'colors', 'media', 'source'],
    ...userOptions
  };

  const editorElement = document.getElementById(config.editorId);
  const toolbarElement = document.getElementById(config.toolbarId);
  const menuBarElement = document.getElementById(config.menuBarId);

  if (!editorElement) {
    console.error('Editör DOM elementi bulunamadı.');
    return null;
  }

  translateUI();
  const editor = new EditorCore(editorElement);
  
  let toolbar = null;
  if (config.showToolbar && toolbarElement) {
    toolbarElement.style.display = 'flex';
    toolbar = new Toolbar(toolbarElement, editor);
  } else if (toolbarElement) {
    toolbarElement.style.display = 'none';
  }

  // ════════════════════════════════════════════
  // TeinGo MARKASI
  // ════════════════════════════════════════════
  if (config.showBrand !== false && !document.getElementById('editor-brand')) {
    const brand = document.createElement('div');
    brand.id = 'editor-brand';
    brand.style.cssText = 'display:flex;align-items:center;gap:6px;padding-right:12px;margin-right:4px;border-right:1px solid #d1d5db;user-select:none;flex-shrink:0;';
    brand.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="7" fill="#2563eb"/>
        <text x="16" y="22" text-anchor="middle" fill="white" font-size="18" font-weight="bold" font-family="system-ui">T</text>
      </svg>
      <span style="font-weight:700;font-size:14px;background:linear-gradient(135deg,#2563eb,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">TeinGo</span>
    `;

    // Öncelik sırası: menubar > toolbar > editörün üstüne yeni çubuk
    if (menuBarElement) {
      menuBarElement.prepend(brand);
    } else if (toolbarElement) {
      toolbarElement.prepend(brand);
    } else {
      // Hiçbiri yoksa editörün hemen üstüne bağımsız bir marka çubuğu oluştur
      const brandBar = document.createElement('div');
      brandBar.style.cssText = 'display:flex;align-items:center;padding:6px 10px;background:#f8fafc;border-bottom:1px solid #e2e8f0;';
      brandBar.appendChild(brand);
      // border-right'ı kaldır çünkü yanında başka element yok
      brand.style.borderRight = 'none';
      brand.style.paddingRight = '0';
      brand.style.marginRight = '0';
      editorElement.parentNode.insertBefore(brandBar, editorElement);
    }
  }

  let menuBar = null;
  if (config.showMenuBar && menuBarElement) {
    menuBarElement.style.display = 'flex';
    menuBarElement.style.alignItems = 'center';
    menuBar = new MenuBar(menuBarElement, editor);
  } else if (menuBarElement) {
    menuBarElement.style.display = 'none';
  }

  // ════════════════════════════════════════════
  // KOMUTLARI OLUŞTUR VE KAYDET
  // ════════════════════════════════════════════

  // ── Inline Biçimlendirme ──
  const boldCommand = new BoldCommand();
  const italicCommand = new ItalicCommand();
  const underlineCommand = new UnderlineCommand();
  const strikethroughCommand = new StrikethroughCommand();
  const subscriptCommand = new SubSupCommand('SUB');
  const superscriptCommand = new SubSupCommand('SUP');

  editor.registerCommand('bold', boldCommand);
  editor.registerCommand('italic', italicCommand);
  editor.registerCommand('underline', underlineCommand);
  editor.registerCommand('strikethrough', strikethroughCommand);
  editor.registerCommand('subscript', subscriptCommand);
  editor.registerCommand('superscript', superscriptCommand);

  // ── Yazı Tipi ve Boyutu ──
  const genericFontFamilyCmd = new FontFamilyCommand('inherit', {
    name: 'fontFamilyMenu',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>',
    title: t('toolbar.fontFamily'),
  });

  const fontFamilyOptions = [
    { label: '<span style="font-family: Arial, Helvetica, sans-serif">Arial</span>', icon: 'A', command: new FontFamilyCommand('Arial, Helvetica, sans-serif', { name: 'font-arial', icon: 'A', title: 'Arial' }) },
    { label: '<span style="font-family: \'Arial Black\', Gadget, sans-serif">Arial Black</span>', icon: 'A', command: new FontFamilyCommand("'Arial Black', Gadget, sans-serif", { name: 'font-arial-black', icon: 'A', title: 'Arial Black' }) },
    { label: '<span style="font-family: Calibri, sans-serif">Calibri</span>', icon: 'C', command: new FontFamilyCommand("Calibri, sans-serif", { name: 'font-calibri', icon: 'C', title: 'Calibri' }) },
    { label: '<span style="font-family: \'Comic Sans MS\', cursive, sans-serif">Comic Sans MS</span>', icon: 'C', command: new FontFamilyCommand("'Comic Sans MS', cursive, sans-serif", { name: 'font-comic', icon: 'C', title: 'Comic Sans MS' }) },
    { label: '<span style="font-family: \'Courier New\', Courier, monospace">Courier New</span>', icon: 'C', command: new FontFamilyCommand("'Courier New', Courier, monospace", { name: 'font-courier', icon: 'C', title: 'Courier New' }) },
    { label: '<span style="font-family: Georgia, serif">Georgia</span>', icon: 'G', command: new FontFamilyCommand("Georgia, serif", { name: 'font-georgia', icon: 'G', title: 'Georgia' }) },
    { label: '<span style="font-family: Helvetica, sans-serif">Helvetica</span>', icon: 'H', command: new FontFamilyCommand("Helvetica, sans-serif", { name: 'font-helvetica', icon: 'H', title: 'Helvetica' }) },
    { label: '<span style="font-family: Impact, Charcoal, sans-serif">Impact</span>', icon: 'I', command: new FontFamilyCommand("Impact, Charcoal, sans-serif", { name: 'font-impact', icon: 'I', title: 'Impact' }) },
    { label: '<span style="font-family: \'Noto Sans\', sans-serif">Noto Sans</span>', icon: 'N', command: new FontFamilyCommand("'Noto Sans', sans-serif", { name: 'font-noto', icon: 'N', title: 'Noto Sans' }) },
    { label: '<span style="font-family: \'Open Sans\', sans-serif">Open Sans</span>', icon: 'O', command: new FontFamilyCommand("'Open Sans', sans-serif", { name: 'font-open-sans', icon: 'O', title: 'Open Sans' }) },
    { label: '<span style="font-family: \'PT Sans\', sans-serif">PT Sans</span>', icon: 'P', command: new FontFamilyCommand("'PT Sans', sans-serif", { name: 'font-pt-sans', icon: 'P', title: 'PT Sans' }) },
    { label: '<span style="font-family: Roboto, sans-serif">Roboto</span>', icon: 'R', command: new FontFamilyCommand("Roboto, sans-serif", { name: 'font-roboto', icon: 'R', title: 'Roboto' }) },
    { label: '<span style="font-family: \'Segoe UI\', sans-serif">Segoe UI</span>', icon: 'S', command: new FontFamilyCommand("'Segoe UI', sans-serif", { name: 'font-segoe', icon: 'S', title: 'Segoe UI' }) },
    { label: '<span style="font-family: Symbol, serif">Symbol</span>', icon: 'S', command: new FontFamilyCommand("Symbol, serif", { name: 'font-symbol', icon: 'S', title: 'Symbol' }) },
    { label: '<span style="font-family: Tahoma, Geneva, sans-serif">Tahoma</span>', icon: 'T', command: new FontFamilyCommand("Tahoma, Geneva, sans-serif", { name: 'font-tahoma', icon: 'T', title: 'Tahoma' }) },
    { label: '<span style="font-family: \'Times New Roman\', Times, serif">Times New Roman</span>', icon: 'T', command: new FontFamilyCommand("'Times New Roman', Times, serif", { name: 'font-times', icon: 'T', title: 'Times New Roman' }) },
    { label: '<span style="font-family: \'Trebuchet MS\', Helvetica, sans-serif">Trebuchet MS</span>', icon: 'T', command: new FontFamilyCommand("'Trebuchet MS', Helvetica, sans-serif", { name: 'font-trebuchet', icon: 'T', title: 'Trebuchet MS' }) },
    { label: '<span style="font-family: Verdana, Geneva, sans-serif">Verdana</span>', icon: 'V', command: new FontFamilyCommand("Verdana, Geneva, sans-serif", { name: 'font-verdana', icon: 'V', title: 'Verdana' }) },
  ];

  const genericFontSizeCmd = new FontSizeCommand('inherit', {
    name: 'fontSizeMenu',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5h14v2"/><path d="M10 5v14"/><path d="M7 19h6"/><path d="M15 13V11h6v2"/><path d="M18 11v8"/><path d="M16 19h4"/></svg>',
    title: t('toolbar.fontSize'),
  });

  const fontSizeOptions = [
    { label: '6pt', icon: '6', command: new FontSizeCommand('6pt', { name: 'size-6pt', icon: '6', title: '6pt' }) },
    { label: '8pt', icon: '8', command: new FontSizeCommand('8pt', { name: 'size-8pt', icon: '8', title: '8pt' }) },
    { label: '10pt', icon: '10', command: new FontSizeCommand('10pt', { name: 'size-10pt', icon: '10', title: '10pt' }) },
    { label: '11pt', icon: '11', command: new FontSizeCommand('11pt', { name: 'size-11pt', icon: '11', title: '11pt' }) },
    { label: '12pt', icon: '12', command: new FontSizeCommand('12pt', { name: 'size-12pt', icon: '12', title: '12pt' }) },
    { label: '14pt', icon: '14', command: new FontSizeCommand('14pt', { name: 'size-14pt', icon: '14', title: '14pt' }) },
    { label: '16pt', icon: '16', command: new FontSizeCommand('16pt', { name: 'size-16pt', icon: '16', title: '16pt' }) },
    { label: '18pt', icon: '18', command: new FontSizeCommand('18pt', { name: 'size-18pt', icon: '18', title: '18pt' }) },
    { label: '20pt', icon: '20', command: new FontSizeCommand('20pt', { name: 'size-20pt', icon: '20', title: '20pt' }) },
    { label: '22pt', icon: '22', command: new FontSizeCommand('22pt', { name: 'size-22pt', icon: '22', title: '22pt' }) },
    { label: '24pt', icon: '24', command: new FontSizeCommand('24pt', { name: 'size-24pt', icon: '24', title: '24pt' }) },
    { label: '28pt', icon: '28', command: new FontSizeCommand('28pt', { name: 'size-28pt', icon: '28', title: '28pt' }) },
    { label: '32pt', icon: '32', command: new FontSizeCommand('32pt', { name: 'size-32pt', icon: '32', title: '32pt' }) },
    { label: '36pt', icon: '36', command: new FontSizeCommand('36pt', { name: 'size-36pt', icon: '36', title: '36pt' }) },
    { label: '48pt', icon: '48', command: new FontSizeCommand('48pt', { name: 'size-48pt', icon: '48', title: '48pt' }) },
    { label: '64pt', icon: '64', command: new FontSizeCommand('64pt', { name: 'size-64pt', icon: '64', title: '64pt' }) },
    { label: '72pt', icon: '72', command: new FontSizeCommand('72pt', { name: 'size-72pt', icon: '72', title: '72pt' }) },
    { label: '96pt', icon: '96', command: new FontSizeCommand('96pt', { name: 'size-96pt', icon: '96', title: '96pt' }) },
    { label: '108pt', icon: '108', command: new FontSizeCommand('108pt', { name: 'size-108pt', icon: '108', title: '108pt' }) },
  ];

  // ── Başlıklar ve Metin Stilleri ──
  const pCommand = new HeadingCommand('P');
  const h1Command = new HeadingCommand('H1');
  const h2Command = new HeadingCommand('H2');
  const h3Command = new HeadingCommand('H3');
  const h4Command = new HeadingCommand('H4');
  const h5Command = new HeadingCommand('H5');
  const h6Command = new HeadingCommand('H6');

  editor.registerCommand('paragraph', pCommand);
  editor.registerCommand('heading1', h1Command);
  editor.registerCommand('heading2', h2Command);
  editor.registerCommand('heading3', h3Command);
  editor.registerCommand('heading4', h4Command);
  editor.registerCommand('heading5', h5Command);
  editor.registerCommand('heading6', h6Command);

  // Metin stili için ana dropdown butonu olarak kullanılacak jenerik komut
  const genericHeadingCmd = new HeadingCommand('H2', {
    name: 'textStyleMenu',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M4 18V6"/><path d="M20 18V6"/></svg>',
    title: t('toolbar.paragraph'),
  });

  const blockquoteCommand = new BlockquoteCommand();
  editor.registerCommand('blockquote', blockquoteCommand);

  const headingOptions = [
    { label: t('toolbar.paragraph'), icon: pCommand.icon, command: pCommand },
    { label: t('toolbar.h1'), icon: h1Command.icon, command: h1Command },
    { label: t('toolbar.h2'), icon: h2Command.icon, command: h2Command },
    { label: t('toolbar.h3'), icon: h3Command.icon, command: h3Command },
    { label: t('toolbar.h4'), icon: h4Command.icon, command: h4Command },
    { label: t('toolbar.h5'), icon: h5Command.icon, command: h5Command },
    { label: t('toolbar.h6'), icon: h6Command.icon, command: h6Command },
    { label: t('toolbar.blockquote'), icon: blockquoteCommand.icon, command: blockquoteCommand },
  ];

  // ── Listeler ──
  const ulCommand = new ListCommand('UL', 'disc');
  const olCommand = new ListCommand('OL', 'decimal');

  editor.registerCommand('unorderedList', ulCommand);
  editor.registerCommand('orderedList', olCommand);

  const ulOptions = [
    {
      label: t('toolbar.ulDisc'),
      icon: '●',
      command: new ListCommand('UL', 'disc', { name: 'ul-disc', icon: '●', title: t('toolbar.ulDisc') }),
    },
    {
      label: t('toolbar.ulCircle'),
      icon: '○',
      command: new ListCommand('UL', 'circle', { name: 'ul-circle', icon: '○', title: t('toolbar.ulCircle') }),
    },
    {
      label: t('toolbar.ulSquare'),
      icon: '■',
      command: new ListCommand('UL', 'square', { name: 'ul-square', icon: '■', title: t('toolbar.ulSquare') }),
    },
  ];

  const olOptions = [
    {
      label: t('toolbar.olDecimal'),
      icon: '1.',
      command: new ListCommand('OL', 'decimal', { name: 'ol-decimal', icon: '1.', title: t('toolbar.olDecimal') }),
    },
    {
      label: t('toolbar.olAlpha'),
      icon: 'a.',
      command: new ListCommand('OL', 'lower-alpha', { name: 'ol-lower-alpha', icon: 'a.', title: t('toolbar.olAlpha') }),
    },
    {
      label: t('toolbar.olRoman'),
      icon: 'Ⅰ.',
      command: new ListCommand('OL', 'upper-roman', { name: 'ol-upper-roman', icon: 'Ⅰ.', title: t('toolbar.olRoman') }),
    },
  ];

  // ── Hizalama ──
  const alignLeftCmd = new AlignCommand('left');
  const alignCenterCmd = new AlignCommand('center');
  const alignRightCmd = new AlignCommand('right');
  const alignJustifyCmd = new AlignCommand('justify');

  editor.registerCommand('align-left', alignLeftCmd);
  editor.registerCommand('align-center', alignCenterCmd);
  editor.registerCommand('align-right', alignRightCmd);
  editor.registerCommand('align-justify', alignJustifyCmd);

  const alignOptions = [
    { label: t('toolbar.alignLeft'), icon: alignLeftCmd.icon, command: alignLeftCmd },
    { label: t('toolbar.alignCenter'), icon: alignCenterCmd.icon, command: alignCenterCmd },
    { label: t('toolbar.alignRight'), icon: alignRightCmd.icon, command: alignRightCmd },
    { label: t('toolbar.alignJustify'), icon: alignJustifyCmd.icon, command: alignJustifyCmd },
  ];

  // ── Renk ──
  const colorCommand = new ColorCommand();
  editor.registerCommand('foreColor', colorCommand);

  // ── Bağlantı ──
  const linkCommand = new LinkCommand();
  editor.registerCommand('insertLink', linkCommand);

  // ── Medya ve Eklemeler ──
  const imageCommand = new ImageCommand();
  const formulaCommand = new FormulaCommand();
  const tableCommand = new TableCommand();
  const embedCommand = new EmbedCommand();
  const sourceCommand = new SourceCommand();
  const hrCommand = new HrCommand();
  const specialCharCommand = new SpecialCharCommand();
  const emojiCommand = new EmojiCommand();
  const anchorCommand = new AnchorCommand();
  const accordionCommand = new AccordionCommand();
  const templateCommand = new TemplateCommand();

  editor.registerCommand('insertImage', imageCommand);
  editor.registerCommand('insertHr', hrCommand);
  editor.registerCommand('insertFormula', formulaCommand);
  editor.registerCommand('insertTable', tableCommand);
  editor.registerCommand('embedMedia', embedCommand);
  editor.registerCommand('toggleSource', sourceCommand);
  editor.registerCommand('insertSpecialChar', specialCharCommand);
  editor.registerCommand('insertEmoji', emojiCommand);
  editor.registerCommand('insertAnchor', anchorCommand);
  editor.registerCommand('insertAccordion', accordionCommand);
  editor.registerCommand('insertTemplate', templateCommand);

  const videoCommand = new VideoCommand();
  const commentCommand = new CommentCommand();
  const tocCommand = new TocCommand();
  const footnoteCommand = new FootnoteCommand();
  const mergeTagCommand = new MergeTagCommand();

  editor.registerCommand('insertVideo', videoCommand);
  editor.registerCommand('insertComment', commentCommand);
  editor.registerCommand('insertToc', tocCommand);
  editor.registerCommand('insertFootnote', footnoteCommand);
  editor.registerCommand('insertMergeTag', mergeTagCommand);

  // ════════════════════════════════════════════
  // ÜST MENÜYÜ (MENU BAR) OLUŞTUR
  // ════════════════════════════════════════════

  if (menuBar) {
    // DOSYA MENÜSÜ
    if (config.menus.includes('file')) {
      menuBar.addMenu(t('menu.file'), [
        { label: t('menu.newDoc'), icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>', action: (ed) => ed.editorElement.innerHTML = '' },
        { label: t('menu.preview'), icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>', action: () => AlertModal.show(t('modal.preview_soon') || 'Önizleme özelliği yakında eklenecek!', t('modal.info')) },
        'separator',
        { label: t('menu.print'), icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>', shortcut: 'Ctrl+P', action: () => window.print() }
      ]);
    }

    // DÜZENLE MENÜSÜ
    if (config.menus.includes('edit')) {
      menuBar.addMenu(t('menu.edit'), [
        { label: t('menu.undo'), icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>', shortcut: 'Ctrl+Z', action: () => document.execCommand('undo') },
        { label: t('menu.redo'), icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>', shortcut: 'Ctrl+Y', action: () => document.execCommand('redo') },
        'separator',
        { label: t('menu.cut'), icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>', shortcut: 'Ctrl+X', action: () => document.execCommand('cut') },
        { label: t('menu.copy'), icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>', shortcut: 'Ctrl+C', action: () => document.execCommand('copy') },
        { label: t('menu.paste'), icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>', shortcut: 'Ctrl+V', action: async (ed) => {
          try { const text = await navigator.clipboard.readText(); document.execCommand('insertText', false, text); } catch (e) { AlertModal.show(t('modal.paste_error') || 'Tarayıcı güvenlik politikası nedeniyle yapıştırmak için klavyeden Ctrl+V kullanın.', t('modal.info')); }
        }},
        'separator',
        { label: t('menu.selectAll'), icon: '📝', shortcut: 'Ctrl+A', action: () => document.execCommand('selectAll') }
      ]);
    }

    // GÖRÜNÜM MENÜSÜ
    if (config.menus.includes('view')) {
      menuBar.addMenu(t('menu.view'), [
        { label: t('menu.sourceCode'), icon: sourceCommand.icon, commandName: 'toggleSource' },
      ]);
    }

    // EKLE MENÜSÜ
    if (config.menus.includes('insert')) {
      menuBar.addMenu(t('menu.insert'), [
        { label: t('menu.image'), icon: imageCommand.icon, commandName: 'insertImage' },
        { label: t('menu.video'), icon: videoCommand.icon, commandName: 'insertVideo' },
        { label: t('menu.link'), icon: linkCommand.icon, commandName: 'insertLink', shortcut: 'Ctrl+K' },
        { label: t('menu.media'), icon: embedCommand.icon, commandName: 'embedMedia' },
        { label: t('menu.comment'), icon: commentCommand.icon, shortcut: 'Ctrl+Alt+M', commandName: 'insertComment' },
        { label: t('menu.template'), icon: templateCommand.icon, commandName: 'insertTemplate' },
        { label: t('menu.table'), icon: tableCommand.icon, commandName: 'insertTable' },
        { label: t('menu.accordion'), icon: accordionCommand.icon, commandName: 'insertAccordion' },
        { label: t('menu.formula'), icon: formulaCommand.icon, commandName: 'insertFormula' },
        'separator',
        { label: t('menu.specialChar'), icon: specialCharCommand.icon, commandName: 'insertSpecialChar' },
        { label: t('menu.emoji'), icon: emojiCommand.icon, commandName: 'insertEmoji' },
        { label: t('menu.hr'), icon: hrCommand.icon, commandName: 'insertHr' },
        'separator',
        { label: t('menu.anchor'), icon: anchorCommand.icon, commandName: 'insertAnchor' },
        { label: t('menu.toc'), icon: tocCommand.icon, commandName: 'insertToc' },
        { label: t('menu.footnote'), icon: footnoteCommand.icon, commandName: 'insertFootnote' },
        'separator',
        { label: t('menu.mergeTag'), icon: mergeTagCommand.icon, commandName: 'insertMergeTag' },
      ]);
    }

    // BİÇİM MENÜSÜ
    if (config.menus.includes('format')) {
      menuBar.addMenu(t('menu.format'), [
        { label: t('menu.bold'), icon: boldCommand.icon, shortcut: 'Ctrl+B', commandName: 'bold' },
        { label: t('menu.italic'), icon: italicCommand.icon, shortcut: 'Ctrl+I', commandName: 'italic' },
        { label: t('menu.underline'), icon: underlineCommand.icon, shortcut: 'Ctrl+U', commandName: 'underline' },
        { label: t('menu.strikethrough'), icon: strikethroughCommand.icon, commandName: 'strikethrough' },
        'separator',
        { label: t('menu.superscript'), icon: superscriptCommand.icon, commandName: 'superscript' },
        { label: t('menu.subscript'), icon: subscriptCommand.icon, commandName: 'subscript' },
        'separator',
        { label: t('menu.clearFormat'), icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>', action: () => document.execCommand('removeFormat') }
      ]);
    }
  }

  // ════════════════════════════════════════════
  // ARAÇ ÇUBUĞUNU (TOOLBAR) OLUŞTUR
  // ════════════════════════════════════════════

  if (toolbar) {
    // Grup 0: Yazı Tipi ve Boyutu
    if (config.toolbarGroups.includes('font')) {
      toolbar.addDropdownButton(genericFontFamilyCmd, fontFamilyOptions);
      toolbar.addDropdownButton(genericFontSizeCmd, fontSizeOptions);
      toolbar.addSeparator();
    }

    // Grup 1: Inline biçimlendirme
    if (config.toolbarGroups.includes('inline')) {
      toolbar.addButton(boldCommand);
      toolbar.addButton(italicCommand);
      toolbar.addButton(underlineCommand);
      toolbar.addButton(strikethroughCommand);
      toolbar.addButton(subscriptCommand);
      toolbar.addButton(superscriptCommand);
      toolbar.addSeparator();
    }

    // Grup 2: Başlıklar ve Metin Stilleri
    if (config.toolbarGroups.includes('headings')) {
      toolbar.addDropdownButton(genericHeadingCmd, headingOptions);
      toolbar.addSeparator();
    }

    // Grup 3: Listeler
    if (config.toolbarGroups.includes('lists')) {
      toolbar.addDropdownButton(ulCommand, ulOptions);
      toolbar.addDropdownButton(olCommand, olOptions);
      toolbar.addSeparator();
    }

    // Grup 4: Hizalama
    if (config.toolbarGroups.includes('align')) {
      toolbar.addDropdownButton(alignLeftCmd, alignOptions);
      toolbar.addSeparator();
    }

    // Grup 5: Renk + Bağlantı
    if (config.toolbarGroups.includes('colors')) {
      toolbar.addColorPicker(colorCommand);
      toolbar.addButton(linkCommand);
      toolbar.addSeparator();
    }

    // Grup 6: Medya, Tablo ve Formül
    if (config.toolbarGroups.includes('media')) {
      toolbar.addButton(imageCommand);
      toolbar.addButton(formulaCommand);
      toolbar.addButton(tableCommand);
      toolbar.addButton(embedCommand);
      toolbar.addButton(hrCommand);
      toolbar.addSeparator();
    }

    // Grup 7: Kaynak Kodu
    if (config.toolbarGroups.includes('source')) {
      toolbar.addButton(sourceCommand);
    }
  }

  // Word Count (Kelime Sayacı) Dinleyicisi
  const wordCountEl = document.getElementById('word-count');
  if (wordCountEl) {
    const updateWordCount = () => {
      const text = editorElement.innerText || '';
      const chars = text.length;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      wordCountEl.textContent = t('wordCount', {words, chars});
    };
    editorElement.addEventListener('input', updateWordCount);
    updateWordCount(); // ilk açılışta
  }

  // Editöre başlangıç odaklanması
  editorElement.focus();

  // ════════════════════════════════════════════
  // İÇERİĞİ KAYDET BUTONU
  // ════════════════════════════════════════════

  const saveBtn = document.getElementById('save-btn');
  const saveStatus = document.getElementById('save-status');

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      // Kaynak mod aktifse önce görsel moda dön
      if (sourceCommand.isSourceMode) {
        editor.executeCommand('toggleSource');
      }

      // ── Loading durumu ──
      saveBtn.disabled = true;
      saveBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        ${t('saving')}
      `;

      try {
        // Payload oluştur
        const payload = buildPayload(editorElement);

        // API’ye gönder
        const result = await saveContent(payload);

        // ── Başarı geri bildirimi ──
        if (result.success) {
          showSaveStatus(saveStatus, '✓ ' + result.message, 'success');
        } else {
          showSaveStatus(saveStatus, '✗ ' + result.message, 'error');
        }

      } catch (error) {
        console.error('İçerik kaydetme hatası:', error);
        showSaveStatus(saveStatus, '✗ ' + (t('modal.unexpected_error') || 'Beklenmeyen hata: ') + error.message, 'error');

      } finally {
        // Butonu eski haline döndür
        saveBtn.disabled = false;
        saveBtn.innerHTML = `
          <svg class="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
          ${t('save')}
        `;
      }
    });
  }

  return editor;
}

/**
 * Kaydetme sonrası durum mesajını gösterir ve 3 saniye sonra gizler.
 * @param {HTMLElement|null} statusEl - Durum mesajı elementi
 * @param {string} message - Gösterilecek mesaj
 * @param {'success'|'error'} type - Mesaj tipi
 */
function showSaveStatus(statusEl, message, type) {
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.className = [
    'mt-2 px-4 py-2 rounded-lg text-sm font-medium text-center',
    'transition-all duration-300',
    type === 'success'
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : 'bg-red-50 text-red-700 border border-red-200',
  ].join(' ');
  statusEl.style.display = 'block';

  // 3 saniye sonra gizle
  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 3000);
}
