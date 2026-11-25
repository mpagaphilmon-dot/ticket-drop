// Small DOM helpers shared by the pages. Text is always set with textContent,
// never innerHTML, so data from the database cannot inject markup.
import { auth, onAuthStateChanged, signOut } from "./firebase.js";

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
    else if (key === "style") el.style.cssText = value;
    else if (value !== false && value != null) el.setAttribute(key, value === true ? "" : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

// SVG built from fixed path data (never from database values).
const SVG_NS = "http://www.w3.org/2000/svg";
export function svg(attrs, ...children) {
  const el = document.createElementNS(SVG_NS, "svg");
  for (const [k, v] of Object.entries({ fill: "none", "aria-hidden": "true", ...attrs })) el.setAttribute(k, v);
  el.append(...children);
  return el;
}
export function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

const stroke = { stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" };
const ICONS = {
  calendar: ["M8 2v4M16 2v4M3 10h18", "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"],
  pin: ["M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z", "M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"],
  share: ["M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7", "M16 6l-4-4-4 4", "M12 2v13"],
  check: ["M20 6 9 17l-5-5"],
  user: ["M20 21a8 8 0 0 0-16 0", "M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z"],
  shield: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", "m9 12 2 2 4-4"],
  users: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M22 21v-2a4 4 0 0 0-3-3.9", "M16 3.1a4 4 0 0 1 0 7.8"],
  back: ["M19 12H5", "m12 19-7-7 7-7"],
  ticket: ["M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a3 3 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a3 3 0 0 0 0-6z", "M13 5v2M13 11v2M13 17v2"],
  refresh: ["M21 12a9 9 0 1 1-3-6.7L21 8", "M21 3v5h-5"],
  mail: ["M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z", "m22 6-10 7L2 6"],
  lock: ["M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z", "M7 11V7a5 5 0 0 1 10 0v4"],
  eye: ["M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
  eyeOff: ["M3 3l18 18", "M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1", "M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6", "M9.9 9.9a3 3 0 0 0 4.2 4.2"],
  logout: ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "m16 17 5-5-5-5", "M21 12H9"],
  login: ["M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4", "m10 17 5-5-5-5", "M15 12H3"],
  arrow: ["M5 12h14", "m13 6 6 6-6 6"],
  x: ["M18 6 6 18", "m6 6 12 12"],
};
export const icon = (name) => svg({ viewBox: "0 0 24 24", class: "icon", ...stroke }, ...ICONS[name].map((d) => svgEl("path", { d })));

// Animated flame (the "selling fast" mark).
export function flame() {
  const s = svg({ viewBox: "0 0 24 24", class: "flame" },
    svgEl("path", { d: "M12 2c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-2.5 1.2-4 2.5-5.2C9.8 10 11 11 12 11c0-3-1.5-5.5 0-9z", fill: "currentColor" }),
    svgEl("path", { d: "M12 22a3 3 0 0 1-3-3c0-1.7 1.5-2.6 3-4.5 1.5 1.9 3 2.8 3 4.5a3 3 0 0 1-3 3z", fill: "#fff3c4" }));
  return s;
}

// Logo: a ticket with a flame cut-out.
export function logo() {
  const defs = svgEl("defs");
  const grad = svgEl("linearGradient", { id: "logoFire", x1: "0", y1: "0", x2: "1", y2: "1" });
  grad.append(svgEl("stop", { offset: "0", "stop-color": "#ffc04d" }), svgEl("stop", { offset: ".5", "stop-color": "#ff6a3d" }), svgEl("stop", { offset: "1", "stop-color": "#ff2e7e" }));
  defs.append(grad);
  return svg({ viewBox: "0 0 40 40" }, defs,
    svgEl("path", { d: "M6 10a3 3 0 0 1 3-3h22a3 3 0 0 1 3 3v5a5 5 0 0 0 0 10v5a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-5a5 5 0 0 0 0-10z", fill: "url(#logoFire)" }),
    svgEl("path", { d: "M20 12c.7 2.6 3.4 3.6 3.4 7.3a3.4 3.4 0 0 1-6.8 0c0-1.6.8-2.6 1.7-3.4.2 1.2 1 1.8 1.7 1.8 0-2-1-3.7 0-5.7z", fill: "#1a0d05" }));
}

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
});
export const formatDate = (timestamp) => (timestamp ? dateFormat.format(timestamp.toDate()) : "");

export const seatsText = (n) => (n === 0 ? "Sold out" : n === 1 ? "1 seat left" : `${n} seats left`);

// How full an event is: "out", "hot" (40% or fewer seats, or 3 or fewer, left) or "ok".
export function seatLevel(e) {
  if (e.seatsLeft <= 0) return "out";
  return e.seatsLeft <= 3 || e.seatsLeft / Math.max(e.capacity, 1) <= 0.4 ? "hot" : "ok";
}

export function seatBadge(e) {
  const level = seatLevel(e);
  if (level === "out") return h("span", { class: "badge out" }, "Sold out");
  if (level === "hot") return h("span", { class: "badge hot" }, flame(), "Selling fast");
  return h("span", { class: "badge ok" }, "Available");
}

export function meter(e) {
  const level = seatLevel(e);
  const pct = Math.max(0, Math.min(100, (e.seatsLeft / Math.max(e.capacity, 1)) * 100));
  return h("div", { class: `meter ${level}`, role: "img", "aria-label": `${e.seatsLeft} of ${e.capacity} seats left` },
    h("i", { style: `width:${pct}%` }));
}

// Confetti burst from an element (purely decorative; skipped for reduced motion).
export function burst(from) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const rect = from.getBoundingClientRect();
  const layer = h("div", { class: "confetti", "aria-hidden": "true",
    style: `left:${rect.left + rect.width / 2}px;top:${rect.top + rect.height / 3}px` });
  const colors = ["#ffc04d", "#ff6a3d", "#ff2e7e", "#8b5cf6", "#4ade80", "#fff3c4"];
  for (let i = 0; i < 70; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 120 + Math.random() * 260;
    layer.append(h("i", { style: [
      `background:${colors[i % colors.length]}`,
      `--x:${Math.cos(angle) * dist}px`,
      `--y:${Math.sin(angle) * dist - 120}px`,
      `--r:${Math.random() * 720 - 360}deg`,
      `animation-delay:${Math.random() * 120}ms`,
      i % 3 === 0 ? "border-radius:50%;width:8px;height:8px" : "",
    ].join(";") }));
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), 1600);
}

// Plain sentences instead of raw error codes.
export function friendlyError(error) {
  const code = error?.code ?? "";
  if (code === "unavailable" || code === "auth/network-request-failed") {
    return "Could not reach the server. Check your connection and try again.";
  }
  if (code === "permission-denied") return "That action is not allowed. Refresh the page and try again.";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "Wrong email or password.";
  }
  if (code === "auth/email-already-in-use") return "An account with that email already exists. Sign in instead.";
  if (code === "auth/weak-password") return "Choose a password of at least 6 characters.";
  if (code === "auth/invalid-email") return "That email address does not look right.";
  if (code === "auth/too-many-requests") return "Too many attempts. Wait a minute and try again.";
  return "Something went wrong. Please try again.";
}

// Page chrome shared by every page: logo, signed-in user, background.
export function mountChrome() {
  document.getElementById("brand").prepend(logo());
  document.body.prepend(
    h("div", { class: "aurora", "aria-hidden": "true" }, h("span"), h("span"), h("span"), h("span")),
    h("div", { class: "grain", "aria-hidden": "true" })
  );
  const target = document.getElementById("header");
  onAuthStateChanged(auth, (user) => {
    target.replaceChildren(
      user
        ? h("div", { class: "user-chip" },
            h("span", { class: "avatar", "aria-hidden": "true" }, (user.email ?? "?")[0].toUpperCase()),
            h("span", { class: "email" }, user.email),
            h("span", { class: "chip-divider", "aria-hidden": "true" }),
            h("button", { class: "icon-btn logout", "aria-label": "Sign out", "data-tip": "Sign out",
              onclick: () => signOut(auth) }, icon("logout")))
        : h("button", { class: "pill-btn", onclick: goToSignIn }, icon("login"), "Sign in")
    );
  });
}

// Header "Sign in": jump to the sign-in form on the event page, or to the events list.
function goToSignIn() {
  const email = document.querySelector('#panel input[type="email"]');
  if (email) {
    email.scrollIntoView({ behavior: "smooth", block: "center" });
    email.focus({ preventScroll: true });
    return;
  }
  document.getElementById("events")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Ripple from the exact point of the click on every button (decorative).
document.addEventListener("pointerdown", (ev) => {
  const btn = ev.target.closest?.(".btn, .ghost, .pill-btn, .icon-btn, .seg button");
  if (!btn || btn.disabled || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;
  const wave = h("span", { class: "ripple", "aria-hidden": "true",
    style: `width:${size}px;height:${size}px;left:${ev.clientX - rect.left - size / 2}px;top:${ev.clientY - rect.top - size / 2}px` });
  btn.append(wave);
  setTimeout(() => wave.remove(), 650);
});
