/* =========================================================
   Pulse · ui — renders the feed/sidebars and handles all
   in-feed interactions via event delegation.
   Targeted DOM updates (like/comment/delete) avoid full
   re-renders so the comment input never loses focus.
   ========================================================= */
(function () {
  'use strict';
  const Pulse = window.Pulse;
  const { store, utils } = Pulse;

  let currentFilter = 'all';
  const feedEl = () => document.getElementById('feed');

  /* ----------------- card fragments ----------------- */
  function imageGridHTML(images) {
    const n = (images || []).length;
    if (!n) return '';
    const single = n === 1;
    const cols = n === 4 ? 2 : n; // 1,2,3 → n columns; 4 → 2×2
    const items = images.map((src) => `
      <button type="button" class="lb-trigger block w-full overflow-hidden ${single ? 'rounded-2xl' : 'rounded-xl'} bg-slate-100 dark:bg-white/5" data-full="${utils.escapeHtml(src)}">
        <img src="${utils.escapeHtml(src)}" alt="动态图片" loading="lazy"
             class="w-full h-full object-cover ${single ? 'max-h-[28rem] mx-auto' : 'aspect-square'}" />
      </button>`).join('');
    return `<div class="img-grid mt-3 grid gap-1.5 ${single ? 'grid-cols-1' : 'grid-cols-' + cols}">${items}</div>`;
  }

  function commentItemHTML(c) {
    const u = store.getUser(c.authorId);
    const cover = utils.avatarGradient(u.name + u.handle);
    return `
      <li class="flex gap-2.5" data-cid="${c.id}">
        <span class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white" style="background:${cover}">${utils.escapeHtml(utils.initials(u.name))}</span>
        <div class="min-w-0 flex-1">
          <div class="inline-block rounded-2xl bg-slate-100 dark:bg-white/5 px-3 py-2">
            <span class="mr-1.5 text-sm font-semibold">${utils.escapeHtml(u.name)}</span>
            <span class="text-sm break-anywhere">${utils.textToHtml(c.text)}</span>
          </div>
          <div class="mt-1 ml-3 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
            <span data-time="${c.time}">${utils.formatRelativeTime(c.time)}</span>
            <button class="hover:text-violet-500 transition" data-action="focus-comment">回复</button>
          </div>
        </div>
      </li>`;
  }

  function commentsBlockHTML(post) {
    const u = store.getCurrentUser();
    const cover = utils.avatarGradient(u.name + u.handle);
    const items = post.comments.map(commentItemHTML).join('');
    return `
      <div class="comments-wrap mt-4 border-t border-slate-100 dark:border-white/5 pt-4 hidden" data-role="comments">
        <ul class="comments-inner space-y-3.5" data-role="comment-list">${items}</ul>
        <form class="mt-3 flex items-center gap-2" data-role="comment-form">
          <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style="background:${cover}">${utils.escapeHtml(utils.initials(u.name))}</span>
          <input type="text" class="input-field !py-2" placeholder="说点什么…" maxlength="300" data-role="comment-input" />
          <button type="submit" class="btn-primary !px-4 !py-2 shrink-0">发送</button>
        </form>
      </div>`;
  }

  function postCardHTML(post, animate) {
    const u = store.getUser(post.authorId);
    const me = store.getCurrentUser();
    const isMine = post.authorId === me.id;
    const cover = utils.avatarGradient(u.name + u.handle);

    return `
      <article class="card ${animate ? 'post-enter' : ''} p-5" data-id="${post.id}">
        <header class="flex items-start gap-3">
          <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold text-white shadow ring-2 ring-white dark:ring-slate-900" style="background:${cover}">${utils.escapeHtml(utils.initials(u.name))}</span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <span class="font-bold truncate">${utils.escapeHtml(u.name)}</span>
              ${isMine ? '<span class="chip !py-0 !text-[10px] !bg-violet-100 !text-violet-600 dark:!bg-violet-500/15 dark:!text-violet-300">我</span>' : ''}
            </div>
            <div class="text-xs text-slate-400 dark:text-slate-500">@${utils.escapeHtml(u.handle)} · <span data-time="${post.time}">${utils.formatRelativeTime(post.time)}</span></div>
          </div>
          ${isMine ? `
          <div class="relative" data-role="menu">
            <button class="icon-btn !px-2 -mt-1" data-action="menu" aria-label="更多">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
            </button>
            <div class="menu-panel hidden absolute right-0 z-10 mt-1 w-28 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 p-1 shadow-lg">
              <button class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition" data-action="delete">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"/></svg>
                删除
              </button>
            </div>
          </div>` : ''}
        </header>

        ${post.text ? `<div class="mt-3 whitespace-pre-wrap break-anywhere leading-relaxed text-[15px]">${utils.textToHtml(post.text)}</div>` : ''}
        ${imageGridHTML(post.images)}

        <footer class="mt-4 flex items-center gap-1 -ml-2.5 text-slate-500 dark:text-slate-400">
          <button class="like-btn icon-btn ${post.liked ? 'is-liked' : ''}" data-action="like">
            <svg class="heart h-[18px] w-[18px]" viewBox="0 0 24 24" fill="${post.liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>
            <span data-role="like-count" class="tabular-nums">${utils.formatCount(post.likes)}</span>
          </button>
          <button class="icon-btn" data-action="toggle-comments">
            <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6A8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z"/></svg>
            <span data-role="comment-count" class="tabular-nums">${post.comments.length}</span>
          </button>
          <button class="icon-btn" data-action="share">
            <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8M16 6l-4-4-4 4M12 2v14"/></svg>
            <span>分享</span>
          </button>
        </footer>

        ${commentsBlockHTML(post)}
      </article>`;
  }

  /* ----------------- renderers ----------------- */
  function renderUserCard() {
    const host = document.getElementById('userCard');
    if (!host) return;
    const u = store.getCurrentUser();
    const mine = store.getPosts().filter((p) => p.authorId === u.id);
    const likes = mine.reduce((s, p) => s + p.likes, 0);
    const cover = utils.avatarGradient(u.name + u.handle);

    host.innerHTML = `
      <div class="h-20" style="background:${cover}"></div>
      <div class="px-5 pb-5 -mt-9">
        <span class="grid h-16 w-16 place-items-center rounded-2xl text-xl font-extrabold text-white shadow-lg ring-4 ring-white dark:ring-slate-900" style="background:${cover}">${utils.escapeHtml(utils.initials(u.name))}</span>
        <h2 class="mt-2.5 text-lg font-extrabold leading-tight">${utils.escapeHtml(u.name)}</h2>
        <p class="text-sm text-slate-400 dark:text-slate-500">@${utils.escapeHtml(u.handle)}</p>
        <p class="mt-1.5 text-sm text-slate-600 dark:text-slate-300">${utils.escapeHtml(u.bio)}</p>
        <div class="mt-4 grid grid-cols-3 divide-x divide-slate-200/70 dark:divide-white/10 rounded-2xl bg-slate-50 dark:bg-white/5 py-3 text-center">
          <div><div class="font-bold">${mine.length}</div><div class="text-xs text-slate-400">动态</div></div>
          <div><div class="font-bold">${utils.formatCount(likes)}</div><div class="text-xs text-slate-400">获赞</div></div>
          <div><div class="font-bold">128</div><div class="text-xs text-slate-400">关注</div></div>
        </div>
      </div>`;
  }

  function renderSidebars() {
    const trending = document.getElementById('trendingList');
    if (trending) {
      trending.innerHTML = store.TRENDING.map((t, i) => `
        <li class="flex items-center gap-3 cursor-pointer group">
          <span class="w-4 text-sm font-bold ${i < 3 ? 'text-rose-500' : 'text-slate-300 dark:text-slate-600'}">${i + 1}</span>
          <div class="min-w-0">
            <div class="font-semibold text-sm group-hover:text-violet-500 transition truncate">${utils.escapeHtml(t.tag)}</div>
            <div class="text-xs text-slate-400">${t.posts} 讨论</div>
          </div>
        </li>`).join('');
    }
    const suggest = document.getElementById('suggestList');
    if (suggest) {
      suggest.innerHTML = store.SUGGEST_IDS.map((id) => {
        const u = store.getUser(id);
        const cover = utils.avatarGradient(u.name + u.handle);
        return `
          <li class="flex items-center gap-3">
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style="background:${cover}">${utils.escapeHtml(utils.initials(u.name))}</span>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-semibold truncate">${utils.escapeHtml(u.name)}</div>
              <div class="text-xs text-slate-400 truncate">@${utils.escapeHtml(u.handle)}</div>
            </div>
            <button class="chip !bg-slate-900 !text-white dark:!bg-white dark:!text-slate-900 hover:scale-105 transition" data-action="follow" data-name="${utils.escapeHtml(u.name)}">关注</button>
          </li>`;
      }).join('');
    }
  }

  function visiblePosts() {
    const posts = store.getPosts();
    if (currentFilter === 'text') return posts.filter((p) => !p.images.length);
    if (currentFilter === 'image') return posts.filter((p) => p.images.length);
    return posts;
  }

  function updateCount() {
    const el = document.getElementById('postCount');
    if (el) el.textContent = store.getPosts().length;
  }

  function renderFeed(animate) {
    const feed = feedEl();
    if (!feed) return;
    const posts = visiblePosts();
    if (!posts.length) {
      feed.innerHTML = `
        <div class="card p-10 text-center text-slate-400 dark:text-slate-500">
          <div class="text-5xl mb-3">🌱</div>
          <p class="font-medium">这里还空空如也</p>
          <p class="text-sm mt-1">${currentFilter === 'all' ? '来发布第一条动态吧！' : '换个筛选条件试试～'}</p>
        </div>`;
      updateCount();
      return;
    }
    feed.innerHTML = posts.map((p) => postCardHTML(p, animate)).join('');
    updateCount();
  }

  /** Update relative-time text without rebuilding the feed (keeps focus). */
  function refreshTimes() {
    document.querySelectorAll('[data-time]').forEach((el) => {
      el.textContent = utils.formatRelativeTime(Number(el.dataset.time));
    });
  }

  function setFilterChips(filter) {
    document.querySelectorAll('.filter-chip').forEach((c) => {
      const on = c.dataset.filter === filter;
      c.classList.toggle('!bg-violet-600', on);
      c.classList.toggle('!text-white', on);
    });
  }

  /* ----------------- targeted updates ----------------- */
  function applyFilter(filter) {
    currentFilter = filter;
    setFilterChips(filter);
    renderFeed(false);
  }

  function prependPost(post) {
    // reset to "all" so the new post is always visible, then animate just it
    currentFilter = 'all';
    setFilterChips('all');
    renderFeed(false);
    const first = feedEl().firstElementChild;
    if (first) {
      first.classList.add('post-enter');
      first.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function appendComment(card, comment) {
    const wrap = card.querySelector('[data-role="comments"]');
    const list = card.querySelector('[data-role="comment-list"]');
    if (wrap) wrap.classList.remove('hidden');
    if (list) {
      const tmp = document.createElement('div');
      tmp.innerHTML = commentItemHTML(comment);
      list.appendChild(tmp.firstElementChild);
    }
    const cnt = card.querySelector('[data-role="comment-count"]');
    if (cnt) cnt.textContent = Number(cnt.textContent || 0) + 1;
  }

  /* ----------------- events (delegated) ----------------- */
  function closeAllMenus() {
    document.querySelectorAll('.menu-panel:not(.hidden)').forEach((m) => m.classList.add('hidden'));
  }

  function onFeedClick(e) {
    const card = e.target.closest('[data-id]');
    const act = e.target.closest('[data-action]');

    if (!act) {
      const lb = e.target.closest('.lb-trigger');
      if (lb) openLightbox(lb.dataset.full);
      return;
    }
    const action = act.dataset.action;

    if (action === 'menu') {
      e.stopPropagation();
      const panel = act.nextElementSibling;
      const willOpen = panel.classList.contains('hidden');
      closeAllMenus();
      if (willOpen) panel.classList.remove('hidden');
      return;
    }
    if (action === 'delete') {
      closeAllMenus();
      if (!card || !confirm('确定删除这条动态吗？')) return;
      store.deletePost(card.dataset.id);
      card.classList.add('post-leave');
      card.addEventListener('animationend', () => { card.remove(); updateCount(); renderUserCard(); }, { once: true });
      utils.toast('动态已删除', 'info');
      return;
    }
    if (action === 'like') {
      const liked = store.toggleLike(card.dataset.id);
      act.classList.toggle('is-liked', liked);
      const heart = act.querySelector('.heart');
      heart.setAttribute('fill', liked ? 'currentColor' : 'none');
      const p = store.getPost(card.dataset.id);
      const cnt = act.querySelector('[data-role="like-count"]');
      if (cnt && p) cnt.textContent = utils.formatCount(p.likes);
      // retrigger the heart pop animation
      heart.style.animation = 'none';
      void heart.offsetWidth;
      heart.style.animation = '';
      return;
    }
    if (action === 'toggle-comments') {
      const wrap = card.querySelector('[data-role="comments"]');
      if (!wrap) return;
      const wasHidden = wrap.classList.contains('hidden');
      wrap.classList.toggle('hidden');
      if (wasHidden) {
        const input = wrap.querySelector('[data-role="comment-input"]');
        if (input) input.focus();
      }
      return;
    }
    if (action === 'focus-comment') {
      const wrap = card.querySelector('[data-role="comments"]');
      if (wrap) wrap.classList.remove('hidden');
      const input = card.querySelector('[data-role="comment-input"]');
      if (input) input.focus();
      return;
    }
    if (action === 'share') {
      const url = location.origin + location.pathname + '#post-' + card.dataset.id;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(
          () => utils.toast('分享链接已复制', 'success'),
          () => utils.toast('已生成分享链接', 'info')
        );
      } else utils.toast('已生成分享链接', 'info');
      return;
    }
  }

  function onFeedSubmit(e) {
    const form = e.target.closest('[data-role="comment-form"]');
    if (!form) return;
    e.preventDefault();
    const card = form.closest('[data-id]');
    const input = form.querySelector('[data-role="comment-input"]');
    const text = (input.value || '').trim();
    if (!text) return;
    const c = store.addComment(card.dataset.id, text);
    input.value = '';
    appendComment(card, c);
    utils.toast('评论已发送', 'success');
  }

  /* ----------------- lightbox ----------------- */
  function openLightbox(src) {
    const lb = document.getElementById('lightbox');
    document.getElementById('lightboxImg').src = src;
    lb.classList.remove('hidden');
    lb.classList.add('flex');
  }
  function closeLightbox() {
    const lb = document.getElementById('lightbox');
    lb.classList.add('hidden');
    lb.classList.remove('flex');
  }

  /* ----------------- public API ----------------- */
  function init() {
    store.init();
    renderUserCard();
    renderSidebars();
    renderFeed(true);

    const feed = feedEl();
    feed.addEventListener('click', onFeedClick);
    feed.addEventListener('submit', onFeedSubmit);

    document.querySelectorAll('.filter-chip').forEach((chip) => {
      chip.addEventListener('click', () => applyFilter(chip.dataset.filter));
    });

    // sidebar "关注" buttons live outside #feed
    const suggest = document.getElementById('suggestList');
    if (suggest) suggest.addEventListener('click', (e) => {
      const b = e.target.closest('[data-action="follow"]');
      if (!b) return;
      utils.toast('已关注 ' + b.dataset.name, 'success');
      b.textContent = '已关注';
      b.disabled = true;
      b.classList.add('!opacity-60');
    });

    document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
    document.getElementById('lightbox').addEventListener('click', (e) => {
      if (e.target.id === 'lightbox') closeLightbox();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });

    // outside click closes any open post menu
    document.addEventListener('click', closeAllMenus);

    // keep relative times fresh without disrupting the comment input
    setInterval(refreshTimes, 60000);
  }

  Pulse.ui = { init, renderFeed, renderUserCard, prependPost, updateCount };
})();
