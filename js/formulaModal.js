import { t } from './i18n.js';

/**
 * FormulaModal - LaTeX formül giriş modalı
 *
 * Açılır pencere yapısı:
 * ┌──────────────────────────────────────┐
 * │  Denklem Ekle                    ✕   │
 * ├──────────────────────────────────────┤
 * │  LaTeX Kodu:                         │
 * │  ┌────────────────────────────────┐  │
 * │  │ E = mc^2                       │  │
 * │  └────────────────────────────────┘  │
 * │                                      │
 * │  Önizleme:                           │
 * │  ┌────────────────────────────────┐  │
 * │  │    E = mc²   (KaTeX render)    │  │
 * │  └────────────────────────────────┘  │
 * │                                      │
 * │            [İptal]   [Ekle]          │
 * └──────────────────────────────────────┘
 *
 * Promise tabanlı: open() çağrılır → kullanıcı "Ekle" derse LaTeX string,
 * "İptal" veya dışına tıklarsa null döner.
 */
export class FormulaModal {
  constructor() {
    /** @type {HTMLElement|null} */
    this._backdrop = null;

    /** @type {HTMLTextAreaElement|null} */
    this._textarea = null;

    /** @type {HTMLElement|null} */
    this._preview = null;

    /** @type {HTMLElement|null} */
    this._errorMsg = null;

    /** @type {((value: string|null) => void)|null} */
    this._resolve = null;

    this._built = false;
  }

  /**
   * Modalı açar ve kullanıcı etkileşimini bekler.
   *
   * @param {string} [initialLatex=''] - Düzenleme için başlangıç LaTeX kodu
   * @returns {Promise<string|null>} - LaTeX kodu veya null (iptal)
   */
  open(initialLatex = '') {
    return new Promise((resolve) => {
      this._resolve = resolve;

      if (!this._built) {
        this._build();
        this._built = true;
      }

      // Textarea'yı hazırla
      this._textarea.value = initialLatex;
      this._errorMsg.textContent = '';
      this._updatePreview();

      // Modalı göster
      this._backdrop.classList.remove('hidden');
      // Küçük gecikme ile animasyon tetikleme (display:none → flex geçişi)
      requestAnimationFrame(() => {
        this._backdrop.classList.add('modal-visible');
        this._textarea.focus();
      });
    });
  }

  /**
   * Modalı kapatır ve promise'i resolve eder
   * @private
   * @param {string|null} result
   */
  _close(result) {
    this._backdrop.classList.remove('modal-visible');

    // Geçiş animasyonu bitmesini bekle
    setTimeout(() => {
      this._backdrop.classList.add('hidden');
    }, 200);

    if (this._resolve) {
      this._resolve(result);
      this._resolve = null;
    }
  }

  /**
   * Modal DOM yapısını oluşturur (lazy — ilk open() çağrısında)
   * @private
   */
  _build() {
    // ── Backdrop ──
    const backdrop = document.createElement('div');
    backdrop.className = [
      'fixed inset-0 z-[9999] flex items-center justify-center',
      'bg-black/40 backdrop-blur-sm',
      'hidden',
      'opacity-0 transition-opacity duration-200',
    ].join(' ');

    // Backdrop tıklama → kapat
    backdrop.addEventListener('mousedown', (e) => {
      if (e.target === backdrop) {
        this._close(null);
      }
    });

    // ── Modal Kartı ──
    const card = document.createElement('div');
    card.className = [
      'bg-white rounded-xl shadow-2xl border border-gray-200',
      'w-full max-w-lg mx-4',
      'transform scale-95 transition-transform duration-200',
    ].join(' ');

    // ── Başlık Çubuğu ──
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between px-5 py-3 border-b border-gray-200';
    header.innerHTML = `
      <h3 class="text-base font-semibold text-gray-800">${t('modal.formula_title')}</h3>
    `;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.innerHTML = '✕';
    closeBtn.className = 'text-gray-400 hover:text-gray-700 text-lg cursor-pointer transition-colors p-1';
    closeBtn.addEventListener('click', () => this._close(null));
    header.appendChild(closeBtn);

    // ── Gövde ──
    const body = document.createElement('div');
    body.className = 'px-5 py-4 space-y-4';

    // LaTeX input alanı
    const inputGroup = document.createElement('div');

    const label = document.createElement('label');
    label.className = 'block text-sm font-medium text-gray-600 mb-1.5';
    label.textContent = t('modal.latex_code');

    const textarea = document.createElement('textarea');
    textarea.className = [
      'w-full px-3 py-2 rounded-lg border border-gray-300',
      'text-sm font-mono text-gray-800',
      'focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400',
      'resize-none transition-shadow',
    ].join(' ');
    textarea.rows = 3;
    textarea.placeholder = t('modal.latex_placeholder');
    textarea.spellcheck = false;

    inputGroup.appendChild(label);
    inputGroup.appendChild(textarea);

    // Hata mesajı
    const errorMsg = document.createElement('div');
    errorMsg.className = 'text-xs text-red-500 mt-1 min-h-[1em]';

    inputGroup.appendChild(errorMsg);

    // Önizleme alanı
    const previewGroup = document.createElement('div');

    const previewLabel = document.createElement('div');
    previewLabel.className = 'text-sm font-medium text-gray-600 mb-1.5';
    previewLabel.textContent = t('menu.preview');

    const preview = document.createElement('div');
    preview.className = [
      'min-h-[60px] px-4 py-3 rounded-lg',
      'bg-gray-50 border border-gray-200',
      'flex items-center justify-center',
      'text-gray-400 text-sm',
      'overflow-x-auto',
    ].join(' ');
    preview.textContent = t('modal.enter_latex');

    previewGroup.appendChild(previewLabel);
    previewGroup.appendChild(preview);

    // Örnek formüller — hızlı erişim butonları
    const examples = document.createElement('div');
    examples.className = 'flex flex-wrap gap-1.5';

    const EXAMPLE_FORMULAS = [
      { label: t('modal.examples_fraction'), latex: '\\frac{a}{b}' },
      { label: t('modal.examples_sqrt'), latex: '\\sqrt{x^2 + y^2}' },
      { label: t('modal.examples_sum'), latex: '\\sum_{i=1}^{n} x_i' },
      { label: t('modal.examples_int'), latex: '\\int_{0}^{\\infty} e^{-x} dx' },
      { label: t('modal.examples_matrix'), latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
      { label: t('modal.examples_limit'), latex: '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1' },
    ];

    EXAMPLE_FORMULAS.forEach((ex) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = ex.label;
      btn.className = [
        'px-2 py-0.5 text-xs rounded',
        'bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600',
        'cursor-pointer transition-colors border border-gray-200',
      ].join(' ');
      btn.addEventListener('click', () => {
        textarea.value = ex.latex;
        this._updatePreview();
        textarea.focus();
      });
      examples.appendChild(btn);
    });

    body.appendChild(inputGroup);
    body.appendChild(previewGroup);
    body.appendChild(examples);

    // ── Footer ──
    const footer = document.createElement('div');
    footer.className = 'flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = t('modal.cancel');
    cancelBtn.className = [
      'px-4 py-1.5 rounded-lg text-sm font-medium',
      'text-gray-600 hover:bg-gray-100',
      'cursor-pointer transition-colors',
    ].join(' ');
    cancelBtn.addEventListener('click', () => this._close(null));

    const insertBtn = document.createElement('button');
    insertBtn.type = 'button';
    insertBtn.textContent = t('modal.insert');
    insertBtn.className = [
      'px-4 py-1.5 rounded-lg text-sm font-medium',
      'bg-blue-500 text-white hover:bg-blue-600',
      'cursor-pointer transition-colors',
      'disabled:opacity-40 disabled:cursor-not-allowed',
    ].join(' ');
    insertBtn.addEventListener('click', () => {
      const latex = textarea.value.trim();
      if (!latex) return;
      // Son bir kez doğrulama
      try {
        // eslint-disable-next-line no-undef -- KaTeX global olarak yüklü
        katex.renderToString(latex, { throwOnError: true });
        this._close(latex);
      } catch (error) {
        errorMsg.textContent = `${t('modal.invalid_latex')}: ${error.message}`;
      }
    });

    footer.appendChild(cancelBtn);
    footer.appendChild(insertBtn);

    // ── Birleştir ──
    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);
    backdrop.appendChild(card);
    document.body.appendChild(backdrop);

    // Referansları sakla
    this._backdrop = backdrop;
    this._textarea = textarea;
    this._preview = preview;
    this._errorMsg = errorMsg;
    this._insertBtn = insertBtn;

    // ── Event Listeners ──
    // Canlı önizleme: her tuş vuruşunda güncelle
    textarea.addEventListener('input', () => this._updatePreview());

    // Enter + Ctrl → hızlı ekleme
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        insertBtn.click();
      }
      // Escape → kapat
      if (e.key === 'Escape') {
        this._close(null);
      }
    });
  }

  /**
   * KaTeX ile önizleme alanını günceller
   * @private
   */
  _updatePreview() {
    const latex = this._textarea.value.trim();

    if (!latex) {
      this._preview.textContent = t('modal.enter_latex');
      this._preview.classList.add('text-gray-400');
      this._errorMsg.textContent = '';
      this._insertBtn.disabled = true;
      return;
    }

    try {
      // eslint-disable-next-line no-undef -- KaTeX global olarak yüklü
      this._preview.innerHTML = katex.renderToString(latex, {
        throwOnError: true,
        displayMode: true, // Büyük/merkezli render (önizleme için)
      });
      this._preview.classList.remove('text-gray-400');
      this._errorMsg.textContent = '';
      this._insertBtn.disabled = false;
    } catch (error) {
      this._preview.textContent = t('modal.invalid_formula');
      this._preview.classList.add('text-gray-400');
      this._errorMsg.textContent = error.message;
      this._insertBtn.disabled = true;
    }
  }
}
