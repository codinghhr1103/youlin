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

function itemAsStamp(item) {
  const stamp = item.stamp || {};
  return {
    id: item.stamp_id || stamp.id || "",
    name: item.name || stamp.name || "未命名",
    catalog_no: item.catalog_no || stamp.catalog_no || "",
    year: stamp.year || "",
    theme: stamp.theme || "",
    mark: stamp.mark || String(item.name || "票").slice(0, 1),
    color: stamp.color || "#2c5e52",
    face_value: stamp.face_value || "",
    image_path: "",
  };
}

function stampCard(stamp, extra = "", photoPath) {
  const src = photoPath !== undefined ? photoPath : stamp.image_path;
  const stampAttr = stamp.id ? ` data-stamp="${stamp.id}"` : "";
  const photo = src
    ? `<img class="stamp-photo" src="${escapeHtml(src)}" alt="${escapeHtml(stamp.name)}" />`
    : `<div class="stamp-mark">${escapeHtml(stamp.mark || "票")}</div>`;
  return `
    <article class="stamp" style="--ink-color:${stamp.color || "#2c5e52"}"${stampAttr}>
      <div class="stamp-face ${src ? "has-photo" : ""}">
        <div class="stamp-meta"><span>${escapeHtml(stamp.catalog_no || "")}</span><span>${stamp.year || ""}</span></div>
        ${photo}
        <div class="stamp-name">${escapeHtml(stamp.name || "未命名")}</div>
        <div class="stamp-value">${escapeHtml(stamp.face_value || "实拍")} · ${escapeHtml(stamp.theme || "自藏")}</div>
      </div>
      <div class="postmark">邮邻</div>
      ${extra}
    </article>
  `;
}

function albumCard(item, caption) {
  const text = caption !== undefined ? caption : item.note;
  const extra = text
    ? `<div class="tiny" style="position:absolute;left:16px;bottom:10px">${escapeHtml(text)}</div>`
    : "";
  return stampCard(itemAsStamp(item), extra, item.photo_path || "");
}

function pieceCard(piece) {
  if (!piece) return "";
  return stampCard(
    {
      id: piece.stamp_id || "",
      name: piece.name,
      catalog_no: piece.catalog_no,
      year: "",
      theme: "",
      mark: String(piece.name || "票").slice(0, 1),
      color: "#b4232c",
      face_value: "",
    },
    piece.note ? `<div class="tiny" style="position:absolute;left:16px;bottom:10px">${escapeHtml(piece.note)}</div>` : "",
    piece.photo_path || ""
  );
}

function bindPhotoPreview(input, preview) {
  if (!input || !preview) return;
  input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    if (preview.dataset.url) URL.revokeObjectURL(preview.dataset.url);
    if (!file) {
      preview.hidden = true;
      preview.removeAttribute("src");
      delete preview.dataset.url;
      return;
    }
    const url = URL.createObjectURL(file);
    preview.dataset.url = url;
    preview.src = url;
    preview.hidden = false;
  });
}

function bindOwnedPhotoRule(form) {
  const status = form.querySelector("[name=status]");
  const photo = form.querySelector("[name=photo]");
  const hint = form.querySelector(".photo-hint");
  if (!status || !photo) return;
  const sync = () => {
    const need = status.value !== "want";
    photo.required = need;
    if (hint) {
      hint.textContent = need
        ? "在册和可换必须拍实物图，不能用目录扫描件。"
        : "缺品可以先不配图。";
    }
  };
  status.addEventListener("change", sync);
  sync();
}

function postmarkSvg(id, city, date) {
  return `
    <svg class="wm-postmark wm-${id}" viewBox="0 0 160 160" aria-hidden="true">
      <defs>
        <path id="pm-ring-${id}" d="M80,80 m-54,0 a54,54 0 1,1 108,0 a54,54 0 1,1 -108,0"/>
      </defs>
      <circle cx="80" cy="80" r="74" fill="none" stroke="currentColor" stroke-width="2.6"/>
      <circle cx="80" cy="80" r="66" fill="none" stroke="currentColor" stroke-width="1"/>
      <circle cx="80" cy="80" r="40" fill="none" stroke="currentColor" stroke-width="1.6"/>
      <circle cx="80" cy="80" r="6" fill="none" stroke="currentColor" stroke-width="1.2"/>
      <text fill="currentColor" font-size="11" letter-spacing="1.8">
        <textPath href="#pm-ring-${id}" startOffset="0%">★ 邮邻 YOULIN · 方寸之间 · 同好 ★</textPath>
      </text>
      <text fill="currentColor" x="80" y="76" text-anchor="middle" font-size="14">${city}</text>
      <text fill="currentColor" x="80" y="96" text-anchor="middle" font-size="10">${date}</text>
    </svg>
  `;
}

function decoStamp(mark, name, catalog, year, color, extraClass) {
  return `
    <div class="deco-stamp ${extraClass}" style="--ink-color:${color}">
      <div class="deco-stamp-face">
        <div class="deco-stamp-meta"><span>${catalog}</span><span>${year}</span></div>
        <div class="deco-stamp-mark">${mark}</div>
        <div class="deco-stamp-name">${name}</div>
      </div>
    </div>
  `;
}

function siteOrnaments() {
  return `
    <div class="site-ornaments" aria-hidden="true">
      ${postmarkSvg("tr", "杭州", "2026.09.02")}
      ${postmarkSvg("bl", "销印", "已盖销")}
      ${decoStamp("龙", "大龙", "海关", "1878", "#b4232c", "fs-a")}
      ${decoStamp("雁", "飞雁", "普1", "1950", "#2c5e52", "fs-b")}
      ${decoStamp("菊", "菊花", "特44", "1960", "#c6a36b", "fs-c")}
      <svg class="deco-loupe" viewBox="0 0 92 92">
        <circle cx="36" cy="36" r="22" fill="rgba(255,250,241,0.28)" stroke="currentColor" stroke-width="3"/>
        <circle cx="36" cy="36" r="14" fill="none" stroke="currentColor" stroke-width="1"/>
        <path d="M52 52 L80 80" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>
        <path d="M28 28 l6 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity="0.55"/>
      </svg>
      <svg class="deco-tongs" viewBox="0 0 56 128">
        <path d="M16 10 C16 48 26 82 27 118" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M40 10 C40 48 30 82 29 118" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M16 10 H40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M24 10 V4 H32 V10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
  `;
}

function layout(inner, active) {
  const authed = Boolean(state.user);
  return `
    ${siteOrnaments()}
    <header class="topbar">
      <a class="brand" href="/" data-link>
        <span class="brand-stamp">邻</span>
        <span class="brand-text">
          <strong>邮邻</strong>
          <span>YOULIN</span>
        </span>
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
    <footer class="site-foot">
      <span class="foot-cancel">邮邻销印</span>
      <a href="/terms" data-link>用户协议</a>
      ${authed ? `<span>·</span><a href="/settings" data-link>编辑资料</a>` : ""}
    </footer>
  `;
}

function landingView() {
  return `
    <section class="hero">
      <div>
        <div class="kicker">使用说明</div>
        <h1>看实拍、讲票、<br/>找同城换复品</h1>
        <p class="lede">
          邮邻不是目录站，也不做买卖和行情。查志号请用外部目录；在这里只做三件事：
          拍下自己的票、写下它的故事、和同城或同好用复品换缺品。
        </p>
        <div class="hero-actions">
          <a class="btn" href="${state.user ? "/album" : "/register"}" data-link>${state.user ? "去拍一张" : "注册后开始"}</a>
          <a class="ghost" href="/feed" data-link>先看晒票</a>
          <a class="ghost" href="/guide" data-link>集邮名词</a>
        </div>
      </div>
      <div class="hero-mail">
        <div class="mail-labels">
          <span class="mail-chip air">实拍</span>
          <span class="mail-chip reg">同城</span>
        </div>
        <div class="hero-stamps" id="hero-stamps"></div>
        <p class="tiny" style="margin:12px 0 0">信封里是公有领域示例票。你的邮册和晒票只用自己拍的图。</p>
        <div class="wax-seal"><span>邻</span></div>
      </div>
    </section>
    <section class="section-title">
      <div>
        <h2>怎么用</h2>
        <p class="muted">按这个顺序走一遍，站点里的功能就齐了。</p>
      </div>
    </section>
    <ol class="how-steps">
      <li class="card how-step">
        <span class="how-num">1</span>
        <div>
          <h3>写上城市，注册一个号</h3>
          <p class="muted">城市会用来把同城的交换排在前面。邮箱或手机号用来登录；只有交换谈起来之后，对方才看得到。</p>
        </div>
      </li>
      <li class="card how-step">
        <span class="how-num">2</span>
        <div>
          <h3>把票拍进邮册，自己写志号和票名</h3>
          <p class="muted">在册和可换必须上传实拍，不能用目录扫描件。站内那二十枚只是示例，编年、生肖、纪特都可以自己填志号。缺的票可以先记「想要」，先不配图。</p>
        </div>
      </li>
      <li class="card how-step">
        <span class="how-num">3</span>
        <div>
          <h3>晒票：图在先，话在后</h3>
          <p class="muted">动态必须带实拍。可以写齿孔、背胶、为什么留下它。别人能在下面留言问品相，也可以点喜欢。</p>
        </div>
      </li>
      <li class="card how-step">
        <span class="how-num">4</span>
        <div>
          <h3>交换页先看同城</h3>
          <p class="muted">系统按「你可换的志号 × 对方想要的志号」匹配，同城排在最前。点开能看见双方实拍；同意之后才能看到对方的邮箱或手机，自行约定面交或互寄。</p>
        </div>
      </li>
      <li class="card how-step">
        <span class="how-num">5</span>
        <div>
          <h3>查票和名词不在邮邻里完成</h3>
          <p class="muted">对照志号去 <a href="/explore" data-link>目录</a> 列出的 StampDIR、Colnect 等站点。背胶、齿孔、老纪特这些词，看 <a href="/guide" data-link>集邮入门</a>。</p>
        </div>
      </li>
    </ol>
    <section class="section-title">
      <div>
        <h2>这里不做什么</h2>
        <p class="muted">不估价、不拍卖、不经手票和钱。交换是邻里约定，真伪和品相由你们自己看实拍、自己验。</p>
      </div>
    </section>
    <div class="grid home-cards">
      <a class="card" href="/album" data-link>
        <h3>我的邮册</h3>
        <p class="muted">拍实物、写志号，标成在册、可换或想要。</p>
      </a>
      <a class="card" href="/feed" data-link>
        <h3>晒票</h3>
        <p class="muted">发实拍、讲故事，在帖下把品相问清楚。</p>
      </a>
      <a class="card" href="/swap" data-link>
        <h3>交换</h3>
        <p class="muted">同城优先，看见实拍和联系方式再约定。</p>
      </a>
      <a class="card" href="/explore" data-link>
        <h3>查目录</h3>
        <p class="muted">世界票库不自建，外链到公开和商业目录。</p>
      </a>
    </div>
  `;
}

function authView(mode) {
  if (mode === "login") {
    return `
      <div class="auth-layout">
        <form class="panel form auth-card" id="auth-form" onsubmit="return false">
          <div class="wax-seal wax-seal-sm"><span>邻</span></div>
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
        <div class="wax-seal wax-seal-sm"><span>邻</span></div>
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
      <div class="wax-seal wax-seal-sm"><span>邻</span></div>
      <div class="kicker">YOULIN</div>
      <h2 style="font-family:var(--serif)">用户协议与隐私政策</h2>
      <p>邮邻（Youlin）是个人非经营性集邮社区原型：整理数字邮册、晒票、按缺品和复品匹配交换。不收费、不做交易、不报行情、不评估票价，也不提供支付或物流担保。</p>
      <h3>账号与联系方式</h3>
      <p>注册需用户名，以及邮箱或中国大陆手机号之一，用于登录和账号识别。站点目前不会发送短信或邮件验证码。邮箱和手机号默认只对本人和管理员可见，不会出现在晒票或邮友主页。双方同意一笔交换后，为了约定面交或互寄，对方可以看到你的联系方式。</p>
      <p>你可以在「编辑资料」中更正称呼、城市、简介和联系方式。城市会用于把同城交换排在前面。若需停用账号，请联系管理员。</p>
      <h3>你发布的内容</h3>
      <p>晒票、帖下留言、邮册备注、实拍图和交换留言由你负责。请勿发布违法信息、他人隐私，或未经授权的当代邮票原图。管理员有权处理违规内容并停用账号。</p>
      <h3>票图与目录</h3>
      <p>站内示例票图来自维基共享，且为 1931 年以前发行的中国邮票，版权状态为公有领域或自由许可。当代新邮原图不收录。查票请使用目录页列出的外部目录；邮邻不镜像商业编号体系。</p>
      <p>你的邮册和晒票不使用目录扫描件。收入「在册」、标成「可换」或发晒票时，必须上传自己拍摄的实物图，并自己填写志号与票名。「想要」可以先不配图。</p>
      <h3>交换</h3>
      <p>交换是站内约定，双方自行联系寄递或面交、验票。同意交换后可见对方联系方式。邮邻不经手邮票或款项，不对品相、真伪或纠纷承担责任。</p>
      <h3>开源</h3>
      <p>本站代码以 MIT License 发布，详见仓库中的 LICENSE 文件。</p>
      <p class="tiny"><a href="/register" data-link>返回注册</a> · <a href="/" data-link>回首页</a></p>
    </article>
  `;
}

async function renderSettings(root) {
  requireAuth();
  const me = await api("/auth/me");
  saveSession(state.token, { ...state.user, ...me });
  root.innerHTML = layout(
    `
      <div class="auth-layout">
        <form class="panel form auth-card" id="settings-form" onsubmit="return false">
          <div class="wax-seal wax-seal-sm"><span>邻</span></div>
          <div class="kicker">资料</div>
          <h2 style="font-family:var(--serif);margin:8px 0 0">编辑资料</h2>
          <p class="muted">称呼、城市和简介会显示在主页上。城市用于同城交换排序。联系方式默认只有你和管理员看得见，对方同意交换后才能看到。</p>
          <label>称呼
            <input name="display_name" maxlength="20" value="${escapeHtml(me.display_name)}" required />
          </label>
          <label>城市
            <input name="city" maxlength="40" value="${escapeHtml(me.city || "")}" placeholder="例如杭州" />
          </label>
          <label>邮箱
            <input name="email" maxlength="40" value="${escapeHtml(me.email || "")}" placeholder="例如 example@example.com" />
          </label>
          <label>手机号
            <input name="phone" maxlength="40" value="${escapeHtml(me.phone || "")}" placeholder="例如 13800138000" />
          </label>          
          <label>集邮简介
            <textarea name="bio" maxlength="240" placeholder="你在集什么？">${escapeHtml(me.bio || "")}</textarea>
          </label>
          <p class="tiny">登录账号：@${escapeHtml(me.username)} · ${escapeHtml(me.email || me.phone || "未填联系方式")}</p>
          <button class="btn" type="submit">保存</button>
          <p class="flash" id="settings-error"></p>
          <p class="tiny"><a href="/u/${encodeURIComponent(me.username)}" data-link>查看主页</a></p>
        </form>
      </div>
    `,
    "album"
  );
  qs("#settings-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    const error = qs("#settings-error");
    try {
      const user = await api("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({
          display_name: form.get("display_name"),
          city: form.get("city") || "",
          email: form.get("email") || "",
          phone: form.get("phone") || "",
          bio: form.get("bio") || "",
        }),
      });
      saveSession(state.token, { ...state.user, ...user });
      navigate(`/u/${encodeURIComponent(user.username)}`);
    } catch (err) {
      error.textContent = err.message;
    }
  });
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
  const posts = await api("/posts");
  let owned = [];
  if (state.user) {
    const mine = await api("/me/collection");
    owned = mine.filter((item) => item.status === "own" || item.status === "swap");
  }
  const composer = state.user
    ? `<form class="panel composer letter-panel" id="composer">
        <div class="mail-labels composer-labels">
          <span class="mail-chip air">实拍</span>
          <span class="mail-chip reg">讲票</span>
        </div>
        <label class="photo-picker">实拍图
          <input name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/*" />
          <img class="photo-preview" alt="预览" hidden />
        </label>
        <textarea name="body" placeholder="这枚票为什么留下来？齿孔、背胶、或只是那天的光。" required></textarea>
        <div class="row">
          <label style="flex:1">票名
            <input name="name" maxlength="80" placeholder="例如海关大龙 壹分银" />
          </label>
          <label style="flex:1">志号
            <input name="catalog_no" maxlength="32" placeholder="例如纪1、2024-1" />
          </label>
        </div>
        <div class="row">
          <select name="item_id">
            <option value="">不从邮册带入</option>
            ${owned
              .map(
                (item) =>
                  `<option value="${item.id}" data-name="${escapeHtml(item.name)}" data-catalog="${escapeHtml(item.catalog_no)}">${escapeHtml(item.name)} · ${escapeHtml(item.catalog_no)}</option>`
              )
              .join("")}
          </select>
          <button class="btn" type="submit">贴上</button>
        </div>
        <p class="tiny">必须带实拍。可从邮册选一枚带入志号，也可以自己写。</p>
        <p class="flash" id="composer-error"></p>
      </form>`
    : `<div class="panel"><p class="muted" style="margin:0">未登录也可以看实拍和留言。<a href="/login" data-link>登录</a> 后才能发帖、留言和点喜欢。</p></div>`;
  root.innerHTML = layout(
    `
      <div class="section-title">
        <div>
          <h2>晒票</h2>
          <p class="muted">先看见你手里那一张，再听它的故事。</p>
        </div>
      </div>
      ${composer}
      <div class="feed" style="margin-top:18px">
        ${
          posts.length
            ? posts
                .map((post) => {
                  const cardStamp = post.stamp || {
                    id: "",
                    name: post.name || "未命名",
                    catalog_no: post.catalog_no || "",
                    year: "",
                    theme: "",
                    mark: String(post.name || "票").slice(0, 1),
                    color: "#2c5e52",
                    face_value: "",
                  };
                  return `
            <article class="card post" data-post="${post.id}">
              ${stampCard(cardStamp, "", post.photo_path || "")}
              <div class="post-body">
                <div class="tiny"><a href="/u/${encodeURIComponent(post.author.username)}" data-link>${escapeHtml(post.author.display_name)}</a> · ${formatTime(post.created_at)} · ${escapeHtml(post.author.city || "未知城市")}</div>
                <p>${escapeHtml(post.body)}</p>
                <div class="row">
                  <button class="ghost like-btn">${post.liked ? "已喜欢" : "喜欢"} · ${post.like_count}</button>
                  ${post.stamp ? `<a class="ghost" href="/stamps/${post.stamp.id}" data-link>看示例票</a>` : ""}
                </div>
              </div>
              <div class="comments">
                ${
                  (post.comments || [])
                    .map(
                      (comment) => `
                    <p class="comment"><a href="/u/${encodeURIComponent(comment.author.username)}" data-link>${escapeHtml(comment.author.display_name)}</a>
                    <span>${escapeHtml(comment.body)}</span>
                    <span class="tiny">${formatTime(comment.created_at)}</span></p>`
                    )
                    .join("") || `<p class="tiny">还没有留言。</p>`
                }
                ${
                  state.user
                    ? `<form class="comment-form" data-post="${post.id}">
                        <input name="body" maxlength="240" placeholder="问品相、齿孔，或说想换" required />
                        <button class="ghost" type="submit">留言</button>
                      </form>`
                    : ""
                }
              </div>
            </article>`;
                })
                .join("")
            : `<div class="empty">还没有人晒票。${state.user ? "拍一张做第一个吧。" : "登录后做第一个吧。"}</div>`
        }
      </div>
    `,
    "feed"
  );
  const composerForm = qs("#composer");
  if (composerForm) {
    bindPhotoPreview(qs("input[name=photo]", composerForm), qs(".photo-preview", composerForm));
    const itemSelect = composerForm.querySelector("[name=item_id]");
    if (itemSelect) {
      itemSelect.addEventListener("change", () => {
        const opt = itemSelect.selectedOptions[0];
        if (!opt || !opt.value) return;
        if (opt.dataset.name) composerForm.querySelector("[name=name]").value = opt.dataset.name;
        if (opt.dataset.catalog) composerForm.querySelector("[name=catalog_no]").value = opt.dataset.catalog;
      });
    }
    composerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await api("/posts", { method: "POST", body: new FormData(composerForm) });
        await render();
      } catch (err) {
        qs("#composer-error").textContent = err.message;
      }
    });
  }
  root.querySelectorAll(".comment-form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      try {
        await api(`/posts/${form.dataset.post}/comments`, {
          method: "POST",
          body: JSON.stringify({ body: data.get("body") }),
        });
        await render();
      } catch (err) {
        form.querySelector("input").setCustomValidity(err.message);
        form.querySelector("input").reportValidity();
      }
    });
  });
}

async function renderAlbum(root) {
  requireAuth();
  const [items, stamps] = await Promise.all([api("/me/collection"), api("/stamps")]);
  const groups = {
    own: items.filter((i) => i.status === "own"),
    swap: items.filter((i) => i.status === "swap"),
    want: items.filter((i) => i.status === "want"),
  };
  const renderGroup = (title, key) => `
    <section class="album-leaf">
      <div class="section-title"><h2>${title}</h2><span class="muted">${groups[key].length} 枚</span></div>
      <div class="grid">
        ${
          groups[key].length
            ? groups[key].map((item) => albumCard(item)).join("")
            : `<div class="empty">${key === "want" ? "还没有缺品。可先对照志号记下来。" : "空着。拍一张实拍图收进来。"}</div>`
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
        <div class="row">
          <a class="ghost" href="/settings" data-link>编辑资料</a>
          <a class="ghost" href="/explore" data-link>查目录</a>
        </div>
      </div>
      <form class="panel form album-add" id="album-add">
        <div>
          <div class="kicker">收入邮册</div>
          <h3 style="font-family:var(--serif);margin:8px 0 0">拍一张自己的票</h3>
          <p class="muted photo-hint">在册和可换必须拍实物图，不能用目录扫描件。</p>
        </div>
        <div class="album-add-grid">
          <label class="photo-picker">实拍图
            <input name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/*" />
            <img class="photo-preview" alt="预览" hidden />
          </label>
          <div class="album-add-fields">
            <label>票名
              <input name="name" maxlength="80" placeholder="例如编年 甲辰年" required />
            </label>
            <label>志号
              <input name="catalog_no" maxlength="32" placeholder="例如 2024-1 或 纪1" required />
            </label>
            <label>对照站内示例（选填）
              <select name="stamp_id" id="album-stamp">
                <option value="">自己写志号，不对照示例</option>
                ${stamps
                  .map(
                    (stamp) =>
                      `<option value="${stamp.id}" data-name="${escapeHtml(stamp.name)}" data-catalog="${escapeHtml(stamp.catalog_no)}">${escapeHtml(stamp.name)} · ${escapeHtml(stamp.catalog_no)}</option>`
                  )
                  .join("")}
              </select>
            </label>
            <label>放在哪一页
              <select name="status">
                <option value="own">在册</option>
                <option value="swap">可换复品</option>
                <option value="want">想要</option>
              </select>
            </label>
            <label>备注（选填）
              <input name="note" maxlength="120" placeholder="例如：新票 · 全品" />
            </label>
            <button class="btn" type="submit">放进邮册</button>
          </div>
        </div>
        <p class="flash" id="album-error"></p>
      </form>
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
  const addForm = qs("#album-add");
  bindOwnedPhotoRule(addForm);
  bindPhotoPreview(qs("input[name=photo]", addForm), qs(".photo-preview", addForm));
  const stampSelect = qs("#album-stamp");
  if (stampSelect) {
    stampSelect.addEventListener("change", () => {
      const opt = stampSelect.selectedOptions[0];
      if (!opt || !opt.value) return;
      if (opt.dataset.name) addForm.querySelector("[name=name]").value = opt.dataset.name;
      if (opt.dataset.catalog) addForm.querySelector("[name=catalog_no]").value = opt.dataset.catalog;
    });
  }
  addForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const error = qs("#album-error");
    try {
      await api("/me/collection", { method: "POST", body: new FormData(addForm) });
      await render();
    } catch (err) {
      error.textContent = err.message;
    }
  });
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
          <p class="muted">同城排在前面。看见实拍再约，同意之后才交换联系方式。邮邻不经手票，也不经手钱。</p>
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
                        ${row.same_city ? `<span class="badge">同城</span>` : `<span class="tiny">外地</span>`}
                        ${row.mutual ? `<span class="badge">双向可换</span>` : `<span class="tiny">单向匹配</span>`}
                      </div>
                      <div class="swap-shots">
                        ${offer ? pieceCard(offer) : `<div class="tiny">你还没有对方想要的可换票</div>`}
                        ${request ? pieceCard(request) : `<div class="tiny">对方还没有你想要的可换票</div>`}
                      </div>
                      ${
                        offer && request
                          ? `<div class="swap-propose">
                               <input class="swap-msg" maxlength="200" placeholder="给对方留一句话，例如可面交或互寄" />
                               <button class="btn propose" data-partner="${row.user.id}" data-offer="${offer.id}" data-request="${request.id}">发起交换</button>
                             </div>`
                          : `<span class="tiny">还缺一边的可换实拍</span>`
                      }
                    </article>`;
                })
                .join("")
            : `<div class="empty">还没有匹配。把复品标成「可换」，把缺的标成「想要」，志号要写对。</div>`
        }
      </div>
      <div class="section-title" style="margin-top:32px"><h2>进行中的交换</h2></div>
      <div class="feed">
        ${
          swaps.length
            ? swaps
                .map((swap) => {
                  const contact = [swap.their_email, swap.their_phone].filter(Boolean).join(" · ");
                  return `
            <article class="card swap-card">
              <div class="tiny">${formatTime(swap.created_at)} · ${statusLabel(swap.status)}${swap.same_city ? " · 同城" : ""}</div>
              <p>${escapeHtml(swap.proposer.display_name)} 用「${escapeHtml(swap.offer.name)}」换 ${escapeHtml(swap.partner.display_name)} 的「${escapeHtml(swap.request.name)}」</p>
              <div class="swap-shots">
                ${pieceCard(swap.offer)}
                ${pieceCard(swap.request)}
              </div>
              ${swap.message ? `<p class="muted">${escapeHtml(swap.message)}</p>` : ""}
              ${
                contact
                  ? `<p class="tiny">对方联系方式：${escapeHtml(contact)}</p>`
                  : swap.status === "declined"
                    ? `<p class="tiny">已婉拒，不再显示联系方式。</p>`
                    : `<p class="tiny">对方同意后，才会看到联系方式，方便面交或互寄。</p>`
              }
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
            </article>`;
                })
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

const NOTE_CHIPS = ["新票", "旧票", "信销", "盖销", "全品", "有折痕", "缺齿", "揭薄"];

async function renderStamp(root, id) {
  const stamp = await api(`/stamps/${id}`);
  let mine = [];
  if (state.user) mine = await api("/me/collection");
  const current = mine.find((item) => item.stamp_id === stamp.id || item.stamp?.id === stamp.id);
  const noteValue = current?.note || "";
  const detailCard = current?.photo_path ? stampCard(stamp, "", current.photo_path) : stampCard(stamp);
  root.innerHTML = layout(
    `
      <div class="detail">
        ${detailCard}
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
              ? `<div class="note-box">
                   <label class="photo-picker">你的实拍图${current?.photo_path ? "（可换一张）" : "（收入邮册 / 可换时必填）"}
                     <input id="stamp-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/*" />
                     <img class="photo-preview" alt="预览" hidden />
                   </label>
                   <label>邮册备注
                     <textarea id="stamp-note" maxlength="120" placeholder="例如：新票 · 全品，右边纸还在">${escapeHtml(noteValue)}</textarea>
                   </label>
                   <div class="filters" id="note-chips">
                     ${NOTE_CHIPS.map((chip) => `<button type="button" class="chip" data-chip="${escapeHtml(chip)}">${escapeHtml(chip)}</button>`).join("")}
                   </div>
                 </div>
                 <div class="actions">
                   <button class="btn collect" data-status="own">收入邮册</button>
                   <button class="ghost collect" data-status="want">我想要</button>
                   <button class="ghost collect" data-status="swap">标为可换</button>
                   ${current ? `<button class="ghost collect" data-status="${current.status}">保存备注</button>` : ""}
                   ${current ? `<button class="ghost" id="remove">移出邮册</button>` : ""}
                 </div>
                 <p class="tiny" id="stamp-status">${current ? `当前：${{ own: "在册", want: "想要", swap: "可换" }[current.status]}${current.note ? " · " + current.note : ""}` : "在册和可换需要你自己拍的实物图"}</p>`
              : `<p class="tiny">登录后就可以把这枚票放进自己的册子。在册和可换需要实拍图。</p>`
          }
        </div>
      </div>
    `,
    "explore"
  );
  const noteInput = qs("#stamp-note");
  const chips = qs("#note-chips");
  const photoInput = qs("#stamp-photo");
  bindPhotoPreview(photoInput, qs(".photo-preview"));
  if (chips && noteInput) {
    chips.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-chip]");
      if (!btn) return;
      const token = btn.dataset.chip;
      const cur = noteInput.value.trim();
      if (cur.includes(token)) return;
      noteInput.value = cur ? `${cur} · ${token}` : token;
    });
  }
  const collectNote = () => (noteInput ? noteInput.value.trim() : "");
  const statusBox = qs("#stamp-status");
  root.querySelectorAll(".collect").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const status = btn.dataset.status;
      const file = photoInput && photoInput.files && photoInput.files[0];
      if ((status === "own" || status === "swap") && !current?.photo_path && !file) {
        if (statusBox) statusBox.textContent = "请先拍一张或选一张实拍图，再收入邮册。";
        return;
      }
      const body = new FormData();
      body.append("stamp_id", String(stamp.id));
      body.append("name", stamp.name);
      body.append("catalog_no", stamp.catalog_no);
      body.append("status", status);
      body.append("note", collectNote());
      if (file) body.append("photo", file);
      try {
        await api("/me/collection", { method: "POST", body });
        await render();
      } catch (err) {
        if (statusBox) statusBox.textContent = err.message;
      }
    });
  });
  const remove = qs("#remove");
  if (remove) {
    remove.addEventListener("click", async () => {
      await api(`/me/collection/${current ? current.id : stamp.id}`, { method: "DELETE" });
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
        ${
          state.user?.username === user.username
            ? `<a class="ghost" href="/settings" data-link>编辑资料</a>`
            : ""
        }
      </div>
      <div class="grid">
        ${items
          .map((item) =>
            albumCard(item, item.status === "want" ? "想要" : item.status === "swap" ? "可换" : "在册")
          )
          .join("")}
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
    if (!node.dataset.stamp) return;
    node.addEventListener("click", () => navigate(`/stamps/${node.dataset.stamp}`));
  });
  root.querySelectorAll(".like-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!state.user) {
        navigate("/login");
        return;
      }
      const id = btn.closest("[data-post]").dataset.post;
      await api(`/posts/${id}/like`, { method: "POST" });
      await render();
    });
  });
  root.querySelectorAll(".propose").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const box = btn.closest(".match");
      const message = box && box.querySelector(".swap-msg") ? box.querySelector(".swap-msg").value.trim() : "";
      await api("/swaps", {
        method: "POST",
        body: JSON.stringify({
          partner_id: Number(btn.dataset.partner),
          offer_item_id: Number(btn.dataset.offer),
          request_item_id: Number(btn.dataset.request),
          message: message || "想用复品换你的缺品，品相如实拍所示。",
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
    else if (path === "/settings") await renderSettings(root);
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
