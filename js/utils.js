/* =========================================================
   Pulse · utils — pure helpers shared across modules.
   Attached to window.Pulse.utils. No DOM state here except toast.
   ========================================================= */
(function () {
  'use strict';

  const Pulse = (window.Pulse = window.Pulse || {});

  const utils = {
    /** Short unique id (good enough for a client-side demo). */
    uid() {
      return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    },

    /** Escape user-provided text before injecting as HTML. */
    escapeHtml(str) {
      return String(str ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[c]));
    },

    /** Turn plain text into safe HTML, preserving newlines and basic links. */
    textToHtml(str) {
      const escaped = utils.escapeHtml(str);
      return escaped
        .replace(/https?:\/\/[^\s]+/g, (m) => `<a href="${m}" target="_blank" rel="noopener" class="text-violet-500 hover:underline">${m}</a>`)
        .replace(/\n/g, '<br>');
    },

    /** Format a timestamp/Date as a friendly Chinese relative string. */
    formatRelativeTime(ts) {
      const d = ts instanceof Date ? ts : new Date(ts);
      const diff = Math.max(0, Date.now() - d.getTime());
      const s = diff / 1000;
      if (s < 45) return '刚刚';
      if (s < 3600) return Math.floor(s / 60) + ' 分钟前';
      if (s < 86400) return Math.floor(s / 3600) + ' 小时前';
      if (s < 604800) return Math.floor(s / 86400) + ' 天前';
      const sameYear = d.getFullYear() === new Date().getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return sameYear ? `${mm}-${dd}` : `${d.getFullYear()}-${mm}-${dd}`;
    },

    /** Compact number: 1200 -> 1.2k */
    formatCount(n) {
      if (n < 1000) return String(n);
      if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
      return (n / 10000).toFixed(1).replace(/\.0$/, '') + 'w';
    },

    /** Deterministic gradient for an avatar, derived from a seed string. */
    avatarGradient(seed) {
      let h = 0;
      const s = String(seed || '?');
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      const palettes = [
        ['#6366f1', '#a855f7'], ['#ec4899', '#f43f5e'], ['#f59e0b', '#ef4444'],
        ['#10b981', '#06b6d4'], ['#3b82f6', '#6366f1'], ['#8b5cf6', '#ec4899'],
        ['#14b8a6', '#22c55e'], ['#f97316', '#eab308']
      ];
      const [a, b] = palettes[h % palettes.length];
      return `linear-gradient(135deg, ${a}, ${b})`;
    },

    /** Initials / glyph for the avatar circle. */
    initials(name) {
      const s = String(name || '?').trim();
      if (/[一-鿿]/.test(s)) return s.slice(-2); // last 2 CJK chars
      const parts = s.split(/\s+/);
      return parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : s.slice(0, 2).toUpperCase();
    },

    /** Build an avatar DOM element (gradient + initials OR <img> if url provided). */
    avatarEl(user, size) {
      size = size || 44;
      const wrap = document.createElement(user.avatar ? 'span' : 'span');
      wrap.className = 'grid place-items-center rounded-full font-bold text-white shrink-0 select-none';
      wrap.style.width = size + 'px';
      wrap.style.height = size + 'px';
      wrap.style.fontSize = Math.round(size * 0.38) + 'px';
      if (user.avatar) {
        const img = document.createElement('img');
        img.src = user.avatar;
        img.alt = user.name;
        img.className = 'h-full w-full rounded-full object-cover';
        wrap.appendChild(img);
      } else {
        wrap.style.background = utils.avatarGradient(user.name + user.handle);
        wrap.textContent = utils.initials(user.name);
      }
      return wrap;
    },

    /**
     * Read an image File, downscale it on a canvas and return a JPEG data URL.
     * Keeps localStorage well under quota even for phone photos.
     */
    fileToResizedDataURL(file, maxDim, quality) {
      maxDim = maxDim || 1280;
      quality = quality || 0.82;
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('read failed'));
        reader.onload = () => {
          const img = new Image();
          img.onerror = () => reject(new Error('decode failed'));
          img.onload = () => {
            let w = img.naturalWidth, h = img.naturalHeight;
            const scale = Math.min(1, maxDim / Math.max(w, h));
            w = Math.round(w * scale); h = Math.round(h * scale);
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            try { resolve(canvas.toDataURL('image/jpeg', quality)); }
            catch (e) { reject(e); }
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    },

    /** Show a transient toast (bottom-right). */
    toast(message, type) {
      const wrap = document.getElementById('toastWrap');
      if (!wrap) return;
      const icons = { success: '✅', info: '✨', error: '⚠️' };
      const el = document.createElement('div');
      el.className = 'toast flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium text-white shadow-glow backdrop-blur-xl '
        + (type === 'error' ? 'bg-rose-500/90' : type === 'info' ? 'bg-slate-800/90 dark:bg-slate-700/90' : 'bg-emerald-600/90');
      el.innerHTML = `<span>${icons[type] || icons.info}</span><span>${utils.escapeHtml(message)}</span>`;
      wrap.appendChild(el);
      setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 2200);
    },

    /** Debounce a function. */
    debounce(fn, wait) {
      let t;
      return function () {
        clearTimeout(t);
        const args = arguments, ctx = this;
        t = setTimeout(() => fn.apply(ctx, args), wait);
      };
    }
  };

  Pulse.utils = utils;
})();
