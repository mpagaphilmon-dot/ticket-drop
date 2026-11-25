// Event page: the core journey (see seats left -> Get ticket -> ticket code -> share).
// One state object. The hero (event details + seat ring) is built once and then
// updated in place; the action panel is rebuilt only when the screen actually
// changes, so live seat updates never replay animations or wipe a half-typed form.
import {
  api,
  auth,
  createUserWithEmailAndPassword,
  db,
  doc,
  onAuthStateChanged,
  onSnapshot,
  signInWithEmailAndPassword,
} from "./firebase.js";
import {
  burst, flame, formatDate, friendlyError, h, icon, mountChrome, seatBadge, seatLevel, svg, svgEl,
} from "./ui.js";

mountChrome();
document.getElementById("back").prepend(icon("back"));
const eventBox = document.getElementById("event");
const panel = document.getElementById("panel");
const eventId = new URLSearchParams(location.search).get("id");

const state = {
  event: undefined,   // undefined = loading, null = not found
  user: null,
  ticket: null,
  wait: null,
  busy: false,
  error: null,        // { message, retry }
  copied: false,
};

// ---------------- live data ----------------
let stopUserListeners = () => {};
const onError = (error) => { state.error = { message: friendlyError(error) }; render(); };

if (!eventId) {
  state.event = null;
  render();
} else {
  onSnapshot(doc(db, "events", eventId),
    (snap) => { state.event = snap.exists() ? snap.data() : null; render(); }, onError);

  onAuthStateChanged(auth, (user) => {
    stopUserListeners();
    Object.assign(state, { user, ticket: null, wait: null, error: null });
    if (user) {
      const stopTicket = onSnapshot(doc(db, "events", eventId, "tickets", user.uid),
        (snap) => { state.ticket = snap.exists() ? snap.data() : null; render(); }, onError);
      const stopWait = onSnapshot(doc(db, "events", eventId, "waitlist", user.uid),
        (snap) => { state.wait = snap.exists() ? snap.data() : null; render(); }, onError);
      stopUserListeners = () => { stopTicket(); stopWait(); };
    } else {
      stopUserListeners = () => {};
    }
    render();
  });
}

// ---------------- actions ----------------
async function run(action) {
  if (state.busy) return;
  state.busy = true;
  state.error = null;
  render();
  try {
    const result = await action();
    if (result?.status === "not-found") state.error = { message: "This event no longer exists." };
    if (result?.status === "claimed") requestAnimationFrame(() => burst(panel));
  } catch (error) {
    state.error = { message: friendlyError(error), retry: () => run(action) };
  } finally {
    state.busy = false;
    render();
  }
}

const claim = () => run(() => api.claim(eventId, state.user.uid));
const cancel = () => run(() => api.cancel(eventId, state.user.uid));
const joinWaitlist = () => run(() => api.joinWaitlist(eventId, state.user.uid));

async function share() {
  const url = `${location.origin}${location.pathname}?id=${encodeURIComponent(eventId)}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: state.event?.name ?? "Ticket Drop", url });
      return;
    }
    await navigator.clipboard.writeText(url);
    state.copied = true;
  } catch (error) {
    if (error?.name === "AbortError") return; // user closed the share sheet
    prompt("Copy this link:", url);         // clipboard blocked: let the user copy by hand
  }
  updateHero();
  setTimeout(() => { state.copied = false; updateHero(); }, 2000);
}

// ---------------- hero: built once, updated in place ----------------
const RING_R = 62;
const RING_C = 2 * Math.PI * RING_R;
let hero = null; // references to the parts that change

function buildHero(e) {
  const defs = svgEl("defs");
  const grad = svgEl("linearGradient", { id: "ringFire", x1: "0", y1: "0", x2: "1", y2: "1" });
  grad.append(svgEl("stop", { offset: "0", "stop-color": "#ffc04d" }), svgEl("stop", { offset: ".55", "stop-color": "#ff6a3d" }), svgEl("stop", { offset: "1", "stop-color": "#ff2e7e" }));
  defs.append(grad);
  const fill = svgEl("circle", { class: "fill", cx: "74", cy: "74", r: String(RING_R), "stroke-dasharray": String(RING_C), "stroke-dashoffset": String(RING_C) });
  const num = h("span", { class: "ring-num" }, "0");
  const label = h("span", { class: "ring-label" }, "seats left");
  const ring = h("div", { class: "ring", role: "img" },
    svg({ viewBox: "0 0 148 148" }, defs, svgEl("circle", { class: "track", cx: "74", cy: "74", r: String(RING_R) }), fill),
    h("div", { class: "ring-center" }, num, label));
  const badgeSlot = h("div");
  const shareBtn = h("button", { class: "ghost share", onclick: share }, icon("share"), h("span", {}, "Share link"));

  eventBox.replaceChildren(h("div", { class: "event-hero enter" },
    h("div", {},
      badgeSlot,
      h("h1", {}, e.name),
      h("div", { class: "ticket-meta" },
        h("span", {}, icon("calendar"), formatDate(e.startsAt)),
        h("span", {}, icon("pin"), e.venue)),
      shareBtn),
    ring));
  document.title = `${e.name} · Ticket Drop`;
  hero = { ring, fill, num, label, badgeSlot, shareBtn, shown: 0, name: e.name };
}

function animateNumber(el, from, to) {
  if (from === to || matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = String(to); return; }
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / 600);
    el.textContent = String(Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3))));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump");
}

function updateHero() {
  const e = state.event;
  if (!hero || !e) return;
  const level = seatLevel(e);
  const pct = Math.max(0, Math.min(1, e.seatsLeft / Math.max(e.capacity, 1)));
  hero.fill.setAttribute("stroke-dashoffset", String(RING_C * (1 - pct)));
  hero.ring.classList.toggle("out", level === "out");
  hero.ring.setAttribute("aria-label", `${e.seatsLeft} of ${e.capacity} seats left`);
  animateNumber(hero.num, hero.shown, e.seatsLeft);
  hero.shown = e.seatsLeft;
  hero.label.textContent = level === "out" ? "sold out" : e.seatsLeft === 1 ? "seat left" : "seats left";
  hero.badgeSlot.replaceChildren(seatBadge(e));
  hero.shareBtn.lastChild.textContent = state.copied ? "Link copied" : "Share link";
}

// ---------------- panel: one screen at a time ----------------
let panelKey = null;

function render() {
  const e = state.event;
  if (e === null) {
    hero = null;
    eventBox.replaceChildren(h("div", { class: "card" },
      h("h1", {}, "Event not found"),
      h("p", { class: "muted" }, "It may have been removed, or the link is incomplete."),
      h("a", { class: "btn", href: "index.html" }, "See all events")));
    panel.replaceChildren();
    return;
  }
  if (e === undefined) return;
  if (!hero || hero.name !== e.name) buildHero(e);
  updateHero();

  const { key, build } = screen(e);
  if (key === panelKey) return;
  const fresh = key.split("|")[0] !== panelKey?.split("|")[0]; // same screen, only busy changed: no entrance animation
  panelKey = key;
  panel.replaceChildren(...build(fresh));
}

function screen(e) {
  const busy = state.busy;
  const b = busy ? "busy" : "idle";
  const still = (fresh) => (fresh ? "" : " still");

  if (state.error) {
    return { key: `error:${state.error.message}|${b}`, build: () => [
      h("div", { class: "card error-card", role: "alert" },
        h("h2", {}, "That didn't work"),
        h("p", {}, state.error.message),
        state.error.retry
          ? h("button", { class: "btn", onclick: state.error.retry, disabled: busy }, icon("refresh"), "Retry")
          : h("button", { class: "ghost", onclick: () => { state.error = null; render(); } }, "OK"))] };
  }

  if (!state.user) return { key: "signin", build: () => [signInForm()] };

  if (state.ticket) {
    const code = state.ticket.code;
    return { key: `ticket:${code}|${b}`, build: (fresh) => [
      h("div", { class: `ticket my-ticket${fresh ? "" : " still"}` },
        h("div", { class: "ticket-main" },
          h("span", { class: "kicker" }, icon("check"), "You're in"),
          h("p", { class: "muted" }, "Your ticket code"),
          h("p", { class: "code", "aria-label": code.split("").join(" ") },
            ...code.split("").map((c, i) => h("span", { style: `--i:${i}`, "aria-hidden": "true" }, c))),
          h("p", { class: "muted" }, "Show this code at the door."),
          h("div", { class: "row" },
            h("button", { class: "ghost danger", onclick: cancel, disabled: busy }, icon("x"), busy ? "Cancelling…" : "Cancel ticket"))),
        h("div", { class: "ticket-stub" }, h("div", { class: "barcode", "aria-hidden": "true" }), h("span", { class: "stub-label" }, "Admit one")))] };
  }

  if (state.wait) {
    const position = state.wait.pos - e.waitServed + 1;
    if (position <= 0) {
      return { key: `held|${b}`, build: (fresh) => [
        h("div", { class: `card held${still(fresh)}` },
          h("h2", {}, "A seat is held for you"),
          h("p", {}, "Someone cancelled and you were next on the waitlist. It's yours, just claim it."),
          h("button", { class: "btn big", onclick: claim, disabled: busy },
            busy ? h("span", { class: "spinner" }) : icon("ticket"), busy ? "Claiming…" : "Claim my seat"))] };
    }
    return { key: `wait:${position}`, build: (fresh) => [
      h("div", { class: `card${still(fresh)}` },
        h("div", { class: "queue" },
          h("div", { class: "radar" }, h("b", {}, `#${position}`)),
          h("div", {},
            h("h2", {}, "You're on the waitlist"),
            h("p", { class: "muted" }, position === 1
              ? "You're next. If anyone cancels, the seat is held for you. This page updates by itself."
              : `${position - 1} ${position - 1 === 1 ? "person is" : "people are"} ahead of you. If someone cancels, a seat is held for the next person in line.`))))] };
  }

  if (e.seatsLeft > 0) {
    return { key: `claim|${b}`, build: (fresh) => [
      h("button", { class: "btn big", onclick: claim, disabled: busy },
        busy ? h("span", { class: "spinner" }) : flame(), busy ? "Getting your ticket…" : "Get ticket")] };
  }

  return { key: `sold|${b}`, build: (fresh) => [
    h("div", { class: `card${still(fresh)}` },
      h("span", { class: "stamp" }, "Sold out"),
      h("p", {}, "Every seat is taken. Join the waitlist and you'll be offered the next seat that frees up, in the order people joined."),
      h("button", { class: "btn", onclick: joinWaitlist, disabled: busy },
        busy ? h("span", { class: "spinner" }) : icon("users"), busy ? "Joining…" : "Join waitlist"))] };
}

// Sign in / create account: a segmented toggle picks the mode, one submit button.
function signInForm() {
  let mode = "signin"; // or "create"
  const email = h("input", { id: "email", type: "email", name: "email", autocomplete: "email", required: true, placeholder: "you@example.com" });
  const password = h("input", { id: "password", type: "password", name: "password", autocomplete: "current-password", required: true, minlength: "6", placeholder: "At least 6 characters" });
  const message = h("p", { class: "form-error", role: "alert" });
  const title = h("h2", {});
  const hint = h("p", { class: "muted" });
  const submitLabel = h("span", {});
  const submitBtn = h("button", { type: "submit", class: "btn wide" }, submitLabel, h("span", { class: "arrow" }, icon("arrow")));

  const eye = h("button", { type: "button", class: "icon-btn eye", "aria-label": "Show password", "aria-pressed": "false",
    onclick: () => {
      const show = password.type === "password";
      password.type = show ? "text" : "password";
      eye.setAttribute("aria-pressed", String(show));
      eye.setAttribute("aria-label", show ? "Hide password" : "Show password");
      eye.replaceChildren(icon(show ? "eyeOff" : "eye"));
      password.focus();
    } }, icon("eye"));

  const tabSignIn = h("button", { type: "button", role: "tab", onclick: () => setMode("signin") }, "Sign in");
  const tabCreate = h("button", { type: "button", role: "tab", onclick: () => setMode("create") }, "Create account");
  const seg = h("div", { class: "seg", role: "tablist", "aria-label": "Sign in or create an account" }, tabSignIn, tabCreate);

  function setMode(next) {
    mode = next;
    const create = mode === "create";
    seg.dataset.mode = mode;
    tabSignIn.setAttribute("aria-selected", String(!create));
    tabCreate.setAttribute("aria-selected", String(create));
    title.textContent = create ? "Create your account" : "Sign in to get your ticket";
    hint.textContent = create ? "One account, one ticket. Takes ten seconds." : "Welcome back. Your seat is one tap away.";
    submitLabel.textContent = create ? "Create account" : "Sign in";
    password.autocomplete = create ? "new-password" : "current-password";
    message.textContent = "";
  }
  setMode("signin");

  async function submit() {
    if (!email.reportValidity() || !password.reportValidity()) return;
    message.textContent = "";
    submitBtn.disabled = true;
    submitBtn.classList.add("loading");
    try {
      const fn = mode === "create" ? createUserWithEmailAndPassword : signInWithEmailAndPassword;
      await fn(auth, email.value.trim(), password.value);
    } catch (error) {
      message.textContent = friendlyError(error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove("loading");
    }
  }

  return h("form", { class: "card auth", onsubmit: (ev) => { ev.preventDefault(); submit(); } },
    seg,
    title,
    hint,
    h("label", { for: "email" }, "Email"),
    h("div", { class: "field" }, icon("mail"), email),
    h("label", { for: "password" }, "Password"),
    h("div", { class: "field" }, icon("lock"), password, eye),
    message,
    submitBtn);
}
