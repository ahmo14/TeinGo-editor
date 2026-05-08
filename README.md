<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome">
</p>

# ✏️ TeinGo Editor

Lightweight, modular, and dependency-free WYSIWYG editor built with vanilla JavaScript and the modern Selection/Range API. No `document.execCommand` — fully future-proof.

## ✨ Features

- **Zero Dependencies** — No frameworks, no build tools. Just drop in and go.
- **Modular Command Architecture** — Every formatting action is an isolated, pluggable command module.
- **Modern API** — Built entirely on `Selection` / `Range` API. No deprecated `execCommand`.
- **Rich Toolbar** — Bold, Italic, Underline, Strikethrough, Subscript, Superscript, Headings, Font Family, Font Size, Text/Background Color, Alignment, Lists, Blockquote, Links, Images, Videos, Audio, Tables, Embeds, Special Characters, Emojis, Formulas (KaTeX), Accordion, Table of Contents, Merge Tags, Footnotes, Comments, Anchors, Templates, and Source View.
- **Media Picker** — Image and video insertion through upload or gallery flows when the host app provides the upload endpoints.
- **Multi-Language (i18n)** — Built-in localization with 11 languages: 🇹🇷 TR, 🇬🇧 EN, 🇩🇪 DE, 🇫🇷 FR, 🇪🇸 ES, 🇮🇹 IT, 🇵🇱 PL, 🇨🇿 CS, 🇭🇺 HU, 🇷🇴 RO, 🇧🇬 BG.
- **Adapter Integration** — Easily embed into any application via the `adapter.js` interface.
- **Custom Modals** — Prompt, Alert, Emoji picker, Special Character picker — all custom-built, no browser dialogs.

## 🚀 Quick Start

### Option 1: Direct Usage

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
    <div id="menubar"></div>
    <div id="toolbar"></div>
    <div id="editor" contenteditable="true"></div>

    <script type="module">
        import { initEditor } from './js/app.js';
        document.addEventListener('DOMContentLoaded', () => initEditor());
    </script>
</body>
</html>
```

### Option 2: Adapter Integration

```javascript
import { TeinGoAdapter } from './js/adapter.js';

const editor = new TeinGoAdapter('#my-container', {
    language: 'en',
    height: 500
});

// Get content
const html = editor.getContent();

// Set content
editor.setContent('<p>Hello World</p>');
```

## 📁 Project Structure

```
editor/
├── css/
│   └── editor.css          # Editor integration styles
├── index.html              # Demo page
├── js/
│   ├── app.js              # Main application entry
│   ├── editorCore.js       # Core editor engine
│   ├── adapter.js          # External integration adapter
│   ├── toolbar.js          # Toolbar renderer
│   ├── menuBar.js          # Menu bar renderer
│   ├── contentService.js   # Content management service
│   ├── i18n.js             # Internationalization module
│   ├── imageUploader.js    # Image upload handler
│   ├── alertModal.js       # Custom alert modal
│   ├── promptModal.js      # Custom prompt modal
│   ├── emojiModal.js       # Emoji picker modal
│   ├── formulaModal.js     # Formula (KaTeX) modal
│   ├── mediaPickerModal.js # Image/video picker modal
│   ├── specialCharModal.js # Special character picker
│   ├── templateModal.js    # Template insertion modal
│   ├── anchorModal.js      # Anchor link modal
│   ├── commands/           # Modular command modules
│   │   ├── baseCommand.js
│   │   ├── boldCommand.js
│   │   ├── italicCommand.js
│   │   ├── audioCommand.js
│   │   ├── tableCommand.js
│   │   ├── imageCommand.js
│   │   └── ...
├── LICENSE                 # MIT License
└── README.md
```

## 🌍 Localization

Set the editor language during initialization:

```javascript
import { initEditor } from './js/app.js';
initEditor({ language: 'de' }); // German
```

Or via the adapter:

```javascript
const editor = new TeinGoAdapter('#container', { language: 'fr' });
```

**Supported languages:** `tr`, `en`, `de`, `fr`, `es`, `it`, `pl`, `cs`, `hu`, `ro`, `bg`

## 🤝 Contributing

Contributions are welcome! Feel free to open issues and pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">Built with ❤️ by <strong>TeinGo</strong></p>
