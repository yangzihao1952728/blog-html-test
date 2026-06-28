/* =========================================================
   Pulse · store — seed data + localStorage persistence.
   Single source of truth: window.Pulse.store.
   State shape: { currentUserId, posts: [...] }
   post: { id, authorId, time, text, images:[url...], likes, liked, comments:[{id,authorId,text,time}] }
   ========================================================= */
(function () {
  'use strict';
  const Pulse = (window.Pulse = window.Pulse || {});
  const { uid } = Pulse.utils;

  const STORAGE_KEY = 'pulse_state_v1';

  // ---- Users ----
  const USERS = {
    linxia:  { id: 'linxia',  name: '林夏',   handle: 'linxia',    bio: '在像素与诗意之间游走 · 🌿' },
    chenmo:  { id: 'chenmo',  name: '陈墨',   handle: 'chenmo_ink', bio: '拍点照片，写点字。' },
    sunian:  { id: 'sunian',  name: '苏念',   handle: 'su_nian',   bio: '咖啡因驱动的人类 ☕' },
    aye:     { id: 'aye',     name: '阿野',   handle: 'wildaye',   bio: '山野与代码。' },
    xiaoman: { id: 'xiaoman', name: '小满',   handle: 'xiaoman',   bio: '好好吃饭，慢慢生活。' },
    guchuan: { id: 'guchuan', name: '顾川',   handle: 'guchuan',   bio: '机械键盘 / 极简主义 ⌨️' }
  };

  const CURRENT_USER_ID = 'linxia';

  // ---- Seed posts (minsAgo converted to real timestamps on first load) ----
  const SEED = [
    {
      authorId: 'chenmo', minsAgo: 8,
      text: '清晨的雾还没散，光线穿过树叶像碎金子一样洒下来。这一刻值得被记录。📷',
      images: ['https://picsum.photos/seed/pulse-fog/960/680'],
      likes: 248, liked: false,
      comments: [
        { authorId: 'sunian', minsAgo: 5, text: '太美了吧！这是哪里？' },
        { authorId: 'linxia', minsAgo: 3, text: '光感绝了，求原图当壁纸 🥺' }
      ]
    },
    {
      authorId: 'linxia', minsAgo: 42,
      text: '把项目里的配色从 12 个颜色收敛到了 5 个，整个界面突然就「安静」下来了。\n\n约束即是自由。',
      likes: 86, liked: true, comments: []
    },
    {
      authorId: 'sunian', minsAgo: 95,
      text: '今天的 todo：\n✅ 喝够 2L 水\n✅ 代码 review\n🔲 健身房\n\n第三条总是最难的那一条 😅',
      likes: 312, liked: false,
      comments: [
        { authorId: 'aye', minsAgo: 60, text: '健身房 +1，互相监督！' },
        { authorId: 'xiaoman', minsAgo: 50, text: '先吃饱才有力气练（不是' },
        { authorId: 'guchuan', minsAgo: 12, text: '机械键盘敲起来也算运动吧' }
      ]
    },
    {
      authorId: 'aye', minsAgo: 200,
      text: '周末徒步的小记录。山里的空气是甜的，膝盖是废的。',
      images: ['https://picsum.photos/seed/pulse-mtn1/640/640', 'https://picsum.photos/seed/pulse-mtn2/640/640'],
      likes: 521, liked: false,
      comments: [{ authorId: 'chenmo', minsAgo: 180, text: '第二张构图绝了 👏' }]
    },
    {
      authorId: 'xiaoman', minsAgo: 360,
      text: '认真做了一顿饭。生活不止有代码，还有这锅咕嘟咕嘟的番茄牛腩 🍅',
      images: ['https://picsum.photos/seed/pulse-food/900/600'],
      likes: 174, liked: false, comments: []
    },
    {
      authorId: 'guchuan', minsAgo: 1500,
      text: '入了一把新键盘，声音像下雨。办公室的同事已经在磨刀了，我应该还能多活几天。',
      likes: 689, liked: true,
      comments: [{ authorId: 'sunian', minsAgo: 1200, text: '录个 ASMR 发出来！' }]
    }
  ];

  // ---- Trending & suggestions (decorative sidebar content) ----
  const TRENDING = [
    { tag: '#极简设计', posts: '12.4w' },
    { tag: '#周末去哪儿', posts: '8.1w' },
    { tag: '#今日份治愈', posts: '6.7w' },
    { tag: '#机械键盘', posts: '3.2w' },
    { tag: '#一杯咖啡', posts: '2.9w' }
  ];
  const SUGGEST = ['chenmo', 'sunian', 'aye'];

  let _state = null;
  const _listeners = new Set();

  function emit() { _listeners.forEach((fn) => { try { fn(_state); } catch (e) {} }); }

  function buildSeedState() {
    const now = Date.now();
    const posts = SEED.map((s) => ({
      id: uid(),
      authorId: s.authorId,
      time: now - s.minsAgo * 60000,
      text: s.text,
      images: s.images || [],
      likes: s.likes || 0,
      liked: !!s.liked,
      comments: (s.comments || []).map((c) => ({
        id: uid(), authorId: c.authorId, text: c.text, time: now - c.minsAgo * 60000
      }))
    }));
    posts.sort((a, b) => b.time - a.time);
    return { currentUserId: CURRENT_USER_ID, posts };
  }

  function load() {
    if (_state) return _state;
    let loaded = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.posts)) loaded = parsed;
      }
    } catch (e) { /* ignore corrupt/unavailable storage */ }
    _state = loaded || buildSeedState();
    return _state;
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_state)); }
    catch (e) { Pulse.utils.toast('本地存储已满，新内容未保存', 'error'); }
  }

  const store = {
    USER: USERS,
    TRENDING,
    SUGGEST_IDS: SUGGEST,

    init() { return load(); },
    getState() { return load(); },
    onChange(fn) { _listeners.add(fn); return () => _listeners.delete(fn); },

    getUser(id) { return USERS[id] || { id, name: '匿名', handle: 'anon', bio: '' }; },
    getCurrentUser() { return USERS[load().currentUserId] || USERS[CURRENT_USER_ID]; },

    getPosts() { return load().posts; },
    getPost(id) { return load().posts.find((p) => p.id === id); },

    /** Create a post from the compose box; returns the new post. */
    addPost({ text, images }) {
      const s = load();
      const post = {
        id: uid(),
        authorId: s.currentUserId,
        time: Date.now(),
        text: String(text || '').trim(),
        images: images || [],
        likes: 0, liked: false, comments: []
      };
      s.posts.unshift(post);
      persist(); emit();
      return post;
    },

    deletePost(id) {
      const s = load();
      const i = s.posts.findIndex((p) => p.id === id);
      if (i === -1) return false;
      s.posts.splice(i, 1);
      persist(); emit();
      return true;
    },

    /** Toggle like; returns new liked boolean. */
    toggleLike(id) {
      const p = store.getPost(id);
      if (!p) return false;
      p.liked = !p.liked;
      p.likes += p.liked ? 1 : -1;
      persist(); emit();
      return p.liked;
    },

    addComment(postId, text) {
      const p = store.getPost(postId);
      if (!p) return null;
      const c = { id: uid(), authorId: load().currentUserId, text: String(text).trim(), time: Date.now() };
      p.comments.push(c);
      persist(); emit();
      return c;
    },

    /** Reset everything back to seed (used by a debug hook). */
    reset() {
      _state = buildSeedState();
      persist(); emit();
      return _state;
    }
  };

  Pulse.store = store;
})();
