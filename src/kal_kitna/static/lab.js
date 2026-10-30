/* Kal Kitna Lab charts: shared by lab-desktop.html and lab-mobile.html.
   Every chart is plain SVG, sized by the caller, with a tooltip that works for mouse and touch. */
(function () {
  "use strict";
  const K = window.KK;
  const SERIES = {
    actual: { label: "Sold", color: "#cfdcff" },
    model: { label: "Kal Kitna", color: "#4c7dff" },
    last_week: { label: "Same day last week", color: "#e89a2e" },
    four_week: { label: "Four-week average", color: "#98a2b8" },
  };
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const pct = (x, d = 1) => (x == null ? "–" : (x * 100).toFixed(d) + "%");
  const n0 = (x) => Math.round(x).toLocaleString("en-IN");

  async function load() {
    const r = await fetch("/lab/data");
    if (!r.ok) throw new Error("The Lab report hasn't been generated yet. Run `uv run dvc repro` on the real data.");
    return r.json();
  }

  /* ---------- tooltip ---------- */
  function tip(box) {
    let t = box.querySelector(".tip");
    if (!t) { t = document.createElement("div"); t.className = "tip"; t.setAttribute("role", "status"); box.appendChild(t); }
    return {
      show(html, x, y) {
        t.innerHTML = html; t.style.opacity = 1;
        const bw = box.clientWidth, tw = t.offsetWidth;
        t.style.left = Math.max(4, Math.min(bw - tw - 4, x - tw / 2)) + "px";
        t.style.top = Math.max(4, y - t.offsetHeight - 12) + "px";
      },
      hide() { t.style.opacity = 0; },
    };
  }
  function bindHits(box, onShow) {
    const T = tip(box);
    const at = (e) => { const el = e.target.closest("[data-i]"); if (!el) return; const r = box.getBoundingClientRect(), p = e.touches ? e.touches[0] : e; onShow(T, Number(el.dataset.i), p.clientX - r.left, p.clientY - r.top); };
    box.onmousemove = at; box.ontouchstart = at; box.onmouseleave = () => { T.hide(); box.querySelectorAll(".guide").forEach((g) => g.setAttribute("opacity", 0)); };
  }

  /* ---------- daily totals: bars sold, lines per method ---------- */
  function daily(box, rows, on, w, h) {
    const pl = 46, pb = 26, pt = 12, ih = h - pt - pb;
    const keys = ["model", "last_week", "four_week"].filter((k) => on[k]);
    const mx = Math.max(1, ...rows.map((d) => Math.max(d.actual, ...keys.map((k) => d[k])))) * 1.1;
    const bw = (w - pl - 8) / rows.length, x = (i) => pl + i * bw + bw / 2, y = (v) => pt + ih * (1 - v / mx);
    let g = "";
    for (let k = 0; k <= 4; k++) { const v = (mx * k) / 4, yy = y(v).toFixed(1); g += `<line x1="${pl}" x2="${w}" y1="${yy}" y2="${yy}" stroke="#eef2f8"/><text x="${pl - 8}" y="${+yy + 3}" text-anchor="end">${v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + "k" : n0(v)}</text>`; }
    if (on.actual) rows.forEach((d, i) => { const yy = y(d.actual); g += `<rect x="${(x(i) - bw * 0.32).toFixed(1)}" y="${yy.toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" height="${(pt + ih - yy).toFixed(1)}" rx="4" fill="${SERIES.actual.color}"/>`; });
    keys.forEach((k) => {
      const dash = k === "last_week" ? ' stroke-dasharray="5 4"' : k === "four_week" ? ' stroke-dasharray="2 4"' : "";
      g += `<polyline points="${rows.map((d, i) => `${x(i).toFixed(1)},${y(d[k]).toFixed(1)}`).join(" ")}" fill="none" stroke="${SERIES[k].color}" stroke-width="${k === "model" ? 3 : 2}" stroke-linecap="round" stroke-linejoin="round"${dash}/>`;
    });
    rows.forEach((d, i) => {
      if (i % 7 === 0) g += `<text x="${x(i)}" y="${h - 6}" text-anchor="middle">${K.day(d.date, { day: "numeric", month: "short" })}</text>`;
      g += `<line class="guide" x1="${x(i)}" x2="${x(i)}" y1="${pt}" y2="${pt + ih}" stroke="#1e2a45" stroke-opacity=".25" opacity="0" data-g="${i}"/>`;
      g += `<rect data-i="${i}" x="${(pl + i * bw).toFixed(1)}" y="${pt}" width="${bw.toFixed(1)}" height="${ih}" fill="transparent"/>`;
    });
    box.innerHTML = `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Daily units sold against each forecasting method over the test weeks">${g}</svg>`;
    bindHits(box, (T, i, px, py) => {
      const d = rows[i];
      box.querySelectorAll(".guide").forEach((el) => el.setAttribute("opacity", el.dataset.g == i ? 1 : 0));
      const line = (k) => { const err = Math.abs(d[k] - d.actual) / (d.actual || 1); return `<div><i style="background:${SERIES[k].color}"></i>${SERIES[k].label}<b>${n0(d[k])}</b><span>${pct(err, 0)} off</span></div>`; };
      T.show(`<strong>${K.short(d.date)}</strong><div><i style="background:#9fb7ff"></i>Sold<b>${n0(d.actual)}</b><span></span></div>${keys.map(line).join("")}`, px, py);
    });
  }

  /* ---------- per-product comparison ---------- */
  function families(box, byFam, metric, w) {
    const fams = K.families().filter((f) => byFam[f]);
    const rowH = 46, h = fams.length * rowH + 30, pl = w < 500 ? 78 : 110, pr = 70;
    const val = (f, k) => (metric === "bias" ? byFam[f][k].bias : byFam[f][k].wape);
    const mx = Math.max(...fams.map((f) => Math.max(Math.abs(val(f, "model")), Math.abs(val(f, "last_week"))))) * 1.1 || 1;
    const sx = (v) => (Math.abs(v) / mx) * (w - pl - pr);
    let g = `<text x="${pl}" y="12">${metric === "bias" ? "Lean (+ over, − under)" : "Error (WAPE)"} · Kal Kitna vs same day last week</text>`;
    fams.forEach((f, i) => {
      const y0 = 26 + i * rowH, L = K.look(f), m = val(f, "model"), b = val(f, "last_week");
      const better = metric === "bias" ? Math.abs(m) < Math.abs(b) : m < b;
      g += `<text x="0" y="${y0 + 19}" font-weight="600" fill="#1e2a45" font-size="12">${L.name}</text>`;
      g += `<rect x="${pl}" y="${y0 + 4}" width="${Math.max(2, sx(b)).toFixed(1)}" height="12" rx="6" fill="#ffe1b8"/>`;
      g += `<rect x="${pl}" y="${y0 + 20}" width="${Math.max(2, sx(m)).toFixed(1)}" height="12" rx="6" fill="#4c7dff"/>`;
      g += `<text x="${(pl + sx(b) + 6).toFixed(1)}" y="${y0 + 14}">${pct(b)}</text><text x="${(pl + sx(m) + 6).toFixed(1)}" y="${y0 + 30}" fill="#2f5fe0" font-weight="600">${pct(m)}</text>`;
      if (metric === "wape") g += `<text x="${w}" y="${y0 + 24}" text-anchor="end" font-weight="700" fill="${better ? "#1f9d62" : "#e8604f"}" font-size="12">${better ? "−" : "+"}${Math.abs(Math.round((1 - m / b) * 100))}%</text>`;
      g += `<rect data-i="${i}" x="0" y="${y0}" width="${w}" height="${rowH - 4}" fill="transparent"/>`;
    });
    box.innerHTML = `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Error per product for Kal Kitna and the baseline">${g}</svg>`;
    bindHits(box, (T, i, px, py) => {
      const f = fams[i], d = byFam[f];
      T.show(`<strong>${K.look(f).name}</strong><div><i style="background:#4c7dff"></i>Kal Kitna<b>${pct(d.model.wape)}</b><span>bias ${pct(d.model.bias)}</span></div><div><i style="background:#e89a2e"></i>Last week<b>${pct(d.last_week.wape)}</b><span>bias ${pct(d.last_week.bias)}</span></div><div><i style="background:#98a2b8"></i>4-week avg<b>${pct(d.four_week.wape)}</b><span></span></div><p>${n0(d.units)} units sold in the test weeks</p>`, px, py);
    });
  }

  /* ---------- error by weekday ---------- */
  function weekdays(box, rows, w, h) {
    const pl = 40, pb = 24, pt = 10, ih = h - pt - pb, keys = ["model", "last_week"];
    const mx = Math.max(...rows.flatMap((r) => keys.map((k) => r[k]))) * 1.15;
    const gw = (w - pl - 6) / rows.length, bw = Math.min(18, gw / 3.2);
    let g = "";
    for (let k = 0; k <= 3; k++) { const v = (mx * k) / 3, yy = pt + ih * (1 - k / 3); g += `<line x1="${pl}" x2="${w}" y1="${yy}" y2="${yy}" stroke="#eef2f8"/><text x="${pl - 6}" y="${yy + 3}" text-anchor="end">${pct(v, 0)}</text>`; }
    rows.forEach((r, i) => {
      const cx = pl + i * gw + gw / 2;
      keys.forEach((k, j) => { const hh = (r[k] / mx) * ih; g += `<rect x="${(cx + (j - 1) * bw + (j ? 2 : -2)).toFixed(1)}" y="${(pt + ih - hh).toFixed(1)}" width="${bw}" height="${hh.toFixed(1)}" rx="4" fill="${k === "model" ? "#4c7dff" : "#ffcf86"}"/>`; });
      g += `<text x="${cx}" y="${h - 6}" text-anchor="middle">${DAYS[r.day]}</text><rect data-i="${i}" x="${pl + i * gw}" y="${pt}" width="${gw}" height="${ih}" fill="transparent"/>`;
    });
    box.innerHTML = `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Error by weekday">${g}</svg>`;
    bindHits(box, (T, i, px, py) => { const r = rows[i]; T.show(`<strong>${DAYS[r.day]}days</strong><div><i style="background:#4c7dff"></i>Kal Kitna<b>${pct(r.model)}</b><span></span></div><div><i style="background:#e89a2e"></i>Last week<b>${pct(r.last_week)}</b><span></span></div>`, px, py); });
  }

  /* ---------- stores: each dot is a store; below the line = model wins ---------- */
  function stores(box, rows, w, h, onPick) {
    w = h = Math.min(w, h, 480); /* a square plot reads best; centred by the caller's box */
    const p = 36, mx = Math.max(...rows.flatMap((r) => [r.model, r.last_week])) * 1.08, s = (v) => (v / mx) * (Math.min(w, h) - p * 1.4);
    const ox = p, oy = h - p, side = Math.min(w, h) - p * 1.4;
    let g = `<polygon points="${ox},${oy} ${ox + side},${oy - side} ${ox + side},${oy}" fill="#e6f7ee" opacity=".7"/>`;
    g += `<line x1="${ox}" y1="${oy}" x2="${ox + side}" y2="${oy - side}" stroke="#98a2b8" stroke-dasharray="4 4"/>`;
    g += `<text x="${ox + side - 6}" y="${oy - 10}" text-anchor="end" fill="#1f9d62" font-weight="600">Kal Kitna better</text>`;
    for (let k = 0; k <= 3; k++) { const v = (mx * k) / 3; g += `<text x="${ox + s(v)}" y="${oy + 16}" text-anchor="middle">${pct(v, 0)}</text><text x="${ox - 6}" y="${oy - s(v) + 3}" text-anchor="end">${pct(v, 0)}</text>`; }
    g += `<text x="${ox + side / 2}" y="${h - 2}" text-anchor="middle">Same day last week (error)</text>`;
    g += `<text transform="translate(10 ${oy - side / 2}) rotate(-90)" text-anchor="middle">Kal Kitna (error)</text>`;
    rows.forEach((r, i) => { const win = r.model < r.last_week; g += `<circle data-i="${i}" cx="${(ox + s(r.last_week)).toFixed(1)}" cy="${(oy - s(r.model)).toFixed(1)}" r="${w < 500 ? 5 : 6}" fill="${win ? "#4c7dff" : "#e8604f"}" fill-opacity=".85" stroke="#fff" stroke-width="1.5" style="cursor:pointer"/>`; });
    box.innerHTML = `<svg class="chart" viewBox="0 0 ${w} ${h}" style="max-width:${w}px;margin:0 auto" role="img" aria-label="Each store's error: Kal Kitna against the baseline">${g}</svg>`;
    bindHits(box, (T, i, px, py) => { const r = rows[i]; T.show(`<strong>Store ${r.store}</strong><div><i style="background:#4c7dff"></i>Kal Kitna<b>${pct(r.model)}</b><span></span></div><div><i style="background:#e89a2e"></i>Last week<b>${pct(r.last_week)}</b><span></span></div><p style="font-weight:600;color:${r.model < r.last_week ? "#7fe0ae" : "#ff9a8c"}">${r.model < r.last_week ? Math.round((1 - r.model / r.last_week) * 100) + "% less error" : "baseline wins here"}</p>`, px, py); if (onPick) onPick(r); });
  }

  /* ---------- error histogram ---------- */
  function errors(box, e, w, h) {
    const pl = 36, pb = 24, pt = 10, ih = h - pt - pb, keys = ["model", "last_week"];
    const mx = Math.max(...keys.flatMap((k) => e.shares[k])) * 1.15, gw = (w - pl - 6) / e.bins.length, bw = Math.min(22, gw / 3);
    let g = "";
    for (let k = 0; k <= 3; k++) { const yy = pt + ih * (1 - k / 3); g += `<line x1="${pl}" x2="${w}" y1="${yy}" y2="${yy}" stroke="#eef2f8"/><text x="${pl - 6}" y="${yy + 3}" text-anchor="end">${pct((mx * k) / 3, 0)}</text>`; }
    e.bins.forEach((b, i) => {
      const cx = pl + i * gw + gw / 2;
      keys.forEach((k, j) => { const hh = (e.shares[k][i] / mx) * ih; g += `<rect x="${(cx + (j - 1) * bw + (j ? 2 : -2)).toFixed(1)}" y="${(pt + ih - hh).toFixed(1)}" width="${bw}" height="${hh.toFixed(1)}" rx="4" fill="${k === "model" ? "#4c7dff" : "#ffcf86"}"/>`; });
      g += `<text x="${cx}" y="${h - 6}" text-anchor="middle">${b}</text><rect data-i="${i}" x="${pl + i * gw}" y="${pt}" width="${gw}" height="${ih}" fill="transparent"/>`;
    });
    box.innerHTML = `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="How far off each forecast was">${g}</svg>`;
    bindHits(box, (T, i, px, py) => T.show(`<strong>${e.bins[i]} off</strong><div><i style="background:#4c7dff"></i>Kal Kitna<b>${pct(e.shares.model[i])}</b><span>of days</span></div><div><i style="background:#e89a2e"></i>Last week<b>${pct(e.shares.last_week[i])}</b><span>of days</span></div>`, px, py));
  }
  const within10 = (e, k) => e.shares[k][0] + e.shares[k][1];

  function importance(box, rows) {
    const NAMES = { lag_1: "Yesterday's sales", lag_7: "Same day last week", lag_14: "Two weeks ago", lag_28: "Four weeks ago", mean_7: "Last 7-day average", mean_28: "Last 28-day average", day_of_week: "Day of the week", day_of_month: "Day of the month", month: "Month", family: "Product", store_nbr: "Store", onpromotion: "Promotions", is_payday: "Payday", is_holiday: "Holiday", is_pre_christmas: "Pre-Christmas rush", is_quake_period: "Earthquake weeks", city: "City", type: "Store type", cluster: "Store cluster" };
    const mx = Math.max(...rows.map((r) => r.share));
    box.innerHTML = rows.map((r) => `<div class="imp"><span>${NAMES[r.feature] || r.feature}</span><div class="track"><div style="width:${(r.share / mx) * 100}%"></div></div><b>${pct(r.share, 0)}</b></div>`).join("");
  }

  window.LAB = { SERIES, load, daily, families, weekdays, stores, errors, importance, within10, pct, n0 };
})();
