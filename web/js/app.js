import { GUIDE_SECTIONS, GUIDE_SECTIONS_EN } from "./guide.js";
import {
  applyDocumentLang,
  catalogGroups,
  collectionStatusLabel,
  getLang,
  localizeError,
  localizeStamp,
  noteChips,
  setLang,
  statusLabel,
  t,
} from "./i18n.js";

const TOKEN_KEY = "youlin_token";
const USER_KEY = "youlin_user";

function guideSections() {
  return getLang() === "en" ? GUIDE_SECTIONS_EN : GUIDE_SECTIONS;
}

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
  headers["Accept-Language"] = getLang() === "en" ? "en" : "zh-CN";
  const res = await fetch(`/api${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.detail;
    let message = t("errors.requestFailed");
    if (typeof detail === "string") message = detail;
    else if (Array.isArray(detail) && detail.length) {
      message = String(detail[0].msg || detail[0]).replace(/^Value error,\s*/i, "");
    }
    throw new Error(localizeError(message));
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
  const raw = {
    ...(item.stamp || {}),
    catalog_no: item.catalog_no || item.stamp?.catalog_no || "",
    name: item.name || item.stamp?.name || "",
  };
  const stamp = localizeStamp(raw);
  const name = stamp.name || t("common.unnamed");
  return {
    id: item.stamp_id || stamp.id || "",
    name,
    catalog_no: stamp.catalog_no || "",
    year: stamp.year || "",
    theme: stamp.theme || "",
    mark: stamp.mark || String(name || t("common.stamp")).slice(0, 1),
    color: stamp.color || "#2c5e52",
    face_value: stamp.face_value || "",
    image_path: "",
  };
}

function stampCard(stamp, extra = "", photoPath) {
  stamp = localizeStamp(stamp);
  const src = photoPath !== undefined ? photoPath : stamp.image_path;
  const stampAttr = stamp.id ? ` data-stamp="${stamp.id}"` : "";
  const photo = src
    ? `<img class="stamp-photo" src="${escapeHtml(src)}" alt="${escapeHtml(stamp.name)}" />`
    : `<div class="stamp-mark">${escapeHtml(stamp.mark || t("common.stamp"))}</div>`;
  return `
    <article class="stamp" style="--ink-color:${stamp.color || "#2c5e52"}"${stampAttr}>
      <div class="stamp-face ${src ? "has-photo" : ""}">
        <div class="stamp-meta"><span>${escapeHtml(stamp.catalog_no || "")}</span><span>${stamp.year || ""}</span></div>
        ${photo}
        <div class="stamp-name">${escapeHtml(stamp.name || t("common.unnamed"))}</div>
        <div class="stamp-value">${escapeHtml(stamp.face_value || t("common.photo"))} · ${escapeHtml(stamp.theme || t("common.ownPhoto"))}</div>
      </div>
      <div class="postmark">${escapeHtml(t("brand.short"))}</div>
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
  const local = localizeStamp(piece);
  return stampCard(
    {
      id: piece.stamp_id || "",
      name: local.name,
      catalog_no: local.catalog_no,
      year: "",
      theme: "",
      mark: String(local.name || t("common.stamp")).slice(0, 1),
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
      hint.textContent = need ? t("album.hintNeed") : t("album.hintWant");
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
        <textPath href="#pm-ring-${id}" startOffset="0%">${escapeHtml(t("ornament.ring"))}</textPath>
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
      ${postmarkSvg("tr", t("ornament.hangzhou"), "2026.09.02")}
      ${postmarkSvg("bl", t("ornament.cancel"), t("ornament.cancelled"))}
      ${decoStamp("龙", t("ornament.largeDragon"), t("ornament.customs"), "1878", "#b4232c", "fs-a")}
      ${decoStamp("雁", t("ornament.flyingGoose"), t("ornament.pu1"), "1950", "#2c5e52", "fs-b")}
      ${decoStamp("菊", t("ornament.chrysanthemum"), t("ornament.te44"), "1960", "#c6a36b", "fs-c")}
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
  const lang = getLang();
  return `
    ${siteOrnaments()}
    <header class="topbar">
      <a class="brand" href="/" data-link>
        <span class="brand-stamp">${escapeHtml(t("brand.stamp"))}</span>
        <span class="brand-text">
          <strong>${escapeHtml(t("brand.name"))}</strong>
          <span>${escapeHtml(t("brand.latin"))}</span>
        </span>
      </a>
      <nav class="nav">
        <a href="/explore" data-link class="${active === "explore" ? "active" : ""}">${t("nav.catalog")}</a>
        <a href="/guide" data-link class="${active === "guide" ? "active" : ""}">${t("nav.guide")}</a>
        <a href="/feed" data-link class="${active === "feed" ? "active" : ""}">${t("nav.feed")}</a>
        <a href="/album" data-link class="${active === "album" ? "active" : ""}">${t("nav.album")}</a>
        <a href="/swap" data-link class="${active === "swap" ? "active" : ""}">${t("nav.swap")}</a>
        ${state.user?.role === "admin" ? `<a href="/admin" data-link class="${active === "admin" ? "active" : ""}">${t("nav.admin")}</a>` : ""}
      </nav>
      <div class="userchip">
        <button type="button" class="lang-switch" id="lang-switch" aria-label="${escapeHtml(t("lang.switch"))}">
          <span class="${lang === "zh" ? "on" : ""}">${t("lang.zh")}</span>
          <span class="lang-sep">/</span>
          <span class="${lang === "en" ? "on" : ""}">${t("lang.en")}</span>
        </button>
        ${
          authed
            ? `<a href="/u/${encodeURIComponent(state.user.username)}" data-link>${escapeHtml(state.user.display_name)}</a>
               <button class="ghost" id="logout">${t("auth.logout")}</button>`
            : `<a class="ghost" href="/login" data-link>${t("auth.login")}</a>
               <a class="btn" href="/register" data-link>${t("auth.join")}</a>`
        }
      </div>
    </header>
    <main class="wrap">${inner}</main>
    <footer class="site-foot">
      <span class="foot-cancel">${escapeHtml(t("brand.cancel"))}</span>
      <a href="/terms" data-link>${t("foot.terms")}</a>
      ${authed ? `<span>·</span><a href="/settings" data-link>${t("foot.settings")}</a>` : ""}
    </footer>
  `;
}

function landingView() {
  return `
    <section class="hero">
      <div>
        <div class="kicker">${t("home.kicker")}</div>
        <h1>${t("home.title")}</h1>
        <p class="lede">${t("home.lede")}</p>
        <div class="hero-actions">
          <a class="btn" href="${state.user ? "/album" : "/register"}" data-link>${state.user ? t("home.ctaIn") : t("home.ctaOut")}</a>
          <a class="ghost" href="/feed" data-link>${t("home.seeFeed")}</a>
          <a class="ghost" href="/guide" data-link>${t("home.seeGuide")}</a>
        </div>
      </div>
      <div class="hero-mail">
        <div class="mail-labels">
          <span class="mail-chip air">${t("home.chipPhoto")}</span>
          <span class="mail-chip reg">${t("home.chipCity")}</span>
        </div>
        <div class="hero-stamps" id="hero-stamps"></div>
        <p class="tiny" style="margin:12px 0 0">${t("home.envelopeNote")}</p>
        <div class="wax-seal"><span>${escapeHtml(t("brand.stamp"))}</span></div>
      </div>
    </section>
    <section class="section-title">
      <div>
        <h2>${t("home.howTitle")}</h2>
        <p class="muted">${t("home.howLead")}</p>
      </div>
    </section>
    <ol class="how-steps">
      <li class="card how-step">
        <span class="how-num">1</span>
        <div>
          <h3>${t("home.step1Title")}</h3>
          <p class="muted">${t("home.step1Body")}</p>
        </div>
      </li>
      <li class="card how-step">
        <span class="how-num">2</span>
        <div>
          <h3>${t("home.step2Title")}</h3>
          <p class="muted">${t("home.step2Body")}</p>
        </div>
      </li>
      <li class="card how-step">
        <span class="how-num">3</span>
        <div>
          <h3>${t("home.step3Title")}</h3>
          <p class="muted">${t("home.step3Body")}</p>
        </div>
      </li>
      <li class="card how-step">
        <span class="how-num">4</span>
        <div>
          <h3>${t("home.step4Title")}</h3>
          <p class="muted">${t("home.step4Body")}</p>
        </div>
      </li>
      <li class="card how-step">
        <span class="how-num">5</span>
        <div>
          <h3>${t("home.step5Title")}</h3>
          <p class="muted">${t("home.step5Body", {
            catalog: `<a href="/explore" data-link>${t("nav.catalog")}</a>`,
            guide: `<a href="/guide" data-link>${t("nav.guide")}</a>`,
          })}</p>
        </div>
      </li>
    </ol>
    <section class="section-title">
      <div>
        <h2>${t("home.notTitle")}</h2>
        <p class="muted">${t("home.notLead")}</p>
      </div>
    </section>
    <div class="grid home-cards">
      <a class="card" href="/album" data-link>
        <h3>${t("home.cardAlbum")}</h3>
        <p class="muted">${t("home.cardAlbumBody")}</p>
      </a>
      <a class="card" href="/feed" data-link>
        <h3>${t("home.cardFeed")}</h3>
        <p class="muted">${t("home.cardFeedBody")}</p>
      </a>
      <a class="card" href="/swap" data-link>
        <h3>${t("home.cardSwap")}</h3>
        <p class="muted">${t("home.cardSwapBody")}</p>
      </a>
      <a class="card" href="/explore" data-link>
        <h3>${t("home.cardCatalog")}</h3>
        <p class="muted">${t("home.cardCatalogBody")}</p>
      </a>
    </div>
  `;
}

function authView(mode) {
  if (mode === "login") {
    return `
      <div class="auth-layout">
        <form class="panel form auth-card" id="auth-form" onsubmit="return false">
          <div class="wax-seal wax-seal-sm"><span>${escapeHtml(t("brand.stamp"))}</span></div>
          <div class="kicker">${t("login.kicker")}</div>
          <h2 style="font-family:var(--serif);margin:8px 0 0">${t("login.title")}</h2>
          <p class="muted">${t("login.lead")}</p>
          <label>${t("login.identifier")}
            <input name="identifier" autocomplete="username" placeholder="${escapeHtml(t("login.identifierPh"))}" required />
          </label>
          <label>${t("login.password")}
            <input name="password" type="password" autocomplete="current-password" placeholder="${escapeHtml(t("login.passwordPh"))}" required />
          </label>
          <button class="btn" type="submit">${t("login.submit")}</button>
          <p class="flash" id="auth-error"></p>
          <p class="tiny">${t("login.noAccount", { link: `<a href="/register" data-link>${t("login.registerLink")}</a>` })}</p>
        </form>
      </div>
    `;
  }
  return `
    <div class="auth-layout">
      <form class="panel form auth-card" id="auth-form" onsubmit="return false">
        <div class="wax-seal wax-seal-sm"><span>${escapeHtml(t("brand.stamp"))}</span></div>
        <div class="kicker">${t("register.kicker")}</div>
        <h2 style="font-family:var(--serif);margin:8px 0 0">${t("register.title")}</h2>
        <p class="muted">${t("register.lead")}</p>
        <label>${t("register.displayName")}
          <input name="display_name" placeholder="${escapeHtml(t("register.displayPh"))}" required />
        </label>
        <label>${t("register.username")}
          <input name="username" autocomplete="username" placeholder="${escapeHtml(t("register.usernamePh"))}" required />
        </label>
        <label>${t("register.city")}
          <input name="city" placeholder="${escapeHtml(t("register.cityPh"))}" />
        </label>
        <div class="contact-switch" id="contact-switch">
          <button type="button" class="chip active" data-type="email">${t("register.email")}</button>
          <button type="button" class="chip" data-type="phone">${t("register.phone")}</button>
        </div>
        <input type="hidden" name="contact_type" value="email" />
        <label id="contact-label">${t("register.email")}
          <input name="contact" type="email" placeholder="you@example.com" required />
        </label>
        <label>${t("register.password")}
          <input name="password" type="password" autocomplete="new-password" minlength="8" placeholder="${escapeHtml(t("register.passwordPh"))}" required />
        </label>
        <label>${t("register.confirm")}
          <input name="password_confirm" type="password" autocomplete="new-password" minlength="8" placeholder="${escapeHtml(t("register.confirmPh"))}" required />
        </label>
        <label>${t("register.bio")}
          <textarea name="bio" placeholder="${escapeHtml(t("register.bioPh"))}"></textarea>
        </label>
        <label class="agree">
          <input type="checkbox" name="agree" value="true" required />
          <span>${t("register.agree", { terms: `<a href="/terms" data-link>${t("register.terms")}</a>` })}</span>
        </label>
        <button class="btn" type="submit">${t("register.submit")}</button>
        <p class="flash" id="auth-error"></p>
        <p class="tiny">${t("register.hasAccount", { link: `<a href="/login" data-link>${t("register.loginLink")}</a>` })}</p>
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
        ? `${t("register.email")}<input name="contact" type="email" placeholder="you@example.com" required />`
        : `${t("register.phone")}<input name="contact" type="tel" placeholder="${escapeHtml(t("register.phonePh"))}" required />`;
    });
  }
  qs("#auth-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    const error = qs("#auth-error");
    try {
      if (mode === "register") {
        if (form.get("password") !== form.get("password_confirm")) {
          error.textContent = t("register.passwordMismatch");
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
      <div class="wax-seal wax-seal-sm"><span>${escapeHtml(t("brand.stamp"))}</span></div>
      <div class="kicker">YOULIN</div>
      <h2 style="font-family:var(--serif)">${t("terms.title")}</h2>
      <p>${t("terms.p1")}</p>
      <h3>${t("terms.hAccount")}</h3>
      <p>${t("terms.pAccount1")}</p>
      <p>${t("terms.pAccount2")}</p>
      <h3>${t("terms.hContent")}</h3>
      <p>${t("terms.pContent")}</p>
      <h3>${t("terms.hImages")}</h3>
      <p>${t("terms.pImages1")}</p>
      <p>${t("terms.pImages2")}</p>
      <h3>${t("terms.hSwap")}</h3>
      <p>${t("terms.pSwap")}</p>
      <h3>${t("terms.hOpen")}</h3>
      <p>${t("terms.pOpen")}</p>
      <p class="tiny"><a href="/register" data-link>${t("terms.back")}</a> · <a href="/" data-link>${t("terms.home")}</a></p>
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
          <div class="wax-seal wax-seal-sm"><span>${escapeHtml(t("brand.stamp"))}</span></div>
          <div class="kicker">${t("settings.kicker")}</div>
          <h2 style="font-family:var(--serif);margin:8px 0 0">${t("settings.title")}</h2>
          <p class="muted">${t("settings.lead")}</p>
          <label>${t("settings.displayName")}
            <input name="display_name" maxlength="20" value="${escapeHtml(me.display_name)}" required />
          </label>
          <label>${t("settings.city")}
            <input name="city" maxlength="40" value="${escapeHtml(me.city || "")}" placeholder="${escapeHtml(t("settings.cityPh"))}" />
          </label>
          <label>${t("settings.email")}
            <input name="email" maxlength="40" value="${escapeHtml(me.email || "")}" placeholder="you@example.com" />
          </label>
          <label>${t("settings.phone")}
            <input name="phone" maxlength="40" value="${escapeHtml(me.phone || "")}" placeholder="13800138000" />
          </label>          
          <label>${t("settings.bio")}
            <textarea name="bio" maxlength="240" placeholder="${escapeHtml(t("settings.bioPh"))}">${escapeHtml(me.bio || "")}</textarea>
          </label>
          <p class="tiny">${t("settings.loginAs", { username: escapeHtml(me.username), contact: escapeHtml(me.email || me.phone || t("common.noContact")) })}</p>
          <button class="btn" type="submit">${t("settings.save")}</button>
          <p class="flash" id="settings-error"></p>
          <p class="tiny"><a href="/u/${encodeURIComponent(me.username)}" data-link>${t("settings.viewProfile")}</a></p>
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
    root.innerHTML = layout(`<div class="empty">${t("admin.needAdmin")}</div>`, "admin");
    return;
  }
  const users = await api("/admin/users");
  root.innerHTML = layout(
    `
      <div class="section-title">
        <div>
          <h2>${t("admin.title")}</h2>
          <p class="muted">${t("admin.lead")}</p>
        </div>
      </div>
      <div class="table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>${t("admin.colUser")}</th>
              <th>${t("admin.colContact")}</th>
              <th>${t("admin.colRole")}</th>
              <th>${t("admin.colStatus")}</th>
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
                  <div class="tiny">@${escapeHtml(user.username)} · ${escapeHtml(user.city || t("common.noCity"))}</div>
                </td>
                <td class="tiny">${escapeHtml(user.email || user.phone || "—")}</td>
                <td>${user.role === "admin" ? t("admin.roleAdmin") : t("admin.roleMember")}</td>
                <td>${user.banned ? t("admin.banned") : t("admin.active")}</td>
                <td>
                  ${
                    user.role === "admin"
                      ? `<span class="tiny">—</span>`
                      : user.banned
                        ? `<button class="btn unban" data-id="${user.id}">${t("admin.restore")}</button>`
                        : `<button class="ghost ban" data-id="${user.id}">${t("admin.disable")}</button>`
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

function catalogTag(item) {
  if (item.preferred) return `<span class="catalog-tag preferred">${t("catalog.preferred")}</span>`;
  if (item.warning) return `<span class="catalog-tag warning">${t("catalog.warning")}</span>`;
  if (item.paid) return `<span class="catalog-tag paid">${t("catalog.paid")}</span>`;
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
          <h2>${t("catalog.title")}</h2>
          <p class="muted">${t("catalog.lead", { guide: `<a href="/guide" data-link>${t("nav.guide")}</a>` })}</p>
        </div>
      </div>
      <div class="catalog-page">
        ${catalogGroups().map(
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
      <p class="guide-note"><span>${t("guide.mix")}</span>${escapeHtml(entry.note)}</p>
    </article>
  `;
}

async function renderGuide(root) {
  root.innerHTML = layout(
    `
      <div class="section-title">
        <div>
          <h2>${t("guide.title")}</h2>
          <p class="muted">${t("guide.lead")}</p>
        </div>
      </div>
      <div class="guide-toc" id="guide-toc">
        ${guideSections().map(
          (section) =>
            `<a class="chip" href="/guide#${encodeURIComponent(section.id)}" data-link>${escapeHtml(section.title)}</a>`
        ).join("")}
      </div>
      <input class="search" id="guide-search" placeholder="${escapeHtml(t("guide.searchPh"))}" />
      <div class="guide-page" id="guide-page">
        ${guideSections().map(
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
        <p class="tiny guide-foot">${t("guide.foot")}</p>
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
          <span class="mail-chip air">${t("feed.chipPhoto")}</span>
          <span class="mail-chip reg">${t("feed.chipStory")}</span>
        </div>
        <label class="photo-picker">${t("feed.photo")}
          <input name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/*" />
          <img class="photo-preview" alt="${escapeHtml(t("common.preview"))}" hidden />
        </label>
        <textarea name="body" placeholder="${escapeHtml(t("feed.bodyPh"))}" required></textarea>
        <div class="row">
          <label style="flex:1">${t("feed.name")}
            <input name="name" maxlength="80" placeholder="${escapeHtml(t("feed.namePh"))}" />
          </label>
          <label style="flex:1">${t("feed.catalogNo")}
            <input name="catalog_no" maxlength="32" placeholder="${escapeHtml(t("feed.catalogPh"))}" />
          </label>
        </div>
        <div class="row">
          <select name="item_id">
            <option value="">${t("feed.noAlbum")}</option>
            ${owned
              .map((item) => {
                const stamp = localizeStamp({ name: item.name, catalog_no: item.catalog_no, ...item.stamp });
                const name = stamp.name || item.name;
                const catalog = item.catalog_no || stamp.catalog_no || "";
                return `<option value="${item.id}" data-name="${escapeHtml(name)}" data-catalog="${escapeHtml(catalog)}">${escapeHtml(name)} · ${escapeHtml(catalog)}</option>`;
              })
              .join("")}
          </select>
          <button class="btn" type="submit">${t("feed.submit")}</button>
        </div>
        <p class="tiny">${t("feed.hint")}</p>
        <p class="flash" id="composer-error"></p>
      </form>`
    : `<div class="panel"><p class="muted" style="margin:0">${t("feed.guest", { login: `<a href="/login" data-link>${t("auth.login")}</a>` })}</p></div>`;
  root.innerHTML = layout(
    `
      <div class="section-title">
        <div>
          <h2>${t("feed.title")}</h2>
          <p class="muted">${t("feed.lead")}</p>
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
                    name: post.name || t("common.unnamed"),
                    catalog_no: post.catalog_no || "",
                    year: "",
                    theme: "",
                    mark: String(post.name || t("common.stamp")).slice(0, 1),
                    color: "#2c5e52",
                    face_value: "",
                  };
                  return `
            <article class="card post" data-post="${post.id}">
              ${stampCard(cardStamp, "", post.photo_path || "")}
              <div class="post-body">
                <div class="tiny"><a href="/u/${encodeURIComponent(post.author.username)}" data-link>${escapeHtml(post.author.display_name)}</a> · ${formatTime(post.created_at)} · ${escapeHtml(post.author.city || t("common.unknownCity"))}</div>
                <p>${escapeHtml(post.body)}</p>
                <div class="row">
                  <button class="ghost like-btn">${post.liked ? t("feed.liked") : t("feed.like")} · ${post.like_count}</button>
                  ${post.stamp ? `<a class="ghost" href="/stamps/${post.stamp.id}" data-link>${t("feed.example")}</a>` : ""}
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
                    .join("") || `<p class="tiny">${t("feed.noComments")}</p>`
                }
                ${
                  state.user
                    ? `<form class="comment-form" data-post="${post.id}">
                        <input name="body" maxlength="240" placeholder="${escapeHtml(t("feed.commentPh"))}" required />
                        <button class="ghost" type="submit">${t("feed.comment")}</button>
                      </form>`
                    : ""
                }
              </div>
            </article>`;
                })
                .join("")
            : `<div class="empty">${t("feed.empty", { cta: state.user ? t("feed.emptyIn") : t("feed.emptyOut") })}</div>`
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
      <div class="section-title"><h2>${title}</h2><span class="muted">${t("album.count", { n: groups[key].length })}</span></div>
      <div class="grid">
        ${
          groups[key].length
            ? groups[key].map((item) => albumCard(item)).join("")
            : `<div class="empty">${key === "want" ? t("album.emptyWant") : t("album.emptyOwn")}</div>`
        }
      </div>
    </section>
  `;
  root.innerHTML = layout(
    `
      <div class="section-title">
        <div>
          <h2>${t("album.title")}</h2>
          <p class="muted">${escapeHtml(state.user.display_name)} · ${escapeHtml(state.user.city || t("common.noCity"))}</p>
        </div>
        <div class="row">
          <a class="ghost" href="/settings" data-link>${t("album.editProfile")}</a>
          <a class="ghost" href="/explore" data-link>${t("album.seeCatalog")}</a>
        </div>
      </div>
      <form class="panel form album-add" id="album-add">
        <div>
          <div class="kicker">${t("album.addKicker")}</div>
          <h3 style="font-family:var(--serif);margin:8px 0 0">${t("album.addTitle")}</h3>
          <p class="muted photo-hint">${t("album.hintNeed")}</p>
        </div>
        <div class="album-add-grid">
          <label class="photo-picker">${t("album.photo")}
            <input name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/*" />
            <img class="photo-preview" alt="${escapeHtml(t("common.preview"))}" hidden />
          </label>
          <div class="album-add-fields">
            <label>${t("album.name")}
              <input name="name" maxlength="80" placeholder="${escapeHtml(t("album.namePh"))}" required />
            </label>
            <label>${t("album.catalogNo")}
              <input name="catalog_no" maxlength="32" placeholder="${escapeHtml(t("album.catalogPh"))}" required />
            </label>
            <label>${t("album.example")}
              <select name="stamp_id" id="album-stamp">
                <option value="">${t("album.exampleNone")}</option>
                ${stamps
                  .map((stamp) => {
                    const local = localizeStamp(stamp);
                    return `<option value="${stamp.id}" data-name="${escapeHtml(local.name)}" data-catalog="${escapeHtml(local.catalog_no)}">${escapeHtml(local.name)} · ${escapeHtml(local.catalog_no)}</option>`;
                  })
                  .join("")}
              </select>
            </label>
            <label>${t("album.page")}
              <select name="status">
                <option value="own">${t("album.status.own")}</option>
                <option value="swap">${t("album.status.swap")}</option>
                <option value="want">${t("album.status.want")}</option>
              </select>
            </label>
            <label>${t("album.note")}
              <input name="note" maxlength="120" placeholder="${escapeHtml(t("album.notePh"))}" />
            </label>
            <button class="btn" type="submit">${t("album.submit")}</button>
          </div>
        </div>
        <p class="flash" id="album-error"></p>
      </form>
      <div class="stats">
        <div class="stat"><b>${groups.own.length}</b><span class="muted">${t("album.statOwn")}</span></div>
        <div class="stat"><b>${groups.swap.length}</b><span class="muted">${t("album.statSwap")}</span></div>
        <div class="stat"><b>${groups.want.length}</b><span class="muted">${t("album.statWant")}</span></div>
      </div>
      ${renderGroup(t("album.groupOwn"), "own")}
      ${renderGroup(t("album.groupSwap"), "swap")}
      ${renderGroup(t("album.groupWant"), "want")}
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
          <h2>${t("swap.title")}</h2>
          <p class="muted">${t("swap.lead")}</p>
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
                        ${row.same_city ? `<span class="badge">${t("swap.sameCity")}</span>` : `<span class="tiny">${t("swap.otherCity")}</span>`}
                        ${row.mutual ? `<span class="badge">${t("swap.mutual")}</span>` : `<span class="tiny">${t("swap.oneWay")}</span>`}
                      </div>
                      <div class="swap-shots">
                        ${offer ? pieceCard(offer) : `<div class="tiny">${t("swap.youNoOffer")}</div>`}
                        ${request ? pieceCard(request) : `<div class="tiny">${t("swap.theyNoOffer")}</div>`}
                      </div>
                      ${
                        offer && request
                          ? `<div class="swap-propose">
                               <input class="swap-msg" maxlength="200" placeholder="${escapeHtml(t("swap.msgPh"))}" />
                               <button class="btn propose" data-partner="${row.user.id}" data-offer="${offer.id}" data-request="${request.id}">${t("swap.propose")}</button>
                             </div>`
                          : `<span class="tiny">${t("swap.missingSide")}</span>`
                      }
                    </article>`;
                })
                .join("")
            : `<div class="empty">${t("swap.emptyMatch")}</div>`
        }
      </div>
      <div class="section-title" style="margin-top:32px"><h2>${t("swap.ongoing")}</h2></div>
      <div class="feed">
        ${
          swaps.length
            ? swaps
                .map((swap) => {
                  const contact = [swap.their_email, swap.their_phone].filter(Boolean).join(" · ");
                  return `
            <article class="card swap-card">
              <div class="tiny">${formatTime(swap.created_at)} · ${statusLabel(swap.status)}${swap.same_city ? ` · ${t("swap.sameCity")}` : ""}</div>
              <p>${t("swap.sentence", {
                proposer: escapeHtml(swap.proposer.display_name),
                offer: escapeHtml(localizeStamp({ name: swap.offer.name, catalog_no: swap.offer.catalog_no }).name),
                partner: escapeHtml(swap.partner.display_name),
                request: escapeHtml(localizeStamp({ name: swap.request.name, catalog_no: swap.request.catalog_no }).name),
              })}</p>
              <div class="swap-shots">
                ${pieceCard(swap.offer)}
                ${pieceCard(swap.request)}
              </div>
              ${swap.message ? `<p class="muted">${escapeHtml(swap.message)}</p>` : ""}
              ${
                contact
                  ? `<p class="tiny">${t("swap.theirContact", { contact: escapeHtml(contact) })}</p>`
                  : swap.status === "declined"
                    ? `<p class="tiny">${t("swap.declinedHide")}</p>`
                    : `<p class="tiny">${t("swap.waitContact")}</p>`
              }
              <div class="row">
                ${
                  swap.status === "pending" && swap.partner.username === state.user.username
                    ? `<button class="btn decide" data-id="${swap.id}" data-action="accept">${t("swap.accept")}</button>
                       <button class="ghost decide" data-id="${swap.id}" data-action="decline">${t("swap.decline")}</button>`
                    : ""
                }
                ${
                  swap.status === "accepted"
                    ? `<button class="ghost decide" data-id="${swap.id}" data-action="complete">${t("swap.complete")}</button>`
                    : ""
                }
              </div>
            </article>`;
                })
                .join("")
            : `<div class="empty">${t("swap.emptySwaps")}</div>`
        }
      </div>
      ${mySwap.length ? "" : `<p class="tiny" style="margin-top:18px">${t("swap.needSwapHint")}</p>`}
    `,
    "swap"
  );
}

function bindLangSwitch(root) {
  const btn = qs("#lang-switch", root);
  if (!btn) return;
  btn.addEventListener("click", () => {
    setLang(getLang() === "zh" ? "en" : "zh");
    render();
  });
}

async function renderStamp(root, id) {
  const stamp = await api(`/stamps/${id}`);
  const view = localizeStamp(stamp);
  let mine = [];
  if (state.user) mine = await api("/me/collection");
  const current = mine.find((item) => item.stamp_id === stamp.id || item.stamp?.id === stamp.id);
  const noteValue = current?.note || "";
  const detailCard = current?.photo_path ? stampCard(view, "", current.photo_path) : stampCard(view);
  const chips = noteChips();
  const statusNow = current
    ? t("stamp.current", { status: collectionStatusLabel(current.status) }) + (current.note ? " · " + current.note : "")
    : t("stamp.needPhoto");
  root.innerHTML = layout(
    `
      <div class="detail">
        ${detailCard}
        <div>
          <div class="kicker">${escapeHtml(view.theme)} · ${escapeHtml(view.issuer || t("stamp.chinaPost"))}</div>
          <h2 style="font-family:var(--serif);font-size:36px;margin:8px 0">${escapeHtml(view.name)}</h2>
          <p class="muted">${escapeHtml(view.catalog_no)} · ${view.year} · ${escapeHtml(view.face_value)}</p>
          <p class="lede">${escapeHtml(view.description)}</p>
          ${
            stamp.image_source
              ? `<p class="tiny">${t("stamp.imageCredit", {
                  credit: escapeHtml(view.image_credit || t("stamp.source")),
                  license: escapeHtml(stamp.image_license || "Public domain"),
                  source: `<a href="${escapeHtml(stamp.image_source)}" target="_blank" rel="noreferrer">${t("stamp.source")}</a>`,
                })}</p>`
              : ""
          }
          ${
            state.user
              ? `<div class="note-box">
                   <label class="photo-picker">${t("stamp.yourPhoto")}${current?.photo_path ? t("stamp.photoReplace") : t("stamp.photoRequired")}
                     <input id="stamp-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/*" />
                     <img class="photo-preview" alt="${escapeHtml(t("common.preview"))}" hidden />
                   </label>
                   <label>${t("stamp.note")}
                     <textarea id="stamp-note" maxlength="120" placeholder="${escapeHtml(t("stamp.notePh"))}">${escapeHtml(noteValue)}</textarea>
                   </label>
                   <div class="filters" id="note-chips">
                     ${chips.map((chip) => `<button type="button" class="chip" data-chip="${escapeHtml(chip)}">${escapeHtml(chip)}</button>`).join("")}
                   </div>
                 </div>
                 <div class="actions">
                   <button class="btn collect" data-status="own">${t("stamp.collect")}</button>
                   <button class="ghost collect" data-status="want">${t("stamp.want")}</button>
                   <button class="ghost collect" data-status="swap">${t("stamp.markSwap")}</button>
                   ${current ? `<button class="ghost collect" data-status="${current.status}">${t("stamp.saveNote")}</button>` : ""}
                   ${current ? `<button class="ghost" id="remove">${t("stamp.remove")}</button>` : ""}
                 </div>
                 <p class="tiny" id="stamp-status">${statusNow}</p>`
              : `<p class="tiny">${t("stamp.guest")}</p>`
          }
        </div>
      </div>
    `,
    "explore"
  );
  const noteInput = qs("#stamp-note");
  const chipBox = qs("#note-chips");
  const photoInput = qs("#stamp-photo");
  bindPhotoPreview(photoInput, qs(".photo-preview"));
  if (chipBox && noteInput) {
    chipBox.addEventListener("click", (event) => {
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
        if (statusBox) statusBox.textContent = t("stamp.pickPhoto");
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
          <p class="muted">${escapeHtml(user.city || t("common.noCity"))} · ${escapeHtml(user.bio || t("profile.noBio"))}</p>
        </div>
        ${
          state.user?.username === user.username
            ? `<a class="ghost" href="/settings" data-link>${t("profile.edit")}</a>`
            : ""
        }
      </div>
      <div class="grid">
        ${items
          .map((item) =>
            albumCard(
              item,
              item.status === "want" ? t("album.statWant") : item.status === "swap" ? t("album.statSwap") : t("album.statOwn")
            )
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
  bindLangSwitch(root);
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
          message: message || t("swap.defaultMessage"),
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
  applyDocumentLang();
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
    else root.innerHTML = layout(`<div class="empty">${t("errors.notFoundPage")}</div>`, "");
    bindGlobal(root);
    if (path === "/guide") scrollToHash();
  } catch (err) {
    if (err.message === "redirect") return;
    root.innerHTML = layout(`<div class="empty">${escapeHtml(localizeError(err.message))}</div>`, "");
    bindGlobal(root);
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
