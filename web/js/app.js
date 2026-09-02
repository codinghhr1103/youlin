import { GUIDE_SECTIONS } from "./guide.js";

const TOKEN_KEY = "youlin_token";
const USER_KEY = "youlin_user";

const state = {
  user: JSON.parse(localStorage.getItem(USER_KEY) || "null"),
  token: localStorage.getItem(TOKEN_KEY),
};

function saveSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  state.token = null;
  state.user = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(`/api${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.detail;
    let message = "请求失败";
    if (typeof detail === "string") message = detail;
    else if (Array.isArray(detail) && detail.length) {
      message = String(detail[0].msg || detail[0]).replace(/^Value error,\s*/i, "");
    }
    throw new Error(message);
  }
  return data;
}

function navigate(path) {
  history.pushState(null, "", path);
  render();
}

function scrollToHash() {
  const id = decodeURIComponent(location.hash.replace(/^#/, ""));
  if (!id) return;
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function qs(sel, root = document) {
  return root.querySelector(sel);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatTime(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function stampCard(stamp, extra = "") {
  const photo = stamp.image_path
    ? `<img class="stamp-photo" src="${escapeHtml(stamp.image_path)}" alt="${escapeHtml(stamp.name)}" />`
    : `<div class="stamp-mark">${escapeHtml(stamp.mark)}</div>`;
  return `
    <article class="stamp" style="--ink-color:${stamp.color}" data-stamp="${stamp.id}">
      <div class="stamp-face ${stamp.image_path ? "has-photo" : ""}">
        <div class="stamp-meta"><span>${escapeHtml(stamp.catalog_no)}</span><span>${stamp.year}</span></div>
        ${photo}
        <div class="stamp-name">${escapeHtml(stamp.name)}</div>
        <div class="stamp-value">${escapeHtml(stamp.face_value)} · ${escapeHtml(stamp.theme)}</div>
      </div>
      <div class="postmark">邮邻</div>
      ${extra}
    </article>
  `;
}

function layout(inner, active) {
  const authed = Boolean(state.user);
  return `
    <header class="topbar">
      <a class="brand" href="/" data-link>
        <strong>邮邻</strong>
        <span>YOULIN</span>
      </a>
      <nav class="nav">
        <a href="/explore" data-link class="${active === "explore" ? "active" : ""}">目录</a>
        <a href="/guide" data-link class="${active === "guide" ? "active" : ""}">入门</a>
        <a href="/feed" data-link class="${active === "feed" ? "active" : ""}">晒票</a>
        <a href="/album" data-link class="${active === "album" ? "active" : ""}">我的邮册</a>
        <a href="/swap" data-link class="${active === "swap" ? "active" : ""}">交换</a>
        ${state.user?.role === "admin" ? `<a href="/admin" data-link class="${active === "admin" ? "active" : ""}">管理</a>` : ""}
      </nav>
      <div class="userchip">
        ${
          authed
            ? `<a href="/u/${encodeURIComponent(state.user.username)}" data-link>${escapeHtml(state.user.display_name)}</a>
               <button class="ghost" id="logout">退出</button>`
            : `<a class="ghost" href="/login" data-link>登录</a>
               <a class="btn" href="/register" data-link>加入</a>`
        }
      </div>
    </header>
    <main class="wrap">${inner}</main>
  `;
}

function landingView() {
  return `
    <section class="hero">
      <div>
        <div class="kicker">方寸之间 · 遇见同好</div>
        <h1>给年轻集邮者的<br/>收藏与社交园地</h1>
        <p class="lede">
          不是行情站，也不做拍卖行。邮邻从海关大龙讲起：整理数字邮册、晒出一枚票的故事，
          再按「我有复品 / 我想要」找到可以交换的人。
        </p>
        <div class="hero-actions">
          <a class="btn" href="${state.user ? "/feed" : "/register"}" data-link>${state.user ? "去晒票" : "开始集邮"}</a>
          <a class="ghost" href="/guide" data-link>集邮入门</a>
          <a class="ghost" href="/explore" data-link>查目录</a>
        </div>
      </div>
      <div class="hero-stamps" id="hero-stamps"></div>
    </section>
    <section class="section-title">
      <div>
        <h2>这里不谈涨跌</h2>
        <p class="muted">记录、欣赏、交换。把邮票从货架上拿回册子里。</p>
      </div>
    </section>
    <div class="grid home-cards">
      <article class="card">
        <h3>数字邮册</h3>
        <p class="muted">给每枚票标记「我有」「想要」「可换」，专题一目了然。</p>
      </article>
      <article class="card">
        <h3>晒票</h3>
        <p class="muted">写一枚票为什么留下来。齿孔、实寄、小学时的窗口。</p>
      </article>
      <article class="card">
        <h3>可信交换</h3>
        <p class="muted">系统匹配缺品和复品，双方确认后再互换。不做担保交易。</p>
      </article>
      <a class="card" href="/guide" data-link>
        <h3>集邮入门</h3>
        <p class="muted">背胶、齿孔、大版小版、老纪特和编年，先认这些词。</p>
      </a>
    </div>
  `;
}

function authView(mode) {
  if (mode === "login") {
    return `
      <div class="auth-layout">
        <form class="panel form auth-card" id="auth-form" onsubmit="return false">
          <div class="kicker">账户登录</div>
          <h2 style="font-family:var(--serif);margin:8px 0 0">欢迎回来</h2>
          <p class="muted">使用用户名、邮箱或手机号登录。</p>
          <label>账号
            <input name="identifier" autocomplete="username" placeholder="用户名 / 邮箱 / 手机号" required />
          </label>
          <label>密码
            <input name="password" type="password" autocomplete="current-password" placeholder="请输入密码" required />
          </label>
          <button class="btn" type="submit">登录</button>
          <p class="flash" id="auth-error"></p>
          <p class="tiny">还没有账号？<a href="/register" data-link>注册邮邻</a></p>
        </form>
      </div>
    `;
  }
  return `
    <div class="auth-layout">
      <form class="panel form auth-card" id="auth-form" onsubmit="return false">
        <div class="kicker">创建账号</div>
        <h2 style="font-family:var(--serif);margin:8px 0 0">加入邮邻</h2>
        <p class="muted">填写联系方式以便账号找回与站内通知。目前不会发送短信或邮件验证码。</p>
        <label>称呼
          <input name="display_name" placeholder="怎么称呼你" required />
        </label>
        <label>用户名
          <input name="username" autocomplete="username" placeholder="字母开头，可含数字和下划线" required />
        </label>
        <label>城市
          <input name="city" placeholder="例如杭州" />
        </label>
        <div class="contact-switch" id="contact-switch">
          <button type="button" class="chip active" data-type="email">邮箱</button>
          <button type="button" class="chip" data-type="phone">手机号</button>
        </div>
        <input type="hidden" name="contact_type" value="email" />
        <label id="contact-label">邮箱
          <input name="contact" type="email" placeholder="you@example.com" required />
        </label>
        <label>密码
          <input name="password" type="password" autocomplete="new-password" minlength="8" placeholder="至少 8 位" required />
        </label>
        <label>确认密码
          <input name="password_confirm" type="password" autocomplete="new-password" minlength="8" placeholder="再输入一次" required />
        </label>
        <label>集邮简介（选填）
          <textarea name="bio" placeholder="你在集什么？"></textarea>
        </label>
        <label class="agree">
          <input type="checkbox" name="agree" value="true" required />
          <span>我已阅读并同意 <a href="/terms" data-link>用户协议</a> 与隐私政策</span>
        </label>
        <button class="btn" type="submit">注册并进入</button>
        <p class="flash" id="auth-error"></p>
        <p class="tiny">已经有邮册了？<a href="/login" data-link>登录</a></p>
      </form>
    </div>
  `;
}

async function renderLanding(root) {
  root.innerHTML = layout(landingView(), "home");
  const stamps = await api("/stamps");
  qs("#hero-stamps").innerHTML = stamps.slice(0, 4).map((s) => stampCard(s)).join("");
}

async function renderAuth(root, mode) {
  root.innerHTML = layout(authView(mode), "");
  const switcher = qs("#contact-switch");
  if (switcher) {
    switcher.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-type]");
      if (!btn) return;
      switcher.querySelectorAll(".chip").forEach((chip) => chip.classList.remove("active"));
      btn.classList.add("active");
      qs("input[name=contact_type]").value = btn.dataset.type;
      const isEmail = btn.dataset.type === "email";
      qs("#contact-label").innerHTML = isEmail
        ? `邮箱<input name="contact" type="email" placeholder="you@example.com" required />`
        : `手机号<input name="contact" type="tel" placeholder="11 位中国大陆手机号" required />`;
    });
  }
  qs("#auth-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    const error = qs("#auth-error");
    try {
      if (mode === "register") {
        if (form.get("password") !== form.get("password_confirm")) {
          error.textContent = "两次输入的密码不一致";
          return;
        }
        const data = await api("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            username: form.get("username"),
            display_name: form.get("display_name"),
            password: form.get("password"),
            contact_type: form.get("contact_type"),
            contact: form.get("contact"),
            city: form.get("city") || "",
            bio: form.get("bio") || "",
            agree: form.get("agree") === "true",
          }),
        });
        saveSession(data.token, data.user);
        navigate("/feed");
        return;
      }
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          identifier: form.get("identifier"),
          password: form.get("password"),
        }),
      });
      saveSession(data.token, data.user);
      navigate(data.user.role === "admin" ? "/admin" : "/feed");
    } catch (err) {
      error.textContent = err.message;
    }
  });
}

function termsView() {
  return `
    <article class="panel legal">
      <div class="kicker">YOULIN</div>
      <h2 style="font-family:var(--serif)">用户协议与隐私政策（摘要）</h2>
      <p>邮邻是个人非经营性集邮社区原型，不收费、不担保交易、不提供支付。</p>
      <p>注册时收集的用户名、称呼、城市、简介，以及你选择的邮箱或手机号，仅用于登录、账号识别和站内通知预留。目前不会向你的邮箱或手机发送验证码。</p>
      <p>你可以随时申请更正资料或停用账号。管理员有权处理违法信息和停用违规账号。</p>
      <p class="tiny"><a href="/register" data-link>返回注册</a></p>
    </article>
  `;
}

async function renderAdmin(root) {
  requireAuth();
  if (state.user.role !== "admin") {
    root.innerHTML = layout(`<div class="empty">需要管理员权限。</div>`, "admin");
    return;
  }
  const users = await api("/admin/users");
  root.innerHTML = layout(
    `
      <div class="section-title">
        <div>
          <h2>用户管理</h2>
          <p class="muted">查看注册用户，停用或恢复账号。不会发送短信或邮件。</p>
        </div>
      </div>
      <div class="table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>用户</th>
              <th>联系方式</th>
              <th>角色</th>
              <th>状态</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${users
              .map(
                (user) => `
              <tr>
                <td>
                  <strong>${escapeHtml(user.display_name)}</strong>
                  <div class="tiny">@${escapeHtml(user.username)} · ${escapeHtml(user.city || "未填城市")}</div>
                </td>
                <td class="tiny">${escapeHtml(user.email || user.phone || "—")}</td>
                <td>${user.role === "admin" ? "管理员" : "成员"}</td>
                <td>${user.banned ? "已停用" : "正常"}</td>
                <td>
                  ${
                    user.role === "admin"
                      ? `<span class="tiny">—</span>`
                      : user.banned
                        ? `<button class="btn unban" data-id="${user.id}">恢复</button>`
                        : `<button class="ghost ban" data-id="${user.id}">停用</button>`
                  }
                </td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `,
    "admin"
  );
  root.querySelectorAll(".ban").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await api(`/admin/users/${btn.dataset.id}/ban`, { method: "POST" });
      await render();
    });
  });
  root.querySelectorAll(".unban").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await api(`/admin/users/${btn.dataset.id}/unban`, { method: "POST" });
      await render();
    });
  });
}

const CATALOG_GROUPS = [
  {
    title: "国内用户",
    intro: "查中国邮票请用官方志号。下面三处分别覆盖在线图典、志号检索和权威纸质目录说明。",
    items: [
      {
        name: "StampDIR 邮趣目录图典",
        href: "http://www.stampdir.cn/",
        host: "stampdir.cn",
        blurb: "两岸四地邮票、版张、首日封、纪念戳和邮资封片的在线图典，可按志号、系列和主题筛选。",
      },
      {
        name: "大众邮藏 · 志号检索",
        href: "https://postalwiki.cn/index.php/site/fcsearch?smode=1&svalue=0",
        host: "postalwiki.cn",
        blurb: "中文 Wiki 式目录，按纪、特、J、T、编年等志号检索新中国邮票。",
      },
      {
        name: "集邮总公司 · 目录书目说明",
        href: "https://www.chinapost.com.cn/html1/report/181428/6409-1.htm",
        host: "chinapost.com.cn",
        blurb: "《中华人民共和国邮票目录》由人民邮电出版社出版，资料以发行通告为准。这是书目介绍页，没有完整免费在线版。",
      },
    ],
  },
  {
    title: "世界票对照",
    intro: "对照各国邮票、交叉编号时用社区目录。邮邻优先推荐 Colnect。",
    items: [
      {
        name: "Colnect",
        href: "https://colnect.com/zh/stamps",
        host: "colnect.com",
        preferred: true,
        blurb: "免费浏览的世界邮票库，可按国家、年份检索，并常附 Scott、Michel、Gibbons、Yvert 交叉编号。",
      },
      {
        name: "StampWorld",
        href: "https://www.stampworld.com/zh/",
        host: "stampworld.com",
        blurb: "体量很大的社区图库与收藏夹，适合快速对照票图。",
      },
    ],
  },
  {
    title: "官方真伪",
    intro: "万国邮联对成员国正式发行邮票的登记，用来核验是否为官方票，不是行情目录。",
    items: [
      {
        name: "WNS 万国邮联编号系统",
        href: "https://www.wnsstamps.post/",
        host: "wnsstamps.post",
        warning: true,
        blurb: "收录 2002 年起各成员国正式发行的邮票。中国约在 2004 年后不再完整登记，近年中国新邮不能只靠这里核验。",
      },
    ],
  },
  {
    title: "四大商业目录",
    intro: "国际集邮界常用的编号权威。编号体系受版权保护，且多为付费墙。邮邻只放官网入口，不镜像编号，也不报行情。",
    items: [
      {
        name: "Scott Catalogue",
        href: "https://www.amosadvantage.com/product/scott-catalogues-of-postage-stamps",
        host: "amosadvantage.com",
        paid: true,
        blurb: "美国与世界六卷标准目录。编号受版权保护，完整内容需订阅。",
      },
      {
        name: "Michel（MICHEL）",
        href: "https://shop.briefmarken.de/en/michel-online/database-michel-online-standard",
        host: "briefmarken.de",
        paid: true,
        blurb: "德国、欧洲与世界目录，齿孔、水印和变体较细。在线数据库需订阅。",
      },
      {
        name: "Stanley Gibbons",
        href: "https://legacy.stanleygibbons.com/publishing/digital-catalogues",
        host: "stanleygibbons.com",
        paid: true,
        blurb: "英国与英联邦的常用目录，也有世界卷。数字目录需登录购买。",
      },
      {
        name: "Yvert et Tellier",
        href: "https://www.yvert.com/",
        host: "yvert.com",
        paid: true,
        blurb: "法国、法属殖民地与世界目录。在线图书馆为付费订阅。",
      },
    ],
  },
];

function catalogTag(item) {
  if (item.preferred) return `<span class="catalog-tag preferred">首选</span>`;
  if (item.warning) return `<span class="catalog-tag warning">中国近年不完整</span>`;
  if (item.paid) return `<span class="catalog-tag paid">官网入口 · 付费</span>`;
  return "";
}

function catalogCard(item) {
  return `
    <a class="catalog-card" href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer">
      <div class="catalog-card-head">
        <h3>${escapeHtml(item.name)}</h3>
        ${catalogTag(item)}
      </div>
      <p>${escapeHtml(item.blurb)}</p>
      <span class="catalog-host">${escapeHtml(item.host)} ↗</span>
    </a>
  `;
}

async function renderExplore(root) {
  root.innerHTML = layout(
    `
      <div class="section-title">
        <div>
          <h2>邮票目录</h2>
          <p class="muted">邮邻不自建世界目录，也不收录当代票图。查票、对照志号请用下面这些公开或商业目录。名词不熟的话，可先看 <a href="/guide" data-link>集邮入门</a>。</p>
        </div>
      </div>
      <div class="catalog-page">
        ${CATALOG_GROUPS.map(
          (group) => `
            <section class="catalog-group">
              <div class="catalog-group-head">
                <h3>${escapeHtml(group.title)}</h3>
                <p class="muted">${escapeHtml(group.intro)}</p>
              </div>
              <div class="catalog-links">${group.items.map(catalogCard).join("")}</div>
            </section>
          `
        ).join("")}
      </div>
    `,
    "explore"
  );
}

function guideEntry(entry) {
  return `
    <article class="guide-entry" id="${escapeHtml(entry.id)}">
      <h4>${escapeHtml(entry.title)}</h4>
      <p>${escapeHtml(entry.body)}</p>
      <p class="guide-note"><span>新手易混</span>${escapeHtml(entry.note)}</p>
    </article>
  `;
}

async function renderGuide(root) {
  root.innerHTML = layout(
    `
      <div class="section-title">
        <div>
          <h2>集邮入门</h2>
          <p class="muted">给刚拿起放大镜的人。讲名词，不报行情，也不做鉴定。</p>
        </div>
      </div>
      <div class="guide-toc" id="guide-toc">
        ${GUIDE_SECTIONS.map(
          (section) =>
            `<a class="chip" href="/guide#${encodeURIComponent(section.id)}" data-link>${escapeHtml(section.title)}</a>`
        ).join("")}
      </div>
      <input class="search" id="guide-search" placeholder="搜背胶、齿孔、编年、小版张…" />
      <div class="guide-page" id="guide-page">
        ${GUIDE_SECTIONS.map(
          (section) => `
            <section class="guide-section" id="${escapeHtml(section.id)}">
              <div class="catalog-group-head">
                <h3>${escapeHtml(section.title)}</h3>
                <p class="muted">${escapeHtml(section.intro)}</p>
              </div>
              <div class="guide-entries">${section.entries.map(guideEntry).join("")}</div>
            </section>
          `
        ).join("")}
        <p class="tiny guide-foot">这是入门说明，方便大家用同一套词说话。具体到某一枚票，仍以目录和实物为准。</p>
      </div>
    `,
    "guide"
  );
  const search = qs("#guide-search");
  const page = qs("#guide-page");
  const applyFilter = () => {
    const q = search.value.trim().toLowerCase();
    page.querySelectorAll(".guide-section").forEach((section) => {
      let visible = 0;
      section.querySelectorAll(".guide-entry").forEach((entry) => {
        const hit = !q || entry.textContent.toLowerCase().includes(q);
        entry.hidden = !hit;
        if (hit) visible += 1;
      });
      section.hidden = visible === 0;
    });
  };
  search.addEventListener("input", applyFilter);
}

async function renderFeed(root) {
  requireAuth();
  const [posts, mine] = await Promise.all([api("/posts"), api("/me/collection")]);
  const owned = mine.filter((item) => item.status === "own" || item.status === "swap");
  root.innerHTML = layout(
    `
      <div class="section-title">
        <div>
          <h2>晒票</h2>
          <p class="muted">一枚票可以只是纸，也可以是一段日子。</p>
        </div>
      </div>
      <form class="panel composer" id="composer">
        <textarea name="body" placeholder="今天想讲哪一枚票？" required></textarea>
        <div class="row">
          <select name="stamp_id">
            <option value="">不附票</option>
            ${owned
              .map(
                (item) =>
                  `<option value="${item.stamp.id}">${escapeHtml(item.stamp.name)} · ${escapeHtml(item.stamp.catalog_no)}</option>`
              )
              .join("")}
          </select>
          <button class="btn" type="submit">贴上</button>
        </div>
        <p class="flash" id="composer-error"></p>
      </form>
      <div class="feed" style="margin-top:18px">
        ${
          posts.length
            ? posts
                .map(
                  (post) => `
            <article class="card post" data-post="${post.id}">
              ${post.stamp ? stampCard(post.stamp) : `<div></div>`}
              <div class="post-body">
                <div class="tiny"><a href="/u/${encodeURIComponent(post.author.username)}" data-link>${escapeHtml(post.author.display_name)}</a> · ${formatTime(post.created_at)} · ${escapeHtml(post.author.city || "未知城市")}</div>
                <p>${escapeHtml(post.body)}</p>
                <div class="row">
                  <button class="ghost like-btn">${post.liked ? "已喜欢" : "喜欢"} · ${post.like_count}</button>
                  ${post.stamp ? `<a class="ghost" href="/stamps/${post.stamp.id}" data-link>看这枚票</a>` : ""}
                </div>
              </div>
            </article>`
                )
                .join("")
            : `<div class="empty">还没有人晒票。做第一个吧。</div>`
        }
      </div>
    `,
    "feed"
  );
  qs("#composer").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    const stampId = form.get("stamp_id");
    try {
      await api("/posts", {
        method: "POST",
        body: JSON.stringify({
          body: form.get("body"),
          stamp_id: stampId ? Number(stampId) : null,
        }),
      });
      await render();
    } catch (err) {
      qs("#composer-error").textContent = err.message;
    }
  });
}

async function renderAlbum(root) {
  requireAuth();
  const items = await api("/me/collection");
  const groups = {
    own: items.filter((i) => i.status === "own"),
    swap: items.filter((i) => i.status === "swap"),
    want: items.filter((i) => i.status === "want"),
  };
  const renderGroup = (title, key) => `
    <section>
      <div class="section-title"><h2>${title}</h2><span class="muted">${groups[key].length} 枚</span></div>
      <div class="grid">
        ${
          groups[key].length
            ? groups[key].map((item) => stampCard(item.stamp, `<div class="tiny" style="position:absolute;left:16px;bottom:10px">${escapeHtml(item.note)}</div>`)).join("")
            : `<div class="empty">空着。可先去目录对照志号。</div>`
        }
      </div>
    </section>
  `;
  root.innerHTML = layout(
    `
      <div class="section-title">
        <div>
          <h2>我的邮册</h2>
          <p class="muted">${escapeHtml(state.user.display_name)} · ${escapeHtml(state.user.city || "未填写城市")}</p>
        </div>
        <a class="ghost" href="/explore" data-link>查目录</a>
      </div>
      <div class="stats">
        <div class="stat"><b>${groups.own.length}</b><span class="muted">在册</span></div>
        <div class="stat"><b>${groups.swap.length}</b><span class="muted">可换</span></div>
        <div class="stat"><b>${groups.want.length}</b><span class="muted">想要</span></div>
      </div>
      ${renderGroup("在册", "own")}
      ${renderGroup("可换复品", "swap")}
      ${renderGroup("缺品", "want")}
    `,
    "album"
  );
}

async function renderSwap(root) {
  requireAuth();
  const [matches, swaps, mine] = await Promise.all([
    api("/swaps/matches"),
    api("/swaps"),
    api("/me/collection"),
  ]);
  const mySwap = mine.filter((i) => i.status === "swap");
  root.innerHTML = layout(
    `
      <div class="section-title">
        <div>
          <h2>交换</h2>
          <p class="muted">系统只做匹配，不经手票，也不经手钱。</p>
        </div>
      </div>
      <div class="feed">
        ${
          matches.length
            ? matches
                .map((row) => {
                  const offer = row.you_offer[0];
                  const request = row.they_offer[0];
                  return `
                    <article class="card match">
                      <div>
                        <a href="/u/${encodeURIComponent(row.user.username)}" data-link><strong>${escapeHtml(row.user.display_name)}</strong></a>
                        <div class="tiny">${escapeHtml(row.user.city)} · ${escapeHtml(row.user.bio)}</div>
                        ${row.mutual ? `<span class="badge">双向可换</span>` : `<span class="tiny">单向匹配</span>`}
                      </div>
                      <div class="tiny">
                        你可提供：${row.you_offer.map((s) => s.name).join("、") || "暂无"}<br/>
                        对方可提供：${row.they_offer.map((s) => s.name).join("、") || "暂无"}
                      </div>
                      ${
                        offer && request
                          ? `<button class="btn propose" data-partner="${row.user.id}" data-offer="${offer.id}" data-request="${request.id}">发起交换</button>`
                          : `<span class="tiny">还缺一边的票</span>`
                      }
                    </article>`;
                })
                .join("")
            : `<div class="empty">还没有匹配。把复品标成「可换」，把缺的标成「想要」。</div>`
        }
      </div>
      <div class="section-title" style="margin-top:32px"><h2>进行中的交换</h2></div>
      <div class="feed">
        ${
          swaps.length
            ? swaps
                .map(
                  (swap) => `
            <article class="card">
              <div class="tiny">${formatTime(swap.created_at)} · ${statusLabel(swap.status)}</div>
              <p>${escapeHtml(swap.proposer.display_name)} 用「${escapeHtml(swap.offer_stamp.name)}」换 ${escapeHtml(swap.partner.display_name)} 的「${escapeHtml(swap.request_stamp.name)}」</p>
              ${swap.message ? `<p class="muted">${escapeHtml(swap.message)}</p>` : ""}
              <div class="row">
                ${
                  swap.status === "pending" && swap.partner.username === state.user.username
                    ? `<button class="btn decide" data-id="${swap.id}" data-action="accept">同意</button>
                       <button class="ghost decide" data-id="${swap.id}" data-action="decline">婉拒</button>`
                    : ""
                }
                ${
                  swap.status === "accepted"
                    ? `<button class="ghost decide" data-id="${swap.id}" data-action="complete">标记完成</button>`
                    : ""
                }
              </div>
            </article>`
                )
                .join("")
            : `<div class="empty">还没有交换请求。</div>`
        }
      </div>
      ${mySwap.length ? "" : `<p class="tiny" style="margin-top:18px">提示：邮册里至少要有一枚「可换」，匹配才会出现。</p>`}
    `,
    "swap"
  );
}

function statusLabel(status) {
  return { pending: "待回应", accepted: "已同意，等待互寄", declined: "已婉拒", completed: "已完成" }[status] || status;
}

async function renderStamp(root, id) {
  const stamp = await api(`/stamps/${id}`);
  let mine = [];
  if (state.user) mine = await api("/me/collection");
  const current = mine.find((item) => item.stamp.id === stamp.id);
  root.innerHTML = layout(
    `
      <div class="detail">
        ${stampCard(stamp)}
        <div>
          <div class="kicker">${escapeHtml(stamp.theme)} · ${escapeHtml(stamp.issuer || "中国邮政")}</div>
          <h2 style="font-family:var(--serif);font-size:36px;margin:8px 0">${escapeHtml(stamp.name)}</h2>
          <p class="muted">${escapeHtml(stamp.catalog_no)} · ${stamp.year} · ${escapeHtml(stamp.face_value)}</p>
          <p class="lede">${escapeHtml(stamp.description)}</p>
          ${
            stamp.image_source
              ? `<p class="tiny">票图：${escapeHtml(stamp.image_credit || "维基共享")} · ${escapeHtml(stamp.image_license || "Public domain")} · <a href="${escapeHtml(stamp.image_source)}" target="_blank" rel="noreferrer">来源</a></p>`
              : ""
          }
          ${
            state.user
              ? `<div class="actions">
                   <button class="btn collect" data-status="own">收入邮册</button>
                   <button class="ghost collect" data-status="want">我想要</button>
                   <button class="ghost collect" data-status="swap">标为可换</button>
                   ${current ? `<button class="ghost" id="remove">移出邮册</button>` : ""}
                 </div>
                 <p class="tiny" id="stamp-status">${current ? `当前：${{ own: "在册", want: "想要", swap: "可换" }[current.status]}${current.note ? " · " + current.note : ""}` : "还没放进邮册"}</p>`
              : `<p class="tiny">登录后就可以把这枚票放进自己的册子。</p>`
          }
        </div>
      </div>
    `,
    "explore"
  );
  root.querySelectorAll(".collect").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await api("/me/collection", {
        method: "POST",
        body: JSON.stringify({ stamp_id: stamp.id, status: btn.dataset.status }),
      });
      await render();
    });
  });
  const remove = qs("#remove");
  if (remove) {
    remove.addEventListener("click", async () => {
      await api(`/me/collection/${stamp.id}`, { method: "DELETE" });
      await render();
    });
  }
}

async function renderProfile(root, username) {
  const [user, items] = await Promise.all([
    api(`/users/${encodeURIComponent(username)}`),
    api(`/users/${encodeURIComponent(username)}/collection`),
  ]);
  root.innerHTML = layout(
    `
      <div class="section-title">
        <div>
          <h2>${escapeHtml(user.display_name)}</h2>
          <p class="muted">${escapeHtml(user.city || "未填写城市")} · ${escapeHtml(user.bio || "这个人还没写介绍")}</p>
        </div>
      </div>
      <div class="grid">
        ${items.map((item) => stampCard(item.stamp, `<div class="tiny" style="position:absolute;left:16px;bottom:10px">${item.status === "want" ? "想要" : item.status === "swap" ? "可换" : "在册"}</div>`)).join("")}
      </div>
    `,
    "album"
  );
}

function requireAuth() {
  if (!state.user) {
    navigate("/login");
    throw new Error("redirect");
  }
}

function bindGlobal(root) {
  const logout = qs("#logout", root);
  if (logout) {
    logout.addEventListener("click", () => {
      clearSession();
      navigate("/");
    });
  }
  root.querySelectorAll(".stamp[data-stamp]").forEach((node) => {
    node.addEventListener("click", () => navigate(`/stamps/${node.dataset.stamp}`));
  });
  root.querySelectorAll(".like-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.closest("[data-post]").dataset.post;
      await api(`/posts/${id}/like`, { method: "POST" });
      await render();
    });
  });
  root.querySelectorAll(".propose").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await api("/swaps", {
        method: "POST",
        body: JSON.stringify({
          partner_id: Number(btn.dataset.partner),
          offer_stamp_id: Number(btn.dataset.offer),
          request_stamp_id: Number(btn.dataset.request),
          message: "想用复品换你的缺品，品相如晒票所示。",
        }),
      });
      await render();
    });
  });
  root.querySelectorAll(".decide").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await api(`/swaps/${btn.dataset.id}/${btn.dataset.action}`, { method: "POST" });
      await render();
    });
  });
}

async function render() {
  const root = document.getElementById("app");
  const path = location.pathname;
  try {
    if (path === "/") await renderLanding(root);
    else if (path === "/login") await renderAuth(root, "login");
    else if (path === "/register") await renderAuth(root, "register");
    else if (path === "/terms") root.innerHTML = layout(termsView(), "");
    else if (path === "/admin") await renderAdmin(root);
    else if (path === "/explore") await renderExplore(root);
    else if (path === "/guide") await renderGuide(root);
    else if (path === "/feed") await renderFeed(root);
    else if (path === "/album") await renderAlbum(root);
    else if (path === "/swap") await renderSwap(root);
    else if (path.startsWith("/stamps/")) await renderStamp(root, path.split("/")[2]);
    else if (path.startsWith("/u/")) await renderProfile(root, decodeURIComponent(path.split("/")[2]));
    else root.innerHTML = layout(`<div class="empty">这一页还没印出来。</div>`, "");
    bindGlobal(root);
    if (path === "/guide") scrollToHash();
  } catch (err) {
    if (err.message === "redirect") return;
    root.innerHTML = layout(`<div class="empty">${escapeHtml(err.message)}</div>`, "");
  }
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[data-link]");
  if (!link) return;
  const url = new URL(link.href);
  if (url.origin !== location.origin) return;
  event.preventDefault();
  const next = url.pathname + url.search + url.hash;
  if (url.pathname === location.pathname && url.search === location.search && url.hash) {
    history.pushState(null, "", next);
    scrollToHash();
    return;
  }
  navigate(next);
});

window.addEventListener("popstate", render);
render();
