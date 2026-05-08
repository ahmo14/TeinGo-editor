/**
 * mediaPickerModal.js – Singleton media picker modal for image/video insertion.
 *
 * Usage:
 *   import { openMediaPicker } from './mediaPickerModal.js';
 *   const result = await openMediaPicker('image'); // or 'video'
 *   if (result) { result.location, result.kind }
 */

import { t } from './i18n.js';

const tx  = (s)       => window.EditorUiLocalization?.translate(s) || s;
const txf = (s, ...a) => tx(s).replace(/\{(\d+)\}/g, (_, i) => a[i] ?? '');
const esc = (v) => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function csrf() {
  return document.querySelector('meta[name="csrf-token"]')?.content ?? '';
}

// ── Singleton state ───────────────────────────────────────────────────────────
let _el        = null;
let _bsModal   = null;
let _resolve   = null;
let _type      = 'image';

// ── DOM helpers ───────────────────────────────────────────────────────────────
function _id(id) { return document.getElementById(id); }

// ── Build modal once ──────────────────────────────────────────────────────────
function _build() {
  if (_el) return;

  const wrap = document.createElement('div');
  wrap.innerHTML = `
<div class="modal fade" id="_mpkModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
    <div class="modal-content">
      <div class="modal-header py-2 border-bottom-0">
        <h5 class="modal-title fw-semibold" id="_mpkTitle"></h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body p-3 pt-0">

        <!-- ── Choice pane ── -->
        <div id="_mpkChoicePane">
          <div class="row g-3 mt-1">
            <div class="col-6">
              <button type="button" id="_mpkUploadBtn"
                class="btn btn-outline-primary w-100 py-4 d-flex flex-column align-items-center gap-2 rounded-3">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <span class="fw-semibold small" id="_mpkUploadLabel"></span>
                <small class="text-muted" id="_mpkUploadHint" style="font-size:.72rem;text-align:center;"></small>
              </button>
            </div>
            <div class="col-6">
              <button type="button" id="_mpkGalleryBtn"
                class="btn btn-outline-secondary w-100 py-4 d-flex flex-column align-items-center gap-2 rounded-3">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <span class="fw-semibold small" id="_mpkGalleryLabel"></span>
                <small class="text-muted" id="_mpkGalleryHint" style="font-size:.72rem;text-align:center;"></small>
              </button>
            </div>
          </div>
          <input type="file" id="_mpkFileInput" style="display:none">
          <div id="_mpkUploadStatus" class="mt-3 small" style="min-height:24px;"></div>
        </div>

        <!-- ── Gallery pane ── -->
        <div id="_mpkGalleryPane" style="display:none;">
          <div class="d-flex align-items-center gap-2 mb-3 pt-1">
            <button type="button" id="_mpkBackBtn"
              class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
            <span class="fw-semibold small" id="_mpkGalleryTitle"></span>
          </div>
          <div id="_mpkGalleryStatus" class="text-muted small mb-2" style="min-height:20px;"></div>
          <div id="_mpkGalleryGrid" class="row g-2" style="max-height:380px;overflow-y:auto;"></div>
        </div>

      </div>
    </div>
  </div>
</div>`;
  document.body.appendChild(wrap.firstElementChild);

  _el = _id('_mpkModal');
  _bsModal = new window.bootstrap.Modal(_el, { backdrop: true });

  // Cancel → resolve null
  _el.addEventListener('hidden.bs.modal', () => {
    if (_resolve) { _resolve(null); _resolve = null; }
  });

  // Upload button
  _id('_mpkUploadBtn').addEventListener('click', () => {
    const fi = _id('_mpkFileInput');
    fi.accept = _type === 'video'
      ? 'video/mp4,video/webm,video/ogg,video/quicktime,video/x-m4v'
      : 'image/jpeg,image/png,image/gif,image/webp';
    fi.click();
  });

  _id('_mpkFileInput').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (file) await _upload(file);
    e.target.value = '';
  });

  // Gallery button
  _id('_mpkGalleryBtn').addEventListener('click', () => {
    _id('_mpkChoicePane').style.display = 'none';
    _id('_mpkGalleryPane').style.display = 'block';
    _loadGallery();
  });

  // Back button
  _id('_mpkBackBtn').addEventListener('click', () => {
    _id('_mpkGalleryPane').style.display = 'none';
    _id('_mpkChoicePane').style.display = 'block';
  });

  // Gallery item click
  _id('_mpkGalleryGrid').addEventListener('click', (e) => {
    const item = e.target.closest('[data-mpk-location]');
    if (item) _resolve_({ location: item.dataset.mpkLocation, kind: item.dataset.mpkKind || _type });
  });
}

// ── Upload a file ─────────────────────────────────────────────────────────────
async function _upload(file) {
  const status = _id('_mpkUploadStatus');
  status.className = 'mt-3 small text-muted';
  status.textContent = txf('Yükleniyor: {0}', file.name) + '…';

  const fd = new FormData();
  fd.append('file', file);
  const endpoint = _type === 'video' ? '/Upload/Video' : '/Upload/Image';

  try {
    const res  = await fetch(endpoint, { method: 'POST', body: fd, credentials: 'same-origin', headers: { 'RequestVerificationToken': csrf() } });
    const data = await res.json().catch(() => ({}));
    if (data.location) {
      status.textContent = '';
      _resolve_({ location: data.location, kind: _type });
    } else {
      status.className = 'mt-3 small text-danger';
      status.textContent = '✗ ' + (data.error || tx('Yükleme başarısız.'));
    }
  } catch {
    status.className = 'mt-3 small text-danger';
    status.textContent = '✗ ' + tx('Yükleme başarısız.');
  }
}

// ── Load gallery items ────────────────────────────────────────────────────────
async function _loadGallery() {
  const grid   = _id('_mpkGalleryGrid');
  const status = _id('_mpkGalleryStatus');
  grid.innerHTML = '';
  status.textContent = t('mediaPicker.loading');

  try {
    const res  = await fetch(`/Upload/Gallery?type=${encodeURIComponent(_type)}`, { credentials: 'same-origin' });
    const data = await res.json().catch(() => ({ items: [] }));
    status.textContent = '';

    const items = Array.isArray(data.items) ? data.items : [];
    if (!items.length) {
      grid.innerHTML = `<div class="col-12 text-center text-muted py-5 small">${esc(t('mediaPicker.empty'))}</div>`;
      return;
    }

    grid.innerHTML = items.map(item => {
      const isVideo = item.kind === 'video';
      const thumb = isVideo
        ? `<div style="aspect-ratio:16/9;background:#0f172a;display:flex;align-items:center;justify-content:center;">
             <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5">
               <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>
             </svg>
           </div>`
        : `<div style="aspect-ratio:16/9;background:#f1f5f9;overflow:hidden;">
             <img src="${esc(item.location)}" alt="${esc(item.name)}" loading="lazy"
                  style="width:100%;height:100%;object-fit:cover;display:block;">
           </div>`;

      return `
        <div class="col-6 col-sm-4 col-md-3">
          <div class="mpk-thumb rounded-2 overflow-hidden"
               data-mpk-location="${esc(item.location)}" data-mpk-kind="${isVideo ? 'video' : 'image'}"
               style="cursor:pointer;border:2px solid transparent;transition:border-color .12s;user-select:none;"
               title="${esc(item.name)}">
            ${thumb}
            <div class="bg-light px-1 py-0" style="font-size:.68rem;color:#64748b;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">
              ${esc(item.name)}
            </div>
          </div>
        </div>`;
    }).join('');

    // Hover styles via event delegation (no inline onmouse* needed)
    grid.querySelectorAll('.mpk-thumb').forEach(el => {
      el.addEventListener('mouseenter', () => { el.style.borderColor = '#2563eb'; });
      el.addEventListener('mouseleave', () => { el.style.borderColor = 'transparent'; });
    });

  } catch {
    status.textContent = t('mediaPicker.error');
  }
}

// ── Update all text labels for current type ───────────────────────────────────
function _updateTexts() {
  const isVideo = _type === 'video';
  _id('_mpkTitle').textContent        = t(isVideo ? 'mediaPicker.titleVideo'        : 'mediaPicker.titleImage');
  _id('_mpkUploadLabel').textContent  = t('mediaPicker.uploadLabel');
  _id('_mpkUploadHint').textContent   = t(isVideo ? 'mediaPicker.uploadHintVideo'   : 'mediaPicker.uploadHintImage');
  _id('_mpkGalleryLabel').textContent = t('mediaPicker.fromGallery');
  _id('_mpkGalleryHint').textContent  = t(isVideo ? 'mediaPicker.galleryHintVideo'  : 'mediaPicker.galleryHintImage');
  _id('_mpkGalleryTitle').textContent = t(isVideo ? 'mediaPicker.galleryTitleVideo' : 'mediaPicker.galleryTitleImage');
  _id('_mpkBackBtn').title            = t('mediaPicker.back');
}

// ── Internal resolve helper ───────────────────────────────────────────────────
function _resolve_(result) {
  if (_resolve) {
    const r = _resolve;
    _resolve = null;
    _bsModal.hide();
    r(result);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────
/**
 * Opens the media picker modal.
 * @param {'image'|'video'} type
 * @returns {Promise<{location: string, kind: string}|null>}
 */
export function openMediaPicker(type = 'image') {
  if (!window.bootstrap?.Modal) {
    // Bootstrap not loaded – fall back to alert
    return Promise.resolve(null);
  }

  return new Promise(resolve => {
    _build();
    _resolve = resolve;
    _type    = type;

    // Reset state
    _id('_mpkChoicePane').style.display  = 'block';
    _id('_mpkGalleryPane').style.display = 'none';
    _id('_mpkUploadStatus').textContent  = '';
    _id('_mpkGalleryGrid').innerHTML     = '';
    _id('_mpkGalleryStatus').textContent = '';

    _updateTexts();
    _bsModal.show();
  });
}
