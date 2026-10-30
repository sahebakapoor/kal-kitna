/* Kal Kitna shared core (v6). Used by the front door, the Lab and both app layouts.
   Pages decide layout; data, maths, saving and sharing live here. */
(function () {
  "use strict";

  /* ---------- Products: name, icon, hue, unit ---------- */
  const LOOK = {
    DAIRY: { name: "Dairy", icon: "ti-milk", hue: "#4c7dff", unit: "packets" },
    PRODUCE: { name: "Produce", icon: "ti-carrot", hue: "#1f9d62", unit: "kg" },
    "BREAD/BAKERY": { name: "Bread", icon: "ti-bread", hue: "#d98a14", unit: "loaves" },
    EGGS: { name: "Eggs", icon: "ti-egg", hue: "#c29a10", unit: "trays" },
    MEATS: { name: "Meat", icon: "ti-meat", hue: "#e8604f", unit: "kg" },
    POULTRY: { name: "Poultry", icon: "ti-feather", hue: "#ef7d2f", unit: "kg" },
    DELI: { name: "Deli", icon: "ti-cheese", hue: "#8b6cf0", unit: "packs" },
    SEAFOOD: { name: "Seafood", icon: "ti-fish", hue: "#1aa6c4", unit: "kg" },
  };
  const ORDER = Object.keys(LOOK);
  const look = (f) => LOOK[f] || { name: f, icon: "ti-box", hue: "#5e6a85", unit: "units" };

  /* ---------- Formatting ---------- */
  const fmt = (x) => (x == null ? "–" : x >= 100 ? Math.round(x).toLocaleString("en-IN") : String(Math.round(x * 10) / 10));
  const money = (x) => "₹" + Math.round(x || 0).toLocaleString("en-IN");
  const day = (iso, o) => new Date(iso + "T00:00:00").toLocaleDateString("en-IN", o);
  const short = (iso) => day(iso, { weekday: "short", day: "numeric", month: "short" });
  const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function greeting(d = new Date()) {
    const h = d.getHours();
    return h < 12 ? "Shubh prabhat" : h < 17 ? "Namaste" : "Shubh sandhya";
  }

  /* ---------- Hand-drawn touches ---------- */
  function awning(svg) {
    const w = svg.clientWidth || 390, h = 30, n = Math.max(6, Math.round(w / 26)), sw = w / n;
    let g = "";
    for (let i = 0; i < n; i++) {
      const x = i * sw, wob = (Math.sin(i * 2.3) * 1.2).toFixed(1), y = 18 + Number(wob);
      g += `<path d="M${x.toFixed(1)} 0H${(x + sw).toFixed(1)}V${y}Q${(x + sw / 2).toFixed(1)} ${y + 12} ${x.toFixed(1)} ${y}Z" fill="${i % 2 ? "#fff6e6" : "#ffb547"}"/>`;
    }
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = g + `<rect width="${w}" height="4" fill="#e89a2e"/>`;
  }
  const underline = '<svg viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><path d="M2 6 C 20 2, 38 9, 56 5 S 88 3, 98 6" stroke="#ffb547" stroke-width="3" fill="none" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>';
  /* ---------- Light / dark theme (the page head sets it before first paint) ---------- */
  function paintThemeButtons() {
    const dark = document.documentElement.dataset.theme === "dark";
    document.querySelectorAll("[data-theme-toggle]").forEach((b) => {
      b.innerHTML = `<i class="ti ${dark ? "ti-sun" : "ti-moon"}" aria-hidden="true"></i>`;
      b.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      b.title = b.getAttribute("aria-label");
    });
  }
  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem("kk:theme", JSON.stringify(t)); } catch { /* private mode */ }
    paintThemeButtons();
    document.dispatchEvent(new CustomEvent("kk:theme", { detail: t }));
  }
  const toggleTheme = () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    let saved = null; try { saved = JSON.parse(localStorage.getItem("kk:theme")); } catch { /* ignore */ }
    if (!saved) { document.documentElement.dataset.theme = e.matches ? "dark" : "light"; paintThemeButtons(); }
  });

  function decorate() {
    document.querySelectorAll("[data-theme-toggle]").forEach((b) => { if (!b.dataset.bound) { b.dataset.bound = "1"; b.addEventListener("click", toggleTheme); } });
    paintThemeButtons();
    document.querySelectorAll("svg.awning").forEach(awning);
    document.querySelectorAll(".wordmark").forEach((w) => { if (!w.querySelector("svg")) w.insertAdjacentHTML("beforeend", underline); });
  }
  window.addEventListener("resize", debounce(() => document.querySelectorAll("svg.awning").forEach(awning), 150));

  /* ---------- Storage (this device only) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("kk:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("kk:" + k, JSON.stringify(v)); } catch { /* private mode */ } },
  };

  /* ---------- API ---------- */
  async function req(url, opts) {
    let r;
    try { r = await fetch(url, opts); } catch { throw new Error("You're offline. Check your connection and try again."); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const d = j.detail; throw new Error(typeof d === "string" ? d : (d && d[0] && d[0].msg) || "Something went wrong. Try again."); }
    return j;
  }
  const api = {
    options: () => req("/options"),
    order: (b) => req("/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }),
    series: (s, f) => req(`/series?store_nbr=${s}&family=${encodeURIComponent(f)}`),
  };

  /* ---------- Shop profile and suppliers ---------- */
  const DEFAULT_SUPPLIERS = [
    { id: "s1", name: "Sharma Dairy", phone: "", families: ["DAIRY", "EGGS"], color: "#4c7dff" },
    { id: "s2", name: "Green Valley Farms", phone: "", families: ["PRODUCE"], color: "#1f9d62" },
    { id: "s3", name: "Bakewell Bakery", phone: "", families: ["BREAD/BAKERY", "DELI"], color: "#d98a14" },
    { id: "s4", name: "Coastal & Co.", phone: "", families: ["MEATS", "POULTRY", "SEAFOOD"], color: "#1aa6c4" },
  ];
  const DEFAULT_PROFILE = { owner: "Ramesh ji", shop: "Ramesh Kirana", confirmBy: "8 pm" };

  /* ---------- State ---------- */
  const S = { opts: null, store: null, date: null, family: null, costs: {}, gw: 0.2, recs: {}, plan: {}, series: {}, profile: null, suppliers: [] };
  const planKey = () => `plan:${S.store}:${S.date}`;
  const priceOk = (f) => { const c = S.costs[f]; return !!c && Number(c.cost) > 0 && Number(c.price) > Number(c.cost); };
  /* Products in a friendly fixed order; works before init() too (the Lab uses it without the app's data). */
  const families = () => (S.opts ? ORDER.filter((f) => S.opts.families.includes(f)).concat(S.opts.families.filter((f) => !ORDER.includes(f))) : ORDER.slice());

  async function init() {
    S.opts = await api.options();
    const o = S.opts;
    S.store = store.get("store", o.stores[0]);
    if (!o.stores.includes(S.store)) S.store = o.stores[0];
    /* Start mid-way through the demo weeks, so 'last week' comparisons exist. */
    S.date = addDays(o.first_date, 14) <= o.last_date ? addDays(o.first_date, 14) : o.first_date;
    S.family = o.families.includes("DAIRY") ? "DAIRY" : o.families[0];
    S.costs = JSON.parse(JSON.stringify(o.costs));
    const mine = store.get("costs", {});
    Object.keys(mine).forEach((f) => { if (S.costs[f]) S.costs[f] = mine[f]; });
    S.gw = store.get("gw", o.goodwill_pct);
    S.plan = store.get(planKey(), {});
    S.profile = { ...DEFAULT_PROFILE, ...store.get("profile", {}) };
    S.suppliers = store.get("suppliers", DEFAULT_SUPPLIERS);
  }
  function setStore(s) { S.store = Number(s); store.set("store", S.store); S.plan = store.get(planKey(), {}); S.series = {}; }
  function setDate(d) { S.date = d; S.plan = store.get(planKey(), {}); }
  function setCost(f, k, v) { S.costs[f][k] = v; store.set("costs", S.costs); }
  function setGoodwill(v) { S.gw = Number(v); store.set("gw", S.gw); }
  function resetPrices() { S.costs = JSON.parse(JSON.stringify(S.opts.costs)); S.gw = S.opts.goodwill_pct; store.set("costs", S.costs); store.set("gw", S.gw); }
  function setProfile(p) { S.profile = { ...S.profile, ...p }; store.set("profile", S.profile); }
  function saveSuppliers() { store.set("suppliers", S.suppliers); }
  function supplierOf(f) { return S.suppliers.find((s) => s.families.includes(f)) || null; }
  function assign(f, supplierId) {
    S.suppliers.forEach((s) => { s.families = s.families.filter((x) => x !== f); });
    const s = S.suppliers.find((x) => x.id === supplierId);
    if (s) s.families.push(f);
    saveSuppliers();
  }
  function addSupplier(name, phone) {
    const palette = ["#4c7dff", "#1f9d62", "#d98a14", "#1aa6c4", "#8b6cf0", "#e8604f", "#ef7d2f"];
    const s = { id: "s" + Date.now(), name, phone, families: [], color: palette[S.suppliers.length % palette.length] };
    S.suppliers.push(s); saveSuppliers(); return s;
  }
  function removeSupplier(id) { S.suppliers = S.suppliers.filter((s) => s.id !== id); saveSuppliers(); }
  const initials = (name) => name.split(/\s+/).filter((w) => /[A-Za-z]/.test(w[0])).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
  const maskPhone = (p) => (p ? p.replace(/\d(?=\d{3})/g, "•") : "No number yet");

  /* ---------- Data ---------- */
  async function loadOrders() {
    const fams = S.opts.families.filter(priceOk);
    const out = await Promise.all(fams.map((f) => api.order({
      store_nbr: S.store, family: f, date: S.date, cost: Number(S.costs[f].cost), price: Number(S.costs[f].price), goodwill_pct: S.gw,
    })));
    S.recs = {}; out.forEach((r) => { S.recs[r.family] = r; });
  }
  async function loadSeries(f) {
    const k = `${S.store}:${f}`;
    if (!S.series[k]) S.series[k] = await api.series(S.store, f);
    return S.series[k];
  }

  /* ---------- Planning ---------- */
  function savePlan(f, q) { S.plan[f] = q; store.set(planKey(), S.plan); }
  function removePlan(f) { delete S.plan[f]; store.set(planKey(), S.plan); }
  function clearPlan() { S.plan = {}; store.set(planKey(), S.plan); }
  const planned = (f) => S.plan[f] != null;
  const plannedCount = () => Object.keys(S.plan).filter((f) => S.recs[f]).length;
  const qtyFor = (f) => S.plan[f] ?? (S.recs[f] ? Math.round(S.recs[f].recommended_order) : 0);
  const stockValue = () => families().reduce((t, f) => t + (S.recs[f] ? qtyFor(f) * Number(S.costs[f].cost) : 0), 0);
  const totalUnits = () => families().reduce((t, f) => t + (S.recs[f] ? qtyFor(f) : 0), 0);
  const sliderTop = (r) => Math.max(10, Math.ceil(Math.max(r.forecast, r.actual ?? 0) * 1.7));

  /* Mistake cost of ordering q when `actual` sold. */
  function mistake(f, q, actual) {
    const c = S.costs[f], waste = Math.max(q - actual, 0), shortfall = Math.max(actual - q, 0);
    return { waste, shortfall, wasteRs: waste * c.cost, shortRs: shortfall * (c.price - c.cost), total: waste * c.cost + shortfall * ((c.price - c.cost) + S.gw * c.price) };
  }

  async function presets(f) {
    const r = S.recs[f], smart = Math.round(r.recommended_order);
    const list = [{ key: "smart", label: "Smart", q: smart }, { key: "fc", label: "Forecast", q: Math.round(r.forecast) }];
    try {
      const s = await loadSeries(f), prev = s.find((d) => d.date === addDays(S.date, -7));
      if (prev && prev.actual != null) list.push({ key: "last", label: "Last " + day(prev.date, { weekday: "short" }), q: Math.round(prev.actual) });
    } catch { /* playground still works without it */ }
    list.push({ key: "safe", label: "Play safe", q: Math.round(smart * 0.9) });
    return list.slice(0, 4);
  }

  function verdict(q, r) {
    const lo = r.recommended_order * 0.9, hi = r.recommended_order * 1.1;
    if (q < lo) return { tone: "warn", icon: "ti-alert-triangle", text: "Might run out", zone: 0 };
    if (q > hi) return { tone: "bad", icon: "ti-trash", text: "Might spoil", zone: 2 };
    return { tone: "ok", icon: "ti-circle-check", text: "Sweet spot", zone: 1 };
  }

  /* Whole numbers read better in sentences ("32 packets", not "32.2"). */
  const K0 = (x) => Math.round(x).toLocaleString("en-IN");

  /* One plain sentence instead of a table. */
  function explain(f, q) {
    const r = S.recs[f], L = look(f), u = L.unit;
    if (r.actual == null) {
      const v = verdict(q, r);
      return v.zone === 1 ? `This is close to the smart order for <b>${L.name.toLowerCase()}</b>, balancing spoilage against empty shelves.`
        : v.zone === 0 ? `This is below the smart order, so you may <b>run out early</b>.` : `This is above the smart order, so <b>some may spoil</b>.`;
    }
    const m = mistake(f, q, r.actual), mf = mistake(f, Math.round(r.forecast), r.actual), w = (x) => K0(x);
    const parts = [];
    parts.push(Math.round(m.shortfall) > 0 ? `<b>${w(m.shortfall)} ${u} sell out early</b> (${money(m.shortRs)} of margin)` : `<b>nothing sells out</b>`);
    parts.push(Math.round(m.waste) > 0 ? `<b>${w(m.waste)} ${u} spoil</b> (${money(m.wasteRs)})` : `<b>nothing spoils</b>`);
    let s = `That day the shop really sold <b>${w(r.actual)} ${u}</b>. Ordering ${w(q)} means ${parts[0]} and ${parts[1]}.`;
    if (Math.round(r.forecast) !== q && mf.total > m.total + 1) s += ` The plain forecast would have cost <b>${money(mf.total - m.total)} more</b> in mistakes.`;
    return s;
  }

  /* Insights over the served weeks: accuracy, savings vs the "same as last week" habit, a weekday pattern. */
  function insights(f, series) {
    const known = series.filter((d) => d.actual != null);
    const sold = known.reduce((t, d) => t + d.actual, 0);
    const miss = known.reduce((t, d) => t + Math.abs(d.actual - d.forecast), 0);
    const close = known.filter((d) => d.actual > 0 && Math.abs(d.actual - d.forecast) / d.actual <= 0.1).length;
    let saved = 0, days = 0;
    for (let i = 7; i < series.length; i++) {
      const d = series[i], prev = series[i - 7];
      if (d.actual == null || prev.actual == null) continue;
      saved += mistake(f, prev.actual, d.actual).total - mistake(f, d.recommended_order, d.actual).total; days++;
    }
    const byDay = {};
    known.forEach((d) => { const k = new Date(d.date + "T00:00:00").getDay(); (byDay[k] = byDay[k] || []).push(d.actual); });
    const avg = sold / (known.length || 1);
    let best = null;
    Object.entries(byDay).forEach(([k, v]) => { const a = v.reduce((x, y) => x + y, 0) / v.length; if (!best || a > best.a) best = { k: Number(k), a }; });
    const names = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
    const lift = best && avg ? Math.round((best.a / avg - 1) * 100) : 0;
    return {
      days: known.length, sold, wape: sold ? miss / sold : null, accuracy: sold ? Math.max(0, 1 - miss / sold) : null, close, saved, savedDays: days,
      pattern: best && lift >= 5 ? `${names[best.k]} sell about ${lift}% more ${look(f).name.toLowerCase()} than an average day.` : null,
    };
  }

  /* ---------- WhatsApp orders, one message per supplier ---------- */
  function itemsFor(s) { return s.families.filter((f) => planned(f) && S.recs[f]); }
  function message(s) {
    const p = S.profile, first = s.name.split(" ")[0];
    const lines = itemsFor(s).map((f) => `• ${look(f).name}: ${fmt(S.plan[f])} ${look(f).unit}`);
    return [`Namaste ${first} ji 🙏`, `Order for ${short(addDays(S.date, 0))} · ${p.shop}`, "", ...lines, "", `Please confirm by ${p.confirmBy}. Thank you!`, p.shop].join("\n");
  }
  function waLink(s) {
    const digits = (s.phone || "").replace(/\D/g, "");
    const to = digits.length === 10 ? "91" + digits : digits;
    return `https://wa.me/${to}?text=${encodeURIComponent(message(s))}`;
  }
  function orderCSV() {
    const rows = [["supplier", "product", "units", "unit", "unit_cost", "stock_value"]];
    families().filter(planned).forEach((f) => {
      const s = supplierOf(f), L = look(f);
      rows.push([s ? s.name : "Unassigned", L.name, S.plan[f], L.unit, S.costs[f].cost, Math.round(S.plan[f] * S.costs[f].cost)]);
    });
    return rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
  }

  /* ---------- Drawing ---------- */
  function gauge(frac, white) {
    const segs = 22, on = Math.round(Math.max(0, Math.min(1, frac)) * segs);
    let s = "";
    for (let i = 0; i < segs; i++) {
      const a = Math.PI - (i + 0.5) * (Math.PI / segs), p = (r) => [(120 + r * Math.cos(a)).toFixed(1), (124 - r * Math.sin(a)).toFixed(1)];
      const [x1, y1] = p(78), [x2, y2] = p(108);
      const col = white ? (i < on ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.28)") : (i < on ? "#4c7dff" : "#e8edf5");
      s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="9" stroke-linecap="round"/>`;
    }
    return s;
  }
  let uid = 0;
  function chart(series, selected, w = 740, h = 220) {
    if (!series.length) return "";
    const id = "g" + ++uid, pl = 38, pb = 24, pt = 10, ih = h - pb - pt;
    const mx = Math.max(1, ...series.map((d) => Math.max(d.forecast, d.actual ?? 0))) * 1.15, bw = (w - pl - 6) / series.length;
    const x = (i) => pl + i * bw + bw / 2, y = (v) => pt + ih * (1 - v / mx);
    let g = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4c7dff" stop-opacity=".22"/><stop offset="1" stop-color="#4c7dff" stop-opacity="0"/></linearGradient></defs>`;
    for (let k = 0; k <= 3; k++) { const yy = y((mx * k) / 3).toFixed(1); g += `<line x1="${pl}" x2="${w}" y1="${yy}" y2="${yy}" stroke="#eef2f8"/><text x="${pl - 6}" y="${+yy + 3}" text-anchor="end">${fmt((mx * k) / 3)}</text>`; }
    series.forEach((d, i) => { if (d.actual != null) { const yy = y(d.actual); g += `<rect x="${(x(i) - bw * 0.3).toFixed(1)}" y="${yy.toFixed(1)}" width="${(bw * 0.6).toFixed(1)}" height="${(pt + ih - yy).toFixed(1)}" rx="4" fill="${d.date === selected ? "#ffcf86" : "#dbe5ff"}"/>`; } });
    const pts = series.map((d, i) => `${x(i).toFixed(1)},${y(d.forecast).toFixed(1)}`).join(" ");
    g += `<polygon points="${x(0).toFixed(1)},${pt + ih} ${pts} ${x(series.length - 1).toFixed(1)},${pt + ih}" fill="url(#${id})"/><polyline points="${pts}" fill="none" stroke="#4c7dff" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    const si = series.findIndex((d) => d.date === selected);
    if (si >= 0) g += `<line x1="${x(si)}" x2="${x(si)}" y1="${pt}" y2="${pt + ih}" stroke="#ffb547" stroke-width="2" stroke-dasharray="3 3"/><circle cx="${x(si)}" cy="${y(series[si].forecast)}" r="5" fill="#fff" stroke="#ffb547" stroke-width="3"/>`;
    series.forEach((d, i) => {
      if (i % 7 === 0) g += `<text x="${x(i)}" y="${h - 6}" text-anchor="middle">${day(d.date, { day: "numeric", month: "short" })}</text>`;
      g += `<rect class="hit" data-date="${d.date}" x="${(pl + i * bw).toFixed(1)}" y="${pt}" width="${bw.toFixed(1)}" height="${ih}"><title>${short(d.date)}: forecast ${fmt(d.forecast)}${d.actual != null ? ", sold " + fmt(d.actual) : ""}</title></rect>`;
    });
    return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Forecast line and sold bars over ${series.length} days">${g}</svg>`;
  }
  function spark(values, color, w = 76, h = 26) {
    if (!values.length) return "";
    const mx = Math.max(...values), mn = Math.min(...values), r = mx - mn || 1;
    const pts = values.map((v, i) => `${((i / (values.length - 1)) * (w - 4) + 2).toFixed(1)},${(h - 3 - ((v - mn) / r) * (h - 6)).toFixed(1)}`).join(" ");
    return `<svg width="${w}" height="${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  function zonesBG(r, top) {
    const lo = (r.recommended_order * 0.9 / top) * 100, hi = (r.recommended_order * 1.1 / top) * 100;
    return `linear-gradient(90deg,#ffd796 0%,#ffe9c2 ${Math.max(0, lo - 6)}%,#c9f0dc ${lo}%,#c9f0dc ${hi}%,#ffd6cf ${Math.min(100, hi + 6)}%,#ffb3a8 100%)`;
  }

  /* ---------- Swipe to confirm ---------- */
  function swipe(track, onDone) {
    const handle = track.querySelector(".handle"), trail = track.querySelector(".trail");
    let start = null, x = 0;
    const max = () => track.clientWidth - handle.clientWidth - 14;
    const set = (v) => { handle.style.transform = `translateX(${v}px)`; if (trail) trail.style.width = v + 34 + "px"; };
    handle.addEventListener("pointerdown", (e) => { start = e.clientX - x; handle.classList.add("drag"); handle.setPointerCapture(e.pointerId); });
    handle.addEventListener("pointermove", (e) => { if (start === null) return; x = Math.max(0, Math.min(max(), e.clientX - start)); set(x); });
    const end = () => { if (start === null) return; start = null; handle.classList.remove("drag"); const done = x > max() * 0.85; x = 0; set(0); if (trail) trail.style.width = "0"; if (done) onDone(); };
    handle.addEventListener("pointerup", end); handle.addEventListener("pointercancel", end);
    track.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onDone(); } });
  }

  /* ---------- Feedback ---------- */
  let tt;
  function toast(msg, action) {
    let el = document.getElementById("toast");
    if (!el) { el = document.createElement("div"); el.id = "toast"; el.className = "toast"; el.setAttribute("role", "status"); el.setAttribute("aria-live", "polite"); document.body.appendChild(el); }
    el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ""}`;
    if (action) el.querySelector("button").onclick = () => { action.run(); el.classList.remove("on"); };
    el.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => el.classList.remove("on"), action ? 5000 : 2600);
  }
  const haptic = (ms = 12) => { if (navigator.vibrate) navigator.vibrate(ms); };

  /* Pick the right layout for the screen actually in use.
     The server guesses from the device; this corrects it (e.g. Chrome DevTools phone mode on a laptop).
     An explicit ?view=mobile or ?view=desktop always wins. */
  /* The person's choice (front-door switch, or any ?view= link) is remembered on this device. */
  function setView(v) {
    try { if (v === "auto") localStorage.removeItem("kk:view"); else localStorage.setItem("kk:view", JSON.stringify(v)); } catch { /* ignore */ }
  }
  function getView() { try { return JSON.parse(localStorage.getItem("kk:view")) || "auto"; } catch { return "auto"; } }
  function fitLayout(current, base = "/app") {
    const asked = new URLSearchParams(location.search).get("view");
    if (asked === "mobile" || asked === "desktop") { setView(asked); return; }
    const pref = getView();
    if (pref !== "auto") { if (pref !== current) location.replace(base + "?view=" + pref + location.hash); return; }
    const narrow = window.matchMedia("(max-width: 760px)").matches;
    const wideMouse = window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)").matches;
    if (current === "desktop" && narrow) location.replace(base + "?view=mobile" + location.hash);
    if (current === "mobile" && wideMouse) location.replace(base + "?view=desktop" + location.hash);
  }

  window.KK = {
    S, LOOK, ORDER, look, fmt, money, day, short, addDays, debounce, esc, greeting, decorate, api, init, families, priceOk,
    setStore, setDate, setCost, setGoodwill, resetPrices, setProfile, supplierOf, assign, addSupplier, removeSupplier, saveSuppliers, initials, maskPhone,
    loadOrders, loadSeries, savePlan, removePlan, clearPlan, planned, plannedCount, qtyFor, stockValue, totalUnits, sliderTop,
    mistake, presets, verdict, explain, insights, itemsFor, message, waLink, orderCSV, gauge, chart, spark, zonesBG, swipe, toast, haptic, fitLayout, setView, getView, setTheme, toggleTheme,
  };
})();
