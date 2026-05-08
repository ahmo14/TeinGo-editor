import { BaseCommand } from './baseCommand.js';

const et = (source) => window.EditorUiLocalization?.translate(source) || source;

export class AudioCommand extends BaseCommand {
    constructor() {
        super({
            name: 'insertAudio',
            icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>',
            title: et('Ses Ekle'),
            shortcut: null,
            tag: 'AUDIO',
        });
    }

    async execute(editor) {
        editor.saveSelection();
        const url = await AudioInsertModal.open();
        if (!url) {
            editor.restoreSelection();
            return;
        }
        editor.restoreSelection();
        const audio = document.createElement('audio');
        audio.src = url;
        audio.controls = true;
        audio.style.cssText = 'display:block;margin:1em 0;max-width:100%';
        editor.insertNodeAtCursor(audio);
    }
}

// ── Modal ──────────────────────────────────────────────────────────────────────
const AudioInsertModal = (() => {
    let _resolve = null;
    let _mediaRecorder = null;
    let _stream = null;
    let _chunks = [];
    let _blob = null;
    let _blobUrl = null;
    let _timerInterval = null;
    let _elapsed = 0;
    let _isPaused = false;
    let _audioCtx = null;
    let _analyser = null;
    let _animFrame = null;

    // ── DOM ────────────────────────────────────────────────────────────────
    function getModal() {
        let el = document.getElementById('_audio-insert-modal');
        if (!el) {
            el = document.createElement('div');
            el.id = '_audio-insert-modal';
            el.innerHTML = `
<div class="modal fade" id="_aim-inner" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered" style="max-width:480px">
    <div class="modal-content rounded-4 border-0 shadow">
      <div class="modal-header border-0 pb-0 px-4 pt-4">
        <h5 class="modal-title fw-bold">${et('Ses Ekle')}</h5>
        <button type="button" class="btn-close" id="_aim-close"></button>
      </div>
      <div class="modal-body px-4 pb-4 pt-3">

        <!-- Tab switcher -->
        <div class="d-flex gap-2 mb-3">
          <button class="btn btn-sm rounded-3 fw-semibold _aim-tab active" data-tab="record"
                  style="flex:1;background:#f1f5f9;border:none;color:#1e293b">
            <i class="bi bi-mic-fill me-1"></i>${et('Kaydet')}
          </button>
          <button class="btn btn-sm rounded-3 fw-semibold _aim-tab" data-tab="library"
                  style="flex:1;background:#f1f5f9;border:none;color:#64748b">
            <i class="bi bi-collection-play me-1"></i>${et('Kütüphanem')}
          </button>
          <button class="btn btn-sm rounded-3 fw-semibold _aim-tab" data-tab="url"
                  style="flex:1;background:#f1f5f9;border:none;color:#64748b">
            <i class="bi bi-link-45deg me-1"></i>URL
          </button>
        </div>

        <!-- Record tab -->
        <div id="_aim-tab-record">
          <canvas id="_aim-canvas" style="width:100%;height:56px;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0;display:block;margin-bottom:.9rem"></canvas>
          <div id="_aim-timer" style="text-align:center;font-size:1.9rem;font-weight:800;letter-spacing:.04em;color:#1e293b;font-variant-numeric:tabular-nums;margin-bottom:1rem;line-height:1">00:00</div>

          <div class="d-flex align-items-center justify-content-center gap-3 mb-3">
            <!-- Discard -->
            <button id="_aim-discard" disabled
                    style="width:44px;height:44px;border-radius:50%;border:2px solid #e2e8f0;background:#fff;color:#475569;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .12s"
                    title="${et('Sıfırla')}">
              <i class="bi bi-trash3"></i>
            </button>
            <!-- Record/Stop -->
            <button id="_aim-rec-btn"
                    style="width:64px;height:64px;border-radius:50%;background:#dc2626;color:#fff;border:none;font-size:1.4rem;cursor:pointer;box-shadow:0 4px 14px rgba(220,38,38,.35);transition:transform .12s;display:flex;align-items:center;justify-content:center"
                    title="${et('Kayda başla')}">
              <i class="bi bi-mic-fill" id="_aim-rec-icon"></i>
            </button>
            <!-- Pause -->
            <button id="_aim-pause" disabled
                    style="width:44px;height:44px;border-radius:50%;border:2px solid #e2e8f0;background:#fff;color:#475569;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .12s"
                    title="${et('Duraklat')}">
              <i class="bi bi-pause-fill" id="_aim-pause-icon"></i>
            </button>
          </div>

          <div id="_aim-status" style="text-align:center;font-size:.83rem;color:#64748b;min-height:1.3em;margin-bottom:.75rem">
            ${et('Mikrofon için kayda başla butonuna bas')}
          </div>

          <!-- Preview + insert row (hidden until recorded) -->
          <div id="_aim-preview-row" style="display:none">
            <audio id="_aim-preview-audio" controls style="width:100%;height:36px;margin-bottom:.85rem"></audio>
            <button id="_aim-insert-btn" class="btn btn-primary rounded-3 fw-semibold w-100">
              <i class="bi bi-plus-circle me-1"></i>${et('İçeriğe Ekle')}
            </button>
          </div>
        </div>

        <!-- Library tab -->
        <div id="_aim-tab-library" style="display:none">
          <div id="_aim-lib-empty" style="text-align:center;padding:2rem 1rem;color:#94a3b8;display:none">
            <i class="bi bi-mic-mute" style="font-size:2rem;display:block;margin-bottom:.5rem"></i>
            <div>${et('Henüz kaydedilmiş ses yok.')}</div>
            <div style="font-size:.8rem;margin-top:.35rem">${et('Kaydet sekmesinden ses kaydedip kütüphaneye ekleyebilirsin.')}</div>
          </div>
          <div id="_aim-lib-list" style="max-height:300px;overflow-y:auto"></div>
        </div>

        <!-- URL tab -->
        <div id="_aim-tab-url" style="display:none">
          <label class="form-label fw-semibold small">${et("Ses Dosyası URL'si")}</label>
          <input id="_aim-url-input" type="url" class="form-control rounded-3 mb-3"
                 placeholder="https://… (MP3, WAV, OGG, WebM)" />
          <button id="_aim-url-insert" class="btn btn-primary rounded-3 fw-semibold w-100">
            <i class="bi bi-plus-circle me-1"></i>${et('İçeriğe Ekle')}
          </button>
          <div class="mt-3 p-3 rounded-3" style="background:#f8fafc;border:1px solid #e2e8f0;font-size:.8rem;color:#64748b">
            <i class="bi bi-info-circle me-1"></i>
            <a href="/AudioRecorder" target="_blank" style="color:#2563eb">${et('Ses Kaydedici')}</a> ${et("sayfasından ses yükleyip URL'yi buraya yapıştırabilirsin.")}
          </div>
        </div>

      </div>
    </div>
  </div>
</div>`;
            document.body.appendChild(el);
            _bindEvents(el);
        }
        return el;
    }

    function _bindEvents(root) {
        // Tab switching
        root.querySelectorAll('._aim-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                root.querySelectorAll('._aim-tab').forEach(b => {
                    b.style.background = '#f1f5f9';
                    b.style.color = '#64748b';
                    b.classList.remove('active');
                });
                btn.style.background = '#1d4ed8';
                btn.style.color = '#fff';
                btn.classList.add('active');
                document.getElementById('_aim-tab-record').style.display  = btn.dataset.tab === 'record'  ? '' : 'none';
                document.getElementById('_aim-tab-library').style.display = btn.dataset.tab === 'library' ? '' : 'none';
                document.getElementById('_aim-tab-url').style.display     = btn.dataset.tab === 'url'     ? '' : 'none';
                if (btn.dataset.tab === 'library') _renderLibrary();
            });
        });

        document.getElementById('_aim-close').addEventListener('click', () => _closeModal(null));
        document.getElementById('_aim-rec-btn').addEventListener('click', _onRecBtn);
        document.getElementById('_aim-pause').addEventListener('click', _onPause);
        document.getElementById('_aim-discard').addEventListener('click', _onDiscard);
        document.getElementById('_aim-insert-btn').addEventListener('click', _onInsertRecorded);
        document.getElementById('_aim-url-insert').addEventListener('click', _onInsertUrl);

        // Close on backdrop click
        document.getElementById('_aim-inner').addEventListener('click', e => {
            if (e.target === document.getElementById('_aim-inner')) _closeModal(null);
        });
    }

    // ── Record controls ────────────────────────────────────────────────────
    async function _onRecBtn() {
        if (_mediaRecorder && _mediaRecorder.state !== 'inactive') {
            _stopRecording();
        } else {
            await _startRecording();
        }
    }

    async function _startRecording() {
        if (!navigator.mediaDevices?.getUserMedia) {
            _setStatus(et('Mikrofon erişimi bu sayfada kullanılamıyor (HTTPS gerekli).'), 'error');
            return;
        }
        try {
            _stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            const n = err?.name || '';
            if (n === 'NotAllowedError' || n === 'PermissionDeniedError') {
                _setStatus(et('Mikrofon izni reddedildi. Tarayıcı adres çubuğundaki kilit simgesinden izin ver.'), 'error');
            } else if (n === 'NotFoundError') {
                _setStatus(et('Mikrofon bulunamadı.'), 'error');
            } else {
                _setStatus(et('Mikrofon hatası: ') + (err?.message || n), 'error');
            }
            return;
        }

        _chunks = [];
        _blob = null;
        if (_blobUrl) { URL.revokeObjectURL(_blobUrl); _blobUrl = null; }
        _elapsed = 0;
        _isPaused = false;

        const mime = _getSupportedMime();
        _mediaRecorder = new MediaRecorder(_stream, mime ? { mimeType: mime } : {});
        _mediaRecorder.ondataavailable = e => { if (e.data.size > 0) _chunks.push(e.data); };
        _mediaRecorder.onstop = _onStopped;
        _mediaRecorder.start(250);

        _startWaveform(_stream);
        _startTimer();

        document.getElementById('_aim-rec-btn').style.background = '#1e293b';
        document.getElementById('_aim-rec-icon').className = 'bi bi-stop-fill';
        document.getElementById('_aim-rec-btn').title = et('Kaydı durdur');
        document.getElementById('_aim-pause').disabled = false;
        document.getElementById('_aim-discard').disabled = false;
        document.getElementById('_aim-timer').style.color = '#dc2626';
        document.getElementById('_aim-preview-row').style.display = 'none';
        _setStatus(et('Kaydediliyor…'));
    }

    function _stopRecording() {
        _mediaRecorder?.stop();
        _stopTimer();
        _stopWaveform();
        _stream?.getTracks().forEach(t => t.stop());
        document.getElementById('_aim-rec-btn').style.background = '#dc2626';
        document.getElementById('_aim-rec-icon').className = 'bi bi-mic-fill';
        document.getElementById('_aim-rec-btn').title = et('Kayda başla');
        document.getElementById('_aim-pause').disabled = true;
        document.getElementById('_aim-pause-icon').className = 'bi bi-pause-fill';
        document.getElementById('_aim-timer').style.color = '#1e293b';
        _isPaused = false;
    }

    function _onStopped() {
        const mime = _mediaRecorder.mimeType || 'audio/webm';
        _blob = new Blob(_chunks, { type: mime });
        _blobUrl = URL.createObjectURL(_blob);
        const preview = document.getElementById('_aim-preview-audio');
        preview.src = _blobUrl;
        document.getElementById('_aim-preview-row').style.display = '';
        _setStatus(et('Kayıt tamamlandı — ') + _formatTime(_elapsed));
    }

    function _onPause() {
        if (!_mediaRecorder) return;
        if (_isPaused) {
            _mediaRecorder.resume();
            _startTimer();
            _isPaused = false;
            document.getElementById('_aim-pause-icon').className = 'bi bi-pause-fill';
            _setStatus(et('Kaydediliyor…'));
        } else {
            _mediaRecorder.pause();
            _stopTimer();
            _isPaused = true;
            document.getElementById('_aim-pause-icon').className = 'bi bi-play-fill';
            _setStatus(et('Duraklatıldı'));
        }
    }

    function _onDiscard() {
        if (_mediaRecorder && _mediaRecorder.state !== 'inactive') {
            _mediaRecorder.onstop = null;
            _mediaRecorder.stop();
            _stream?.getTracks().forEach(t => t.stop());
        }
        _stopTimer();
        _stopWaveform();
        _mediaRecorder = null;
        _chunks = [];
        _blob = null;
        if (_blobUrl) { URL.revokeObjectURL(_blobUrl); _blobUrl = null; }
        _elapsed = 0;
        _isPaused = false;

        document.getElementById('_aim-rec-btn').style.background = '#dc2626';
        document.getElementById('_aim-rec-icon').className = 'bi bi-mic-fill';
        document.getElementById('_aim-pause').disabled = true;
        document.getElementById('_aim-discard').disabled = true;
        document.getElementById('_aim-pause-icon').className = 'bi bi-pause-fill';
        document.getElementById('_aim-timer').textContent = '00:00';
        document.getElementById('_aim-timer').style.color = '#1e293b';
        document.getElementById('_aim-preview-row').style.display = 'none';
        _setStatus(et('Mikrofon için kayda başla butonuna bas'));
    }

    // ── Insert actions ─────────────────────────────────────────────────────
    async function _onInsertRecorded() {
        if (!_blob) return;
        const btn = document.getElementById('_aim-insert-btn');
        btn.disabled = true;
        btn.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:_aim-spin .7s linear infinite;vertical-align:middle;margin-right:.3rem"></span>' + et('Yükleniyor…');

        const ext = _mimeToExt(_blob.type);
        const fileName = 'kayit-' + Date.now() + '.' + ext;
        const cfg = window.AudioRecorderConfig;

        if (!cfg?.uploadUrl) {
            // No upload config — use blob URL directly (works for current session)
            _closeModal(_blobUrl);
            return;
        }

        const fd = new FormData();
        fd.append('file', _blob, fileName);
        try {
            const resp = await fetch(cfg.uploadUrl, {
                method: 'POST',
                body: fd,
                headers: cfg.antiForgeryToken
                    ? { 'RequestVerificationToken': cfg.antiForgeryToken }
                    : {},
            });
            const data = await resp.json();
            if (!resp.ok) {
                _setStatus(data.error || et('Yükleme başarısız.'), 'error');
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-plus-circle me-1"></i>' + et('İçeriğe Ekle');
                return;
            }
            if (typeof AudioLibrary !== 'undefined') {
                AudioLibrary.save({
                    label: et('Kayıt') + ' ' + new Date().toLocaleTimeString(document.documentElement.lang || 'tr-TR'),
                    url: data.location,
                    duration: 0,
                    ext: _mimeToExt(_blob.type),
                    uploadedAt: Date.now(),
                });
            }
            _closeModal(data.location);
        } catch {
            _setStatus(et('Ağ hatası, tekrar dene.'), 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-plus-circle me-1"></i>' + et('İçeriğe Ekle');
        }
    }

    function _onInsertUrl() {
        const url = document.getElementById('_aim-url-input').value.trim();
        if (!url) return;
        _closeModal(url);
    }

    // ── Modal open/close ───────────────────────────────────────────────────
    function open() {
        return new Promise(resolve => {
            _resolve = resolve;
            getModal();
            _resetUI();
            _injectKeyframes();
            const inner = document.getElementById('_aim-inner');
            inner.classList.add('show');
            inner.style.display = 'block';
            inner.removeAttribute('aria-hidden');
            document.body.classList.add('modal-open');
            // backdrop
            let bd = document.getElementById('_aim-backdrop');
            if (!bd) {
                bd = document.createElement('div');
                bd.id = '_aim-backdrop';
                bd.className = 'modal-backdrop fade show';
                document.body.appendChild(bd);
            }
        });
    }

    function _closeModal(url) {
        const inner = document.getElementById('_aim-inner');
        if (inner) {
            inner.classList.remove('show');
            inner.style.display = 'none';
            inner.setAttribute('aria-hidden', 'true');
        }
        document.body.classList.remove('modal-open');
        const bd = document.getElementById('_aim-backdrop');
        if (bd) bd.remove();

        // Stop any active recording
        if (_mediaRecorder && _mediaRecorder.state !== 'inactive') {
            _mediaRecorder.onstop = null;
            _mediaRecorder.stop();
        }
        _stream?.getTracks().forEach(t => t.stop());
        _stopTimer();
        _stopWaveform();
        _mediaRecorder = null;
        _stream = null;

        if (_resolve) { _resolve(url); _resolve = null; }
    }

    function _resetUI() {
        document.getElementById('_aim-timer').textContent = '00:00';
        document.getElementById('_aim-timer').style.color = '#1e293b';
        document.getElementById('_aim-rec-btn').style.background = '#dc2626';
        document.getElementById('_aim-rec-icon').className = 'bi bi-mic-fill';
        document.getElementById('_aim-pause').disabled = true;
        document.getElementById('_aim-discard').disabled = true;
        document.getElementById('_aim-pause-icon').className = 'bi bi-pause-fill';
        document.getElementById('_aim-preview-row').style.display = 'none';
        document.getElementById('_aim-preview-audio').src = '';
        document.getElementById('_aim-url-input').value = '';
        document.getElementById('_aim-insert-btn').disabled = false;
        document.getElementById('_aim-insert-btn').innerHTML = '<i class="bi bi-plus-circle me-1"></i>' + et('İçeriğe Ekle');
        _setStatus(et('Mikrofon için kayda başla butonuna bas'));
        // Reset to record tab
        const tabs = document.querySelectorAll('._aim-tab');
        tabs.forEach(b => { b.style.background = '#f1f5f9'; b.style.color = '#64748b'; b.classList.remove('active'); });
        tabs[0].style.background = '#1d4ed8'; tabs[0].style.color = '#fff'; tabs[0].classList.add('active');
        document.getElementById('_aim-tab-record').style.display  = '';
        document.getElementById('_aim-tab-library').style.display = 'none';
        document.getElementById('_aim-tab-url').style.display     = 'none';
    }

    function _renderLibrary() {
        const lib = typeof AudioLibrary !== 'undefined' ? AudioLibrary.all() : [];
        const list = document.getElementById('_aim-lib-list');
        const empty = document.getElementById('_aim-lib-empty');
        if (!lib.length) {
            empty.style.display = '';
            list.innerHTML = '';
            return;
        }
        empty.style.display = 'none';
        list.innerHTML = lib.map((clip, i) => `
            <div style="display:flex;align-items:center;gap:.6rem;padding:.65rem .75rem;border-bottom:1px solid #f1f5f9">
              <div style="flex:1;min-width:0">
                <div style="font-weight:600;font-size:.87rem;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_esc(clip.label)}</div>
                <div style="font-size:.76rem;color:#94a3b8">${_fmtTime(clip.duration || 0)} &middot; ${(clip.ext || 'audio').toUpperCase()} &middot; ${_fmtDate(clip.uploadedAt)}</div>
              </div>
              <audio src="${_esc(clip.url)}" controls style="height:28px;max-width:140px" preload="none"></audio>
              <button data-lib-insert="${i}" style="padding:.3rem .6rem;border-radius:8px;border:none;background:#1d4ed8;color:#fff;font-size:.8rem;cursor:pointer;white-space:nowrap;font-weight:600">
                ${et('Ekle')}
              </button>
              <button data-lib-remove="${_esc(clip.url)}" title="${et('Kütüphaneden kaldır')}"
                      style="padding:.3rem .5rem;border-radius:8px;border:1px solid #e2e8f0;background:#fff;color:#94a3b8;font-size:.8rem;cursor:pointer">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>`).join('');

        list.querySelectorAll('[data-lib-insert]').forEach(btn => {
            btn.addEventListener('click', () => {
                const clip = lib[parseInt(btn.dataset.libInsert, 10)];
                if (clip) _closeModal(clip.url);
            });
        });
        list.querySelectorAll('[data-lib-remove]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (typeof AudioLibrary !== 'undefined') AudioLibrary.remove(btn.dataset.libRemove);
                _renderLibrary();
            });
        });
    }

    function _fmtDate(ts) {
        if (!ts) return '';
        try {
            return new Date(ts).toLocaleDateString(document.documentElement.lang || navigator.language || 'tr', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch { return ''; }
    }

    // ── Timer ──────────────────────────────────────────────────────────────
    function _startTimer() {
        _timerInterval = setInterval(() => {
            _elapsed++;
            document.getElementById('_aim-timer').textContent = _formatTime(_elapsed);
        }, 1000);
    }
    function _stopTimer() { clearInterval(_timerInterval); _timerInterval = null; }
    function _formatTime(s) { return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }

    // ── Waveform ───────────────────────────────────────────────────────────
    function _startWaveform(stream) {
        _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        _analyser = _audioCtx.createAnalyser();
        _analyser.fftSize = 128;
        _audioCtx.createMediaStreamSource(stream).connect(_analyser);
        const canvas = document.getElementById('_aim-canvas');
        canvas.width = canvas.offsetWidth || 400;
        canvas.height = canvas.offsetHeight || 56;
        const ctx = canvas.getContext('2d');
        const buf = new Uint8Array(_analyser.frequencyBinCount);
        function draw() {
            _animFrame = requestAnimationFrame(draw);
            _analyser.getByteFrequencyData(buf);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            const bw = (canvas.width / buf.length) * 2.2;
            let x = 0;
            for (let i = 0; i < buf.length; i++) {
                const h = (buf[i] / 255) * canvas.height * 0.85;
                ctx.fillStyle = `rgba(220,38,38,${0.3 + (buf[i] / 255) * 0.6})`;
                ctx.fillRect(x, canvas.height - h, bw - 1, h);
                x += bw;
            }
        }
        draw();
    }

    function _stopWaveform() {
        if (_animFrame) { cancelAnimationFrame(_animFrame); _animFrame = null; }
        _analyser?.disconnect();
        _audioCtx?.close();
        _analyser = null; _audioCtx = null;
        const canvas = document.getElementById('_aim-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────
    function _esc(str) {
        return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function _fmtTime(s) { return _formatTime(s); }

    function _getSupportedMime() {
        for (const t of ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']) {
            if (MediaRecorder.isTypeSupported(t)) return t;
        }
        return '';
    }
    function _mimeToExt(mime) {
        if (mime.startsWith('audio/webm')) return 'webm';
        if (mime.startsWith('audio/ogg')) return 'ogg';
        if (mime.startsWith('audio/mp4')) return 'm4a';
        return 'audio';
    }
    function _setStatus(msg, type) {
        const el = document.getElementById('_aim-status');
        if (!el) return;
        el.textContent = msg;
        el.style.color = type === 'error' ? '#dc2626' : '#64748b';
    }
    function _injectKeyframes() {
        if (document.getElementById('_aim-keyframes')) return;
        const s = document.createElement('style');
        s.id = '_aim-keyframes';
        s.textContent = '@keyframes _aim-spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(s);
    }

    return { open };
})();
