/* MediQueue fx — simple page fade + scroll progress bar (no cursor effects) */
(function () {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const add = (cls, parent = document.body) => { const d = document.createElement("div"); d.className = cls; parent.appendChild(d); return d; };

  const bar = add("scroll-bar");
  const wipe = add("wipe");
  const onScroll = () => {
    const h = document.documentElement;
    bar.style.transform = "scaleX(" + (h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)) + ")";
  };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* no page-wide fade between pages: it made the whole screen (header included) blink on every link click */
  addEventListener("pageshow", () => document.body.classList.remove("leaving"));
})();
