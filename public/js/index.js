// Event list: every event as a ticket stub with its live seat count.
import { collection, db, onSnapshot, orderBy, query } from "./firebase.js";
import { formatDate, friendlyError, h, icon, meter, mountChrome, seatBadge, seatLevel } from "./ui.js";

mountChrome();

document.getElementById("pillars").append(
  h("li", {}, icon("user"), "One ticket per person"),
  h("li", {}, icon("shield"), "Never oversold"),
  h("li", {}, icon("users"), "Fair waitlist")
);

const list = document.getElementById("events");
let firstRender = true;

onSnapshot(
  query(collection(db, "events"), orderBy("startsAt")),
  (snap) => {
    list.setAttribute("aria-busy", "false");
    if (snap.empty) {
      list.replaceChildren(h("li", { class: "muted" }, "No events yet. Check back soon."));
      return;
    }
    // Entrance animation only on the first render, not on every live seat update.
    const enter = firstRender ? "enter" : "";
    firstRender = false;
    list.replaceChildren(
      ...snap.docs.map((d, i) => {
        const e = d.data();
        const out = seatLevel(e) === "out";
        return h("li", { class: enter, style: `--i:${i}` },
          h("a", { class: `ticket${out ? " sold" : ""}`, href: `event.html?id=${encodeURIComponent(d.id)}` },
            h("div", { class: "ticket-main" },
              seatBadge(e),
              h("h3", {}, e.name),
              h("div", { class: "ticket-meta" },
                h("span", {}, icon("calendar"), formatDate(e.startsAt)),
                h("span", {}, icon("pin"), e.venue)),
              meter(e)),
            h("div", { class: "ticket-stub" },
              h("span", { class: "stub-num" }, out ? "SOLD OUT" : String(e.seatsLeft)),
              h("span", { class: "stub-label" }, out ? `${e.capacity} seats` : e.seatsLeft === 1 ? "seat left" : "seats left"))));
      })
    );
  },
  (error) => {
    list.setAttribute("aria-busy", "false");
    list.replaceChildren(h("li", { class: "card error-card" }, friendlyError(error)));
  }
);
