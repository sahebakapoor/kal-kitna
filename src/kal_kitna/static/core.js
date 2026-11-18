/* Kal Kitna shared core (v9). Used by the front door, the Lab and both app layouts.
   Pages decide layout; data, maths, the demo clock, language and sharing live here. */
(function () {
  "use strict";

  /* ---------- Products: names (EN/HI), icon, unit, the object drawn on the detail screen ---------- */
  const LOOK = {
    DAIRY: { en: "Milk & dairy", hi: "दूध और डेयरी", icon: "ti-milk", unit: "packets", uhi: "पैकेट", obj: "bottle" },
    PRODUCE: { en: "Vegetables", hi: "सब्ज़ियाँ", icon: "ti-carrot", unit: "kg", uhi: "किलो", obj: "crate" },
    "BREAD/BAKERY": { en: "Bread", hi: "ब्रेड", icon: "ti-bread", unit: "loaves", uhi: "पैकेट", obj: "loaf" },
    EGGS: { en: "Eggs", hi: "अंडे", icon: "ti-egg", unit: "trays", uhi: "ट्रे", obj: "egg" },
    MEATS: { en: "Meat", hi: "मीट", icon: "ti-meat", unit: "kg", uhi: "किलो", obj: "pack" },
    POULTRY: { en: "Chicken", hi: "चिकन", icon: "ti-feather", unit: "kg", uhi: "किलो", obj: "pack" },
    DELI: { en: "Deli", hi: "डेली", icon: "ti-cheese", unit: "packs", uhi: "पैक", obj: "pack" },
    SEAFOOD: { en: "Fish", hi: "मछली", icon: "ti-fish", unit: "kg", uhi: "किलो", obj: "pack" },
  };
  const ORDER = Object.keys(LOOK);
  const look = (f) => LOOK[f] || { en: f, hi: f, icon: "ti-box", unit: "units", uhi: "यूनिट", obj: "pack" };
  const BRANDS = {
    DAIRY: ["Amul Gold 500 ml", "Mother Dairy toned"], EGGS: ["Suguna farm eggs", "Local poultry"],
    "BREAD/BAKERY": ["Britannia", "Harvest Gold"], PRODUCE: ["Local mandi", "Farm direct"],
    MEATS: ["Fresh cut", "Packed"], POULTRY: ["Fresh cut", "Packed"], DELI: ["Paneer", "Cheese and spreads"], SEAFOOD: ["Fresh catch", "Frozen"],
  };

  /* ---------- Language ---------- */
  const HI = {
    "Forecast": "अनुमान", "Really sold": "असल में बिका", "Off by": "अंतर", "Forecast vs what sold": "अनुमान बनाम असल बिक्री",
    "Last 4 weeks. Tap a day to see its numbers.": "पिछले 4 हफ़्ते। किसी दिन पर टैप करके उसके आँकड़े देखें।",
    "Accuracy": "सटीकता", "Days within 10%": "10% के अंदर वाले दिन", "Units sold": "बिकी इकाइयाँ", "Saved": "बचत", "By product": "सामान के हिसाब से",
    "Good morning": "सुप्रभात", "Good afternoon": "नमस्कार", "Good evening": "शुभ संध्या",
    "Today so far": "आज अब तक", "more than last {d}": "पिछले {d} से ज़्यादा", "less than last {d}": "पिछले {d} से कम",
    "now": "अभी", "Needs you now": "अभी ध्यान दें", "Call": "कॉल करें", "Coming up": "आने वाले दिन",
    "Tomorrow's order": "कल का ऑर्डर", "{n} of {t} products planned": "{t} में से {n} सामान तय", "Continue": "जारी रखें",
    "Your shelf": "आपकी शेल्फ", "Scroll": "नीचे देखें", "Plan tomorrow's order": "कल का ऑर्डर बनाएँ",
    "Plenty left": "भरपूर बचा है", "Selling as usual": "रोज़ की तरह बिक रहा है", "Going faster than usual": "आज ज़्यादा तेज़ी से बिक रहा है",
    "Fresh stock arrived": "ताज़ा माल आ गया", "Sold out": "ख़त्म हो गया", "Almost finished": "लगभग ख़त्म",
    "{n} of {t} {u} left": "{t} में से {n} {u} बचे", "{p} may run out by {h}": "{p} {h} तक ख़त्म हो सकता है",
    "Selling faster than usual today": "आज ज़्यादा तेज़ी से बिक रहा है", "All good. Nothing needs you right now.": "सब ठीक है। अभी कुछ करने की ज़रूरत नहीं।",
    "Home": "होम", "Plan": "प्लान", "Khata": "खाता", "Nearby": "आस-पास", "Shop": "दुकान",
    "Back": "वापस", "left": "बचे", "About {n} {u} left.": "लगभग {n} {u} बचे हैं।",
    "At today's pace, it will last about {h} hours.": "आज की रफ़्तार से यह लगभग {h} घंटे चलेगा।",
    "Enough for the rest of today.": "आज के बाक़ी दिन के लिए काफ़ी है।", "It sold out at {h}.": "यह {h} पर ख़त्म हो गया।",
    "{h} hours earlier than usual": "रोज़ से {h} घंटे पहले", "On track": "सही रफ़्तार", "Sold today": "आज बिका",
    "{n} more than yesterday": "कल से {n} ज़्यादा", "{n} fewer than yesterday": "कल से {n} कम", "same as yesterday": "कल जितना",
    "Same day last week": "पिछले हफ़्ते इसी दिन", "by {h}": "{h} तक", "Tomorrow's forecast": "कल का अनुमान",
    "Smart order: {n}": "सही ऑर्डर: {n}", "Plan order": "ऑर्डर तय करें", "By brand": "ब्रांड के हिसाब से",
    "Demo split": "डेमो आँकड़े", "Through the day": "दिन भर", "sold": "बिका", "expected": "अनुमान", "stock": "माल",
    "Demo day": "डेमो दिन", "Pause": "रोकें", "Play": "चलाएँ",
    "Busier than usual": "रोज़ से ज़्यादा भीड़", "Quieter than usual": "रोज़ से कम भीड़", "Payday on the 1st": "1 तारीख़ को वेतन",
    "Busier evenings": "शाम को ज़्यादा भीड़", "{x} in {n} days": "{x} {n} दिन में", "{x} tomorrow": "{x} कल", "{x} today": "{x} आज",
    "Milk, curd and butter sell more": "दूध, दही और मक्खन ज़्यादा बिकते हैं", "Sweets and milk sell more": "मिठाई और दूध ज़्यादा बिकते हैं",
    "Many shops close early": "कई दुकानें जल्दी बंद होती हैं", "Sweets and flowers sell more": "मिठाई और फूल ज़्यादा बिकते हैं",
    "Raksha Bandhan": "रक्षा बंधन", "Janmashtami": "जन्माष्टमी", "Independence Day": "स्वतंत्रता दिवस", "Ganesh Chaturthi": "गणेश चतुर्थी",
  };
  const extendHI = (o) => Object.assign(HI, o);
  let LANG = "en";
  function t(s, v) {
    let out = LANG === "hi" && HI[s] ? HI[s] : s;
    if (v) Object.keys(v).forEach((k) => { out = out.split("{" + k + "}").join(v[k]); });
    return out;
  }
  const pname = (f) => (LANG === "hi" ? look(f).hi : look(f).en);
  const punit = (f) => (LANG === "hi" ? look(f).uhi : look(f).unit);

  /* ---------- Formatting ---------- */
  const fmt = (x) => (x == null ? "–" : x >= 100 ? Math.round(x).toLocaleString("en-IN") : String(Math.round(x * 10) / 10));
  const whole = (x) => Math.round(x).toLocaleString("en-IN");
  const money = (x) => "₹" + Math.round(x || 0).toLocaleString("en-IN");
  const day = (iso, o) => new Date(iso + "T00:00:00").toLocaleDateString(LANG === "hi" ? "hi-IN" : "en-IN", o);
  const short = (iso) => day(iso, { weekday: "short", day: "numeric", month: "short" });
  const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  /* "1 pm" in English; "दोपहर 1" in Hindi (time of day comes first, as people say it). */
  const clockLabel = (h) => {
    const hh = Math.floor(h), mm = Math.round((h - hh) * 60) % 60, h12 = ((hh + 11) % 12) + 1;
    const time = mm ? `${h12}:${String(mm).padStart(2, "0")}` : `${h12}`;
    if (LANG === "hi") return `${hh < 12 ? "सुबह" : hh < 16 ? "दोपहर" : hh < 20 ? "शाम" : "रात"} ${time}`;
    return `${time} ${hh >= 12 ? "pm" : "am"}`;
  };
  const debounce = (fn, ms) => { let tm; return (...a) => { clearTimeout(tm); tm = setTimeout(() => fn(...a), ms); }; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const greeting = (h) => t(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");

  /* ---------- Storage ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("kk:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("kk:" + k, JSON.stringify(v)); } catch { /* private mode */ } },
  };
  LANG = store.get("lang", "en");
  function setLang(l) { LANG = l; store.set("lang", l); document.documentElement.lang = l; document.dispatchEvent(new CustomEvent("kk:lang")); }

  /* ---------- Theme, awning, layout memory ---------- */
  function paintThemeButtons() {
    const dark = document.documentElement.dataset.theme === "dark";
    document.querySelectorAll("[data-theme-toggle]").forEach((b) => {
      b.innerHTML = `<i class="ti ${dark ? "ti-sun" : "ti-moon"}" aria-hidden="true"></i>`;
      b.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    });
  }
  function setTheme(v) { document.documentElement.dataset.theme = v; store.set("theme", v); paintThemeButtons(); document.dispatchEvent(new CustomEvent("kk:theme")); }
  const toggleTheme = () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => { if (!store.get("theme", null)) { document.documentElement.dataset.theme = e.matches ? "dark" : "light"; paintThemeButtons(); } });
  function awning(svg) {
    const w = svg.clientWidth || 390, n = Math.max(6, Math.round(w / 26)), sw = w / n; let g = "";
    for (let i = 0; i < n; i++) { const x = i * sw, y = 12 + Math.sin(i * 2.3) * 0.8; g += `<path d="M${x.toFixed(1)} 0H${(x + sw).toFixed(1)}V${y.toFixed(1)}Q${(x + sw / 2).toFixed(1)} ${(y + 10).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}Z" style="fill:${i % 2 ? "var(--awn-cream, #FFF6E6)" : "#F2A20C"}"/>`; }
    svg.setAttribute("viewBox", `0 0 ${w} 22`); svg.setAttribute("preserveAspectRatio", "none"); svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = g + `<rect width="${w}" height="3" style="fill:#E39410"/>`;
  }
  /* The Kal Kitna mark: a marigold tile with the kirana awning across the top and a bold K. */
  const MARK = '<svg class="logo-mark" viewBox="0 0 40 40" aria-hidden="true"><defs><clipPath id="kk-tile"><rect width="40" height="40" rx="11"/></clipPath></defs><g clip-path="url(#kk-tile)"><rect width="40" height="40" fill="#F2A20C"/><path d="M0 0h40v9.5c-2.5 0-2.5 3.5-5 3.5s-2.5-3.5-5-3.5-2.5 3.5-5 3.5-2.5-3.5-5-3.5-2.5 3.5-5 3.5-2.5-3.5-5-3.5-2.5 3.5-5 3.5S0 9.5 0 9.5z" fill="#FFF6E6"/><path d="M0 0h40v3H0z" fill="#E39410"/></g><path d="M13.6 15.5h4.2v7.4l6.6-7.4h5.1l-7.5 8 8.1 10.4h-5.2l-5.9-7.8-1.2 1.3v6.5h-4.2z" fill="#1F2633"/></svg>';
  const SWOOSH = '<svg class="wm-line" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><path d="M2 6 C 20 2, 38 9, 56 5 S 88 3, 98 6" stroke="#F2A20C" stroke-width="3.2" fill="none" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>';
  function logo(el) {
    if (el.dataset.logo) return;
    el.dataset.logo = "1";
    if (el.classList.contains("mark-only")) { el.innerHTML = MARK; return; }
    const name = el.textContent.trim() || "Kal Kitna";
    el.innerHTML = `${MARK}<span class="wm-text">${esc(name)}${SWOOSH}</span>`;
  }

  function decorate() {
    document.querySelectorAll(".wordmark, .mark-only").forEach(logo);
    document.querySelectorAll("[data-theme-toggle]").forEach((b) => { if (!b.dataset.bound) { b.dataset.bound = "1"; b.addEventListener("click", toggleTheme); } });
    paintThemeButtons();
    document.querySelectorAll("svg.awning").forEach(awning);
  }
  window.addEventListener("resize", debounce(() => document.querySelectorAll("svg.awning").forEach(awning), 150));
  function setView(v) { if (v === "auto") { try { localStorage.removeItem("kk:view"); } catch { /* */ } } else store.set("view", v); }
  const getView = () => store.get("view", "auto");
  /* The server guesses phone or laptop; the page corrects it. A remembered choice or ?view= wins. */
  function fitLayout(current, base = "/app") {
    const asked = new URLSearchParams(location.search).get("view");
    if (asked === "mobile" || asked === "desktop") { setView(asked); return; }
    const pref = getView();
    if (pref !== "auto") { if (pref !== current) location.replace(base + "?view=" + pref + location.hash); return; }
    if (current === "desktop" && matchMedia("(max-width: 760px)").matches) location.replace(base + "?view=mobile" + location.hash);
    if (current === "mobile" && matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)").matches) location.replace(base + "?view=desktop" + location.hash);
  }

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
    lab: () => req("/lab/data"),
  };

  /* ---------- State ---------- */
  const DEFAULT_SUPPLIERS = [
    { id: "s1", name: "Sharma Dairy", phone: "", families: ["DAIRY", "EGGS"] },
    { id: "s2", name: "Green Valley Farms", phone: "", families: ["PRODUCE"] },
    { id: "s3", name: "Bakewell Bakery", phone: "", families: ["BREAD/BAKERY", "DELI"] },
    { id: "s4", name: "Coastal & Co.", phone: "", families: ["MEATS", "POULTRY", "SEAFOOD"] },
  ];
  const DEFAULT_PROFILE = { owner: "Ramesh ji", shop: "Ramesh Kirana", confirmBy: "8 pm" };
  /* S.date is the day being planned ("tomorrow"); the live shelf shows the day before it ("today"). */
  const S = { opts: null, store: null, date: null, family: "DAIRY", costs: {}, gw: 0.2, recs: {}, plan: {}, series: {}, profile: null, suppliers: [], hour: 13 };
  const planKey = () => `plan:${S.store}:${S.date}`;
  const priceOk = (f) => { const c = S.costs[f]; return !!c && Number(c.cost) > 0 && Number(c.price) > Number(c.cost); };
  const families = () => (S.opts ? ORDER.filter((f) => S.opts.families.includes(f)).concat(S.opts.families.filter((f) => !ORDER.includes(f))) : ORDER.slice());
  const today = () => addDays(S.date, -1);
  const minDate = () => addDays(S.opts.first_date, 8);

  async function init() {
    S.opts = await api.options();
    const o = S.opts;
    S.store = store.get("store", o.stores[0]);
    if (!o.stores.includes(S.store)) S.store = o.stores[0];
    const want = addDays(o.first_date, 15);
    S.date = want <= o.last_date ? want : o.last_date;
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
  const saveSuppliers = () => store.set("suppliers", S.suppliers);
  const supplierOf = (f) => S.suppliers.find((s) => s.families.includes(f)) || null;
  function assign(f, id) { S.suppliers.forEach((s) => { s.families = s.families.filter((x) => x !== f); }); const s = S.suppliers.find((x) => x.id === id); if (s) s.families.push(f); saveSuppliers(); }
  function addSupplier(name, phone) { const s = { id: "s" + Date.now(), name, phone, families: [] }; S.suppliers.push(s); saveSuppliers(); return s; }
  function removeSupplier(id) { S.suppliers = S.suppliers.filter((s) => s.id !== id); saveSuppliers(); }
  const initials = (n) => n.split(/\s+/).filter((w) => /[A-Za-z]/.test(w[0])).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
  const maskPhone = (p) => (p ? p.replace(/\d(?=\d{3})/g, "•") : "No number yet");

  /* ---------- Data ---------- */
  async function loadOrders() {
    const fams = S.opts.families.filter(priceOk);
    const out = await Promise.all(fams.map((f) => api.order({ store_nbr: S.store, family: f, date: S.date, cost: Number(S.costs[f].cost), price: Number(S.costs[f].price), goodwill_pct: S.gw })));
    S.recs = {}; out.forEach((r) => { S.recs[r.family] = r; });
  }
  async function loadSeries(f, storeNbr = S.store) {
    const k = `${storeNbr}:${f}`;
    if (!S.series[k]) S.series[k] = await api.series(storeNbr, f);
    return S.series[k];
  }
  const loadAllSeries = () => Promise.all(families().map((f) => loadSeries(f)));
  const seriesOf = (f) => S.series[`${S.store}:${f}`] || [];
  const rowOn = (f, iso) => seriesOf(f).find((d) => d.date === iso) || null;

  /* ---------- Planning (tomorrow) ---------- */
  function savePlan(f, q) { S.plan[f] = q; store.set(planKey(), S.plan); }
  function removePlan(f) { delete S.plan[f]; store.set(planKey(), S.plan); }
  function clearPlan() { S.plan = {}; store.set(planKey(), S.plan); }
  const planned = (f) => S.plan[f] != null;
  const plannedCount = () => Object.keys(S.plan).filter((f) => S.recs[f]).length;
  const qtyFor = (f) => S.plan[f] ?? (S.recs[f] ? Math.round(S.recs[f].recommended_order) : 0);
  const stockValue = () => families().reduce((s, f) => s + (S.recs[f] ? qtyFor(f) * Number(S.costs[f].cost) : 0), 0);
  const sliderTop = (r) => Math.max(10, Math.ceil(Math.max(r.forecast, r.actual ?? 0) * 1.7));
  function mistake(f, q, actual) {
    const c = S.costs[f], waste = Math.max(q - actual, 0), shortfall = Math.max(actual - q, 0);
    return { waste, shortfall, wasteRs: waste * c.cost, shortRs: shortfall * (c.price - c.cost), total: waste * c.cost + shortfall * ((c.price - c.cost) + S.gw * c.price) };
  }
  async function presets(f) {
    const r = S.recs[f], smart = Math.round(r.recommended_order);
    const list = [{ label: "Smart", q: smart }, { label: "Forecast", q: Math.round(r.forecast) }];
    try { const s = await loadSeries(f); const prev = s.find((d) => d.date === addDays(S.date, -7)); if (prev && prev.actual != null) list.push({ label: "Last " + day(prev.date, { weekday: "short" }), q: Math.round(prev.actual) }); } catch { /* */ }
    list.push({ label: "Play safe", q: Math.round(smart * 0.9) });
    return list.slice(0, 4);
  }
  function verdict(q, r) {
    const lo = r.recommended_order * 0.9, hi = r.recommended_order * 1.1;
    return q < lo ? { zone: 0, text: "Might run out" } : q > hi ? { zone: 2, text: "Might spoil" } : { zone: 1, text: "Sweet spot" };
  }
  function explain(f, q) {
    const r = S.recs[f], u = look(f).unit;
    if (r.actual == null) { const v = verdict(q, r); return v.zone === 1 ? "Close to the smart order: it balances spoilage against empty shelves." : v.zone === 0 ? "Below the smart order, so you may <b>run out early</b>." : "Above the smart order, so <b>some may spoil</b>."; }
    const m = mistake(f, q, r.actual), mf = mistake(f, Math.round(r.forecast), r.actual);
    const a = Math.round(m.shortfall) > 0 ? `<b>${whole(m.shortfall)} ${u} sell out early</b> (${money(m.shortRs)} of margin)` : "<b>nothing sells out</b>";
    const b = Math.round(m.waste) > 0 ? `<b>${whole(m.waste)} ${u} spoil</b> (${money(m.wasteRs)})` : "<b>nothing spoils</b>";
    let s = `That day the shop really sold <b>${whole(r.actual)} ${u}</b>. Ordering ${whole(q)} means ${a} and ${b}.`;
    if (Math.round(r.forecast) !== q && mf.total > m.total + 1) s += ` The plain forecast would have cost <b>${money(mf.total - m.total)} more</b> in mistakes.`;
    return s;
  }
  function insights(f, series) {
    const known = series.filter((d) => d.actual != null);
    const sold = known.reduce((a, d) => a + d.actual, 0), miss = known.reduce((a, d) => a + Math.abs(d.actual - d.forecast), 0);
    let saved = 0;
    for (let i = 7; i < series.length; i++) { const d = series[i], p = series[i - 7]; if (d.actual == null || p.actual == null) continue; saved += mistake(f, p.actual, d.actual).total - mistake(f, d.recommended_order, d.actual).total; }
    return { days: known.length, sold, accuracy: sold ? Math.max(0, 1 - miss / sold) : null, close: known.filter((d) => d.actual > 0 && Math.abs(d.actual - d.forecast) / d.actual <= 0.1).length, saved };
  }

  /* ---------- WhatsApp orders, one message per supplier ---------- */
  const itemsFor = (s) => s.families.filter((f) => planned(f) && S.recs[f]);
  function message(s) {
    const p = S.profile, first = s.name.split(" ")[0];
    const lines = itemsFor(s).map((f) => `• ${look(f).en}: ${fmt(S.plan[f])} ${look(f).unit}`);
    return [`Namaste ${first} ji 🙏`, `Order for ${day(S.date, { weekday: "short", day: "numeric", month: "short" })} · ${p.shop}`, "", ...lines, "", `Please confirm by ${p.confirmBy}. Thank you!`, p.shop].join("\n");
  }
  function waLink(s) { const d = (s.phone || "").replace(/\D/g, ""); return `https://wa.me/${d.length === 10 ? "91" + d : d}?text=${encodeURIComponent(message(s))}`; }
  function orderCSV() {
    const rows = [["supplier", "product", "units", "unit", "unit_cost", "stock_value"]];
    families().filter(planned).forEach((f) => { const s = supplierOf(f); rows.push([s ? s.name : "Unassigned", look(f).en, S.plan[f], look(f).unit, S.costs[f].cost, Math.round(S.plan[f] * S.costs[f].cost)]); });
    return rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
  }

  /* ---------- The demo day: a simulated live shelf for "today" ---------- */
  /* Share of a day's sales in each hour from 8 am to 10 pm (lunch and evening peaks). */
  const HOURLY = [3, 5, 7, 8, 9, 8, 6, 5, 6, 8, 10, 11, 8, 6];
  const OPEN = 8, CLOSE = 22;
  function cum(h) {
    if (h <= OPEN) return 0; if (h >= CLOSE) return 1;
    const full = Math.floor(h - OPEN), part = h - OPEN - full;
    let s = 0; for (let i = 0; i < full; i++) s += HOURLY[i];
    return (s + HOURLY[full] * part) / 100;
  }
  function hourWhen(fraction) { /* first hour at which cum(h) reaches fraction */
    if (fraction <= 0) return OPEN; if (fraction >= 1) return CLOSE;
    let lo = OPEN, hi = CLOSE; for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (cum(m) >= fraction) hi = m; else lo = m; } return hi;
  }
  function shelf(f, h = S.hour) {
    const T = rowOn(f, today()), Y = rowOn(f, addDays(today(), -1)), W = rowOn(f, addDays(today(), -7));
    if (!T || T.actual == null) return null;
    const stock = Math.max(1, Math.round(T.recommended_order)), c = cum(h);
    const sold = Math.min(stock, T.actual * c), left = Math.max(0, stock - sold), usual = T.forecast * c;
    const frac = left / stock;
    let runOut = null;
    if (T.actual > stock) runOut = Math.round(hourWhen(stock / T.actual) * 4) / 4; /* nearest quarter hour */
    let state = "usual";
    if (h < 9.25) state = "fresh";
    else if (left < 0.5) state = "out";
    else if (sold > usual * 1.1 && h >= 10) state = "fast";
    else if (frac > 0.85) state = "plenty";
    else if (frac < 0.15) state = "low";
    const usualOut = T.forecast > stock ? hourWhen(stock / T.forecast) : CLOSE;
    return {
      stock, sold, left, frac, state, runOut,
      hoursLeft: runOut && runOut > h ? runOut - h : null,
      earlier: runOut ? Math.max(0, Math.round(usualOut - runOut)) : 0,
      soldYesterday: Y && Y.actual != null ? Y.actual * c : null,
      soldLastWeek: W && W.actual != null ? W.actual * c : null,
      total: T.actual, forecast: T.forecast,
    };
  }
  const STATUS = { fresh: "Fresh stock arrived", out: "Sold out", fast: "Going faster than usual", plenty: "Plenty left", low: "Almost finished", usual: "Selling as usual" };
  const statusClass = (st) => (st === "fast" ? "fast" : st === "out" ? "out" : st === "fresh" ? "fresh" : "");
  function daySummary(h = S.hour) {
    const fams = families().filter((f) => shelf(f, h));
    const price = (f) => Number(S.costs[f].price);
    let moneySoFar = 0, lastWeek = 0;
    fams.forEach((f) => { const s = shelf(f, h); moneySoFar += s.sold * price(f); if (s.soldLastWeek != null) lastWeek += s.soldLastWeek * price(f); });
    const hours = HOURLY.map((w, i) => {
      const hr = OPEN + i, kind = hr + 1 <= h ? "past" : hr <= h ? "now" : "future";
      const v = fams.reduce((a, f) => { const T = rowOn(f, today()); return a + (kind === "future" ? T.forecast : T.actual) * (w / 100) * price(f); }, 0);
      return { hour: hr, value: v, kind };
    });
    const needs = fams.map((f) => [f, shelf(f, h)]).filter(([, s]) => s.state === "fast" && s.runOut && s.runOut > h).sort((a, b) => a[1].runOut - b[1].runOut);
    return { moneySoFar, lastWeek, hours, needs, lastWeekDay: day(addDays(today(), -7), { weekday: "long" }) };
  }

  /* Indian festival calendar placed on the demo dates (the demo data's dates are 2017). */
  const FESTIVALS = [
    ["2017-08-07", "Raksha Bandhan", "Sweets and milk sell more", "ti-gift"],
    ["2017-08-14", "Janmashtami", "Milk, curd and butter sell more", "ti-moon-stars"],
    ["2017-08-15", "Independence Day", "Many shops close early", "ti-flag"],
    ["2017-08-25", "Ganesh Chaturthi", "Sweets and flowers sell more", "ti-sparkles"],
  ];
  function cues() {
    const out = [], base = today();
    FESTIVALS.forEach(([iso, name, note, icon]) => {
      const n = Math.round((new Date(iso) - new Date(base)) / 864e5); name = t(name);
      if (n >= 0 && n <= 7) out.push({ icon, title: n === 0 ? t("{x} today", { x: name }) : n === 1 ? t("{x} tomorrow", { x: name }) : t("{x} in {n} days", { x: name, n }), note: t(note) });
    });
    const by = Array(7).fill(0), cnt = Array(7).fill(0);
    families().forEach((f) => seriesOf(f).forEach((d) => { if (d.actual == null) return; const w = new Date(d.date + "T00:00:00Z").getUTCDay(); by[w] += d.actual * Number(S.costs[f].price); cnt[w]++; }));
    const avg = by.map((v, i) => (cnt[i] ? v / cnt[i] : 0)), mean = avg.reduce((a, b) => a + b, 0) / 7, wd = new Date(S.date + "T00:00:00Z").getUTCDay();
    if (mean && avg[wd] > mean * 1.06) out.push({ icon: "ti-users", title: `${day(S.date, { weekday: "long" })}: ${t("Busier than usual")}`, note: `+${Math.round((avg[wd] / mean - 1) * 100)}%` });
    else if (mean && avg[wd] < mean * 0.94) out.push({ icon: "ti-mood-empty", title: `${day(S.date, { weekday: "long" })}: ${t("Quieter than usual")}`, note: `${Math.round((avg[wd] / mean - 1) * 100)}%` });
    const dom = Number(S.date.slice(8, 10));
    if (dom >= 28 || dom <= 2) out.push({ icon: "ti-wallet", title: t("Payday on the 1st"), note: t("Busier evenings") });
    return out;
  }
  function brandSplit(f, n) { const b = BRANDS[f] || ["Brand A", "Brand B"], a = Math.round(n * 0.57); return [[b[0], a], [b[1], Math.max(0, Math.round(n) - a)]]; }

  /* ---------- Shop insights (the Shop tab) ---------- */
  function shopInsights() {
    const fams = families(), price = (f) => Number(S.costs[f].price), T = today();
    const sumRange = (f, from, to) => seriesOf(f).filter((d) => d.date >= from && d.date <= to && d.actual != null).reduce((a, d) => a + d.actual * price(f), 0);
    const w0 = addDays(T, -6), p1 = addDays(T, -13), p0 = addDays(T, -7);
    const per = fams.map((f) => ({ f, week: sumRange(f, w0, T), prev: sumRange(f, p1, p0) }));
    const week = per.reduce((a, x) => a + x.week, 0), prev = per.reduce((a, x) => a + x.prev, 0);
    const ranked = per.slice().sort((a, b) => b.week - a.week);
    const by = Array(7).fill(0), cnt = Array(7).fill(0);
    fams.forEach((f) => seriesOf(f).forEach((d) => { if (d.actual == null) return; const w = new Date(d.date + "T00:00:00Z").getUTCDay(); by[w] += d.actual * price(f); cnt[w]++; }));
    const avg = by.map((v, i) => (cnt[i] ? v / cnt[i] : 0));
    const names = [0, 1, 2, 3, 4, 5, 6].map((i) => day(addDays("2017-07-16", i), { weekday: "long" }));
    let bestH = 0; for (let i = 1; i < HOURLY.length - 1; i++) if (HOURLY[i] + HOURLY[i + 1] > HOURLY[bestH] + HOURLY[bestH + 1]) bestH = i;
    const ins = fams.map((f) => insights(f, seriesOf(f))), acc = ins.filter((x) => x.accuracy != null);
    return {
      week, prev, change: prev ? week / prev - 1 : 0, ranked,
      weekday: avg, weekdayNames: names, busiestDay: avg.indexOf(Math.max(...avg)), quietestDay: avg.indexOf(Math.min(...avg.filter((x) => x > 0))),
      busiestHours: `${clockLabel(OPEN + bestH)} – ${clockLabel(OPEN + bestH + 2)}`,
      saved: ins.reduce((a, x) => a + x.saved, 0), accuracy: acc.length ? acc.reduce((a, x) => a + x.accuracy, 0) / acc.length : null,
    };
  }

  /* ---------- Drawing ---------- */
  function ring(icon, frac, state, size = 56) {
    const r = size / 2 - 4, C = 2 * Math.PI * r, col = state === "fast" || state === "out" ? "var(--loud)" : state === "fresh" ? "var(--good)" : "var(--slate)";
    return `<div class="ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" style="stroke:var(--mist)" stroke-width="5"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" style="stroke:${col}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${(C * Math.max(0.001, frac)).toFixed(1)} ${C.toFixed(1)}"/></svg><i class="ti ${icon}" aria-hidden="true"></i></div>`;
  }
  /* The real-world object for a product, filled by stock left (frac). */
  function objectSVG(f, frac) {
    const kind = look(f).obj, on = (i, n) => i < Math.round(frac * n);
    const full = "fill:var(--warm);stroke:var(--slate)", empty = "fill:none;stroke:var(--mist-deep)";
    let g = "";
    if (kind === "bottle") {
      for (let i = 0; i < 10; i++) { const x = 14 + (i % 5) * 58, y = Math.floor(i / 5) * 104, o = on(i, 10);
        g += `<g transform="translate(${x},${y})"><path d="M14 8h14v12c0 4 10 8 10 18v50a8 8 0 0 1-8 8H12a8 8 0 0 1-8-8V38c0-10 10-14 10-18z" style="${o ? full : empty}" stroke-width="2.5" ${o ? "" : 'stroke-dasharray="5 4"'}/><rect x="12" y="2" width="18" height="7" rx="2" style="fill:${o ? "var(--loud)" : "var(--mist-deep)"}"/></g>`; }
      g += `<rect x="4" y="98" width="292" height="6" rx="3" style="fill:var(--mist-deep)"/><rect x="4" y="202" width="292" height="6" rx="3" style="fill:var(--mist-deep)"/>`;
      return `<svg viewBox="0 0 300 210" class="chart" role="img" aria-label="Bottles on the shelf">${g}</svg>`;
    }
    if (kind === "egg") {
      g = `<path d="M8 16h284l-10 112H18z" style="fill:var(--mist)"/>`;
      for (let i = 0; i < 12; i++) { const cx = 40 + (i % 6) * 44, cy = 48 + Math.floor(i / 6) * 52, o = on(i, 12);
        g += `<circle cx="${cx}" cy="${cy}" r="19" style="fill:var(--card)"/>${o ? `<ellipse cx="${cx}" cy="${cy - 2}" rx="13" ry="16" style="${full}" stroke-width="2"/>` : ""}`; }
      return `<svg viewBox="0 0 300 140" class="chart" role="img" aria-label="Egg tray">${g}</svg>`;
    }
    if (kind === "loaf") {
      for (let i = 0; i < 10; i++) { const x = 10 + (i % 5) * 58, y = 18 + Math.floor(i / 5) * 80, o = on(i, 10);
        g += `<path transform="translate(${x},${y})" d="M4 52V24C4 10 14 4 26 4s22 6 22 20v28z" style="${o ? full : empty}" stroke-width="2.5" ${o ? "" : 'stroke-dasharray="5 4"'}/>`; }
      g += `<rect x="4" y="74" width="292" height="6" rx="3" style="fill:var(--mist-deep)"/><rect x="4" y="154" width="292" height="6" rx="3" style="fill:var(--mist-deep)"/>`;
      return `<svg viewBox="0 0 300 165" class="chart" role="img" aria-label="Loaves on the shelf">${g}</svg>`;
    }
    if (kind === "crate") {
      g = `<rect x="6" y="6" width="288" height="150" rx="16" style="fill:none;stroke:var(--mist-deep)" stroke-width="3"/>`;
      for (let i = 0; i < 20; i++) { const cx = 38 + (i % 5) * 56, cy = 34 + Math.floor(i / 5) * 32, o = on(i, 20);
        g += `<circle cx="${cx}" cy="${cy}" r="12" style="${o ? full : "fill:var(--mist);stroke:none"}" stroke-width="2"/>`; }
      return `<svg viewBox="0 0 300 162" class="chart" role="img" aria-label="Crate of vegetables">${g}</svg>`;
    }
    for (let i = 0; i < 10; i++) { const x = 10 + (i % 5) * 58, y = 14 + Math.floor(i / 5) * 72, o = on(i, 10);
      g += `<g transform="translate(${x},${y})"><rect x="2" y="6" width="46" height="46" rx="10" style="${o ? full : empty}" stroke-width="2.5" ${o ? "" : 'stroke-dasharray="5 4"'}/>${o ? `<rect x="10" y="22" width="30" height="5" rx="2" style="fill:var(--slate)"/>` : ""}</g>`; }
    g += `<rect x="4" y="64" width="292" height="6" rx="3" style="fill:var(--mist-deep)"/><rect x="4" y="136" width="292" height="6" rx="3" style="fill:var(--mist-deep)"/>`;
    return `<svg viewBox="0 0 300 145" class="chart" role="img" aria-label="Packs on the shelf">${g}</svg>`;
  }
  /* Stock through today: solid until now, dotted guess to closing. */
  function dayLine(f, h = S.hour, w = 320, ht = 130) {
    const s = shelf(f, h); if (!s) return "";
    const pl = 8, pr = 8, pt = 10, pb = 22, iw = w - pl - pr, ih = ht - pt - pb;
    const x = (hr) => pl + ((hr - OPEN) / (CLOSE - OPEN)) * iw, y = (v) => pt + ih * (1 - v / s.stock);
    const pts = (a, b) => { const out = []; for (let hr = a; hr <= b + 1e-6; hr += 0.25) out.push(`${x(hr).toFixed(1)},${y(Math.max(0, s.stock - Math.min(s.stock, s.total * cum(hr)))).toFixed(1)}`); return out.join(" "); };
    const usual = []; for (let hr = OPEN; hr <= CLOSE; hr += 0.5) usual.push(`${x(hr).toFixed(1)},${y(Math.max(0, s.stock - Math.min(s.stock, s.forecast * cum(hr)))).toFixed(1)}`);
    let g = `<line x1="${pl}" x2="${w - pr}" y1="${pt + ih}" y2="${pt + ih}" style="stroke:var(--mist-deep)"/>`;
    g += `<polyline points="${usual.join(" ")}" fill="none" style="stroke:var(--mist-deep)" stroke-width="2" stroke-dasharray="2 4"/>`;
    g += `<polyline points="${pts(OPEN, h)}" fill="none" style="stroke:var(--slate)" stroke-width="3.5" stroke-linecap="round"/>`;
    if (h < CLOSE) g += `<polyline points="${pts(h, CLOSE)}" fill="none" style="stroke:var(--loud)" stroke-width="2.5" stroke-dasharray="6 5"/>`;
    g += `<circle cx="${x(h)}" cy="${y(s.left)}" r="5.5" style="fill:var(--loud)"/>`;
    [OPEN, 12, 16, 20].forEach((hr) => { g += `<text x="${x(hr)}" y="${ht - 5}" text-anchor="middle">${clockLabel(hr)}</text>`; });
    return `<svg viewBox="0 0 ${w} ${ht}" class="chart" role="img" aria-label="Stock through the day">${g}</svg>`;
  }

  /* ---------- The demo clock ---------- */
  const clock = {
    timer: null, subs: [],
    on(fn) { this.subs.push(fn); },
    emit() { this.subs.forEach((fn) => fn(S.hour)); },
    set(h) { S.hour = Math.max(OPEN, Math.min(CLOSE, h)); this.emit(); },
    get playing() { return !!this.timer; },
    play() { if (this.timer) return; if (S.hour >= CLOSE - 0.01) S.hour = OPEN; this.timer = setInterval(() => { S.hour = Math.min(CLOSE, S.hour + 1 / 30); this.emit(); if (S.hour >= CLOSE) this.pause(); }, 2000); this.emit(); },
    pause() { clearInterval(this.timer); this.timer = null; this.emit(); },
  };

  /* ---------- Swipe to confirm ---------- */
  function swipe(track, onDone) {
    const handle = track.querySelector(".handle"), trail = track.querySelector(".trail");
    let start = null, x = 0;
    const max = () => track.clientWidth - handle.clientWidth - 12;
    const set = (v) => { handle.style.transform = `translateX(${v}px)`; if (trail) trail.style.width = v + 30 + "px"; };
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

  /* "↑ 12%" / "↓ 3%", but a change that rounds to zero reads as steady, not "↑ 0%". */
  function change(x, flat = "steady") {
    const p = Math.round((x || 0) * 100);
    return p === 0 ? flat : `${p > 0 ? "↑" : "↓"} ${Math.abs(p)}%`;
  }

  /* Four weeks of one product: bars = what really sold, marigold line = Kal Kitna's forecast.
     Hover or tap a day for its numbers; onPick(date) is called when a day is chosen. */
  function fourWeeks(box, series, w, h, selected, onPick) {
    if (!series.length) { box.innerHTML = ""; return; }
    const pl = 38, pb = 24, pt = 10, ih = h - pt - pb;
    const mx = Math.max(1, ...series.map((d) => Math.max(d.forecast, d.actual ?? 0))) * 1.15, bw = (w - pl - 4) / series.length;
    const x = (i) => pl + i * bw + bw / 2, y = (v) => pt + ih * (1 - v / mx);
    let g = "";
    for (let k = 0; k <= 3; k++) { const v = (mx * k) / 3, yy = y(v).toFixed(1); g += `<line x1="${pl}" x2="${w}" y1="${yy}" y2="${yy}" style="stroke:var(--line)"/><text x="${pl - 6}" y="${+yy + 3}" text-anchor="end">${fmt(v)}</text>`; }
    series.forEach((d, i) => { if (d.actual != null) { const yy = y(d.actual); g += `<rect x="${(x(i) - bw * 0.3).toFixed(1)}" y="${yy.toFixed(1)}" width="${(bw * 0.6).toFixed(1)}" height="${(pt + ih - yy).toFixed(1)}" rx="4" style="fill:${d.date === selected ? "var(--mist-deep)" : "var(--mist)"}"/>`; } });
    g += `<polyline points="${series.map((d, i) => `${x(i).toFixed(1)},${y(d.forecast).toFixed(1)}`).join(" ")}" fill="none" style="stroke:var(--loud)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
    const si = series.findIndex((d) => d.date === selected);
    if (si >= 0) g += `<line x1="${x(si)}" x2="${x(si)}" y1="${pt}" y2="${pt + ih}" style="stroke:var(--ink)" stroke-opacity=".35" stroke-dasharray="3 3"/><circle cx="${x(si)}" cy="${y(series[si].forecast)}" r="5" style="fill:var(--card);stroke:var(--loud)" stroke-width="3"/>`;
    series.forEach((d, i) => { if (i % 7 === 0) g += `<text x="${x(i)}" y="${h - 6}" text-anchor="middle">${day(d.date, { day: "numeric", month: "short" })}</text>`;
      g += `<rect data-i="${i}" x="${(pl + i * bw).toFixed(1)}" y="${pt}" width="${bw.toFixed(1)}" height="${ih}" fill="transparent" style="cursor:pointer"/>`; });
    box.innerHTML = `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Four weeks: forecast line and sold bars">${g}</svg>`;
    const tip = document.createElement("div"); tip.className = "tip"; box.appendChild(tip);
    const at = (e) => { const el = e.target.closest("[data-i]"); if (!el) return; const d = series[Number(el.dataset.i)], r = box.getBoundingClientRect(), p = e.touches ? e.touches[0] : e;
      const off = d.actual ? Math.round((Math.abs(d.forecast - d.actual) / d.actual) * 100) : null;
      tip.innerHTML = `<b>${day(d.date, { weekday: "short", day: "numeric", month: "short" })}</b><br>${t("Forecast")}: <b>${fmt(d.forecast)}</b>${d.actual != null ? `<br>${t("Really sold")}: <b>${fmt(d.actual)}</b><br>${t("Off by")} ${off}%` : ""}`;
      tip.style.opacity = 1; const tw = tip.offsetWidth; tip.style.left = Math.max(4, Math.min(box.clientWidth - tw - 4, p.clientX - r.left - tw / 2)) + "px"; tip.style.top = Math.max(0, p.clientY - r.top - tip.offsetHeight - 14) + "px"; };
    box.onmousemove = at; box.ontouchstart = at; box.onmouseleave = () => { tip.style.opacity = 0; };
    if (onPick) box.onclick = (e) => { const el = e.target.closest("[data-i]"); if (el) onPick(series[Number(el.dataset.i)].date); };
  }

  window.KK = {
    change, MARK, fourWeeks,
    S, LOOK, look, t, pname, punit, setLang, extendHI, lang: () => LANG,
    fmt, whole, money, day, short, addDays, clockLabel, debounce, esc, greeting,
    decorate, setTheme, toggleTheme, fitLayout, setView, getView, api, init, families, priceOk, today, minDate,
    setStore, setDate, setCost, setGoodwill, resetPrices, setProfile, supplierOf, assign, addSupplier, removeSupplier, saveSuppliers, initials, maskPhone,
    loadOrders, loadSeries, loadAllSeries, seriesOf, savePlan, removePlan, clearPlan, planned, plannedCount, qtyFor, stockValue, sliderTop,
    mistake, presets, verdict, explain, insights, itemsFor, message, waLink, orderCSV,
    shelf, STATUS, statusClass, daySummary, cues, brandSplit, shopInsights, cum, OPEN, CLOSE,
    ring, objectSVG, dayLine, clock, swipe, toast, haptic,
  };
})();
