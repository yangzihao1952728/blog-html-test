/* =========================================================
   Pulse · app — bootstrap + compose box + theme toggle.
   Depends on utils/store/ui (loaded before this file).
   ========================================================= */
(function () {
  'use strict';
  const Pulse = window.Pulse;
  const { store, utils, ui } = Pulse;

  const MAX_IMAGES = 4;
  const MAX_CHARS = 500;
  const pendingImages = []; // data URLs awaiting publish

  const $ = (id) => document.getElementById(id);
  const composeText = $('composeText');
  const composeBox = $('composeBox');
  const composePreview = $('composePreview');
  const imageInput = $('imageInput');
  const postBtn = $('postBtn');
  const charCount = $('charCount');

  /* ---------- current-user avatar in compose box ---------- */
  function paintComposeAvatar() {
    const me = store.getCurrentUser();
    const el = $('composeAvatar');
    el.style.background = utils.avatarGradient(me.name + me.handle);
    el.textContent = utils.initials(me.name);
  }

  /* ---------- textarea auto-resize + char count + validity ---------- */
  function autoresize() {
    composeText.style.height = 'auto';
    composeText.style.height = Math.min(composeText.scrollHeight, 260) + 'px';
  }

  function syncComposer() {
    const len = composeText.value.length;
    const over = len > MAX_CHARS;
    const hasText = composeText.value.trim().length > 0;
    charCount.textContent = `${len}/${MAX_CHARS}`;
    charCount.classList.toggle('text-rose-500', over);
    charCount.classList.toggle('text-slate-400', !over);
    postBtn.disabled = over || (!hasText && pendingImages.length === 0);
  }

  /* ---------- image picker + previews ---------- */
  function renderPreviews() {
    if (!pendingImages.length) {
      composePreview.classList.add('hidden');
      composePreview.innerHTML = '';
      return;
    }
    composePreview.classList.remove('hidden');
    composePreview.innerHTML = pendingImages.map((src, i) => `
      <div class="group relative h-20 w-20 overflow-hidden rounded-xl ring-1 ring-slate-200 dark:ring-white/10">
        <img src="${src}" alt="预览" class="h-full w-full object-cover" />
        <button type="button" data-remove="${i}" class="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-xs text-white opacity-0 group-hover:opacity-100 transition" aria-label="移除">✕</button>
      </div>`).join('');
  }

  async function onImagesPicked(e) {
    const files = Array.from(e.target.files || []).slice(0, MAX_IMAGES);
    e.target.value = ''; // allow re-picking the same file
    if (!files.length) return;
    try {
      for (const f of files) {
        if (pendingImages.length >= MAX_IMAGES) {
          utils.toast(`最多 ${MAX_IMAGES} 张图片`, 'info');
          break;
        }
        if (!f.type.startsWith('image/')) continue;
        const dataUrl = await utils.fileToResizedDataURL(f);
        pendingImages.push(dataUrl);
      }
    } catch (err) {
      utils.toast('图片处理失败', 'error');
    }
    renderPreviews();
    syncComposer();
  }

  /* ---------- publish ---------- */
  function publish() {
    const text = composeText.value.trim();
    if (text.length > MAX_CHARS) return;
    if (!text && !pendingImages.length) return;

    const post = store.addPost({ text, images: pendingImages.slice() });

    // reset composer
    composeText.value = '';
    pendingImages.length = 0;
    renderPreviews();
    autoresize();
    syncComposer();

    ui.prependPost(post);
    ui.renderUserCard(); // refresh "动态 / 获赞" counts
    utils.toast('发布成功 🎉', 'success');
  }

  /* ---------- emoji picker ---------- */
  // Emoji grouped by category so the user can browse and CHOOSE one
  // (this replaces the old random-insert behaviour).
  const EMOJI = {
    '表情': ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😉','😊','😇','🥰','😍','😘','😋','😜','🤪','🤔','🤨','😐','😴','🥱','🤤','😪','😎','🥳','🤩','🥺','😢','😭','😱','😡','🤯','🤗','🤭','🙈'],
    '手势': ['👍','👎','👌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','✋','🤚','👋','🤝','👏','🙌','🙏','💪','👊','🫶'],
    '爱心': ['❤️','🧡','💛','💚','💙','💜','🤎','🖤','🤍','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟'],
    '自然': ['🌸','🌺','🌻','🌹','🌷','🌼','🍀','🌿','🍁','🍃','🌈','☀️','⛅','☁️','🌙','⭐','🌟','✨','🔥','💧','🌊','❄️','⚡','🌳','🌴','🌵','⛰️','🏔️','🌄','🌅'],
    '美食': ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🥑','🥕','🌽','🍔','🍟','🍕','🌭','🍿','🥗','🍜','🍣','🍰','🎂','🍦','🍩','🍪','☕','🍵','🍺','🍷','🧋','🥤'],
    '活动': ['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🏸','🥅','🏒','🎯','🎮','🎲','🧩','🎨','🎭','🎤','🎧','🎵','🎸','🎹','🥁','🏆','🥇','🚀','✈️','🚗','🚲'],
    '物品': ['📷','📸','💻','🖥️','⌨️','🖱️','📱','📲','⌚','💡','🔦','📚','📖','✏️','✒️','🖊️','📌','📎','🎁','🎈','🎉','🎊','💎','🔔','⏰','⌛','💰','🔑','🔒'],
    '符号': ['✅','❌','❓','❗','⭕','🚫','💯','🔴','🟠','🟡','🟢','🔵','🟣','🟤','⚫','⚪','🆕','🆗','♻️','➕','➖','✖️','➗','🔝','🔙','💬','💭','⚠️','🚀','⭐']
  };
  let activeEmojiCat = '表情'; // which category tab is currently shown

  // Build the panel element once and slot it into the compose box
  // (right after the image-preview area, above the toolbar row).
  const emojiPanel = document.createElement('div');
  emojiPanel.className = 'mt-2 hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 p-2';
  composePreview.after(emojiPanel);

  // Re-renders the panel inner HTML for the active category.
  function renderEmojiPanel() {
    const tabs = Object.keys(EMOJI).map((c) =>
      `<button type="button" class="emoji-cat px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition ${
        c === activeEmojiCat ? 'bg-violet-600 text-white shadow' : 'text-slate-500 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10'
      }" data-cat="${c}">${c}</button>`).join('');
    const grid = EMOJI[activeEmojiCat].map((e) =>
      `<button type="button" class="emoji-item grid h-9 place-items-center rounded-lg text-xl leading-none hover:bg-white dark:hover:bg-white/10 active:scale-90 transition" data-emo="${e}">${e}</button>`).join('');
    emojiPanel.innerHTML =
      `<div class="flex gap-1 overflow-x-auto pb-2 mb-1 border-b border-slate-200/70 dark:border-white/5">${tabs}</div>` +
      `<div class="grid grid-cols-8 gap-0.5 max-h-44 overflow-y-auto">${grid}</div>`;
  }

  // Open / close the panel. `force` lets callers set an explicit state.
  function toggleEmojiPanel(force) {
    const open = force != null ? force : emojiPanel.classList.contains('hidden');
    if (open) renderEmojiPanel();           // refresh contents whenever we open
    emojiPanel.classList.toggle('hidden', !open);
  }

  // Insert the chosen emoji at the textarea cursor; keep the panel open so
  // several can be picked in a row.
  function insertEmojiAtCursor(emo) {
    const ta = composeText;
    const s = ta.selectionStart, e = ta.selectionEnd;
    ta.value = ta.value.slice(0, s) + emo + ta.value.slice(e);
    ta.focus();
    ta.selectionStart = ta.selectionEnd = s + emo.length;
    autoresize();
    syncComposer();
  }

  /* ---------- theme ---------- */
  function wireTheme() {
    $('themeToggle').addEventListener('click', () => {
      const isDark = document.documentElement.classList.toggle('dark');
      try { localStorage.setItem('pulse_theme', isDark ? 'dark' : 'light'); } catch (e) {}
    });
  }

  /* ---------- boot ---------- */
  function init() {
    ui.init();
    paintComposeAvatar();

    composeText.addEventListener('input', () => { autoresize(); syncComposer(); });
    $('addImageBtn').addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', onImagesPicked);
    composePreview.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove]');
      if (!btn) return;
      pendingImages.splice(Number(btn.dataset.remove), 1);
      renderPreviews();
      syncComposer();
    });
    // emoji button toggles the picker panel
    $('emojiBtn').addEventListener('click', (ev) => { ev.stopPropagation(); toggleEmojiPanel(); });
    // clicks inside the panel: switch category, or insert the picked emoji
    emojiPanel.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const catBtn = ev.target.closest('.emoji-cat');
      if (catBtn) { activeEmojiCat = catBtn.dataset.cat; renderEmojiPanel(); return; }
      const item = ev.target.closest('.emoji-item');
      if (item) insertEmojiAtCursor(item.dataset.emo);
    });
    // click anywhere outside the panel (and outside the emoji button) closes it
    document.addEventListener('click', (ev) => {
      if (emojiPanel.classList.contains('hidden')) return;
      if (!emojiPanel.contains(ev.target) && !ev.target.closest('#emojiBtn')) {
        emojiPanel.classList.add('hidden');
      }
    });
    // Escape closes the panel
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && !emojiPanel.classList.contains('hidden')) emojiPanel.classList.add('hidden');
    });
    postBtn.addEventListener('click', publish);
    composeText.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); if (!postBtn.disabled) publish(); }
    });

    $('composeJumpBtn').addEventListener('click', () => {
      composeBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => composeText.focus(), 400);
    });

    wireTheme();
    syncComposer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
