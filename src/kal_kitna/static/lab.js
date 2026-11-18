/* Kal Kitna Lab (v9): plain-language story charts and the "Beat the model" game.
   All numbers come from models/lab.json: summaries of the real test weeks, never data rows. */
(function () {
  "use strict";
  const K = window.KK;
  const per100 = (w) => Math.round(w * 100);
  const n0 = (x) => Math.round(x).toLocaleString("en-IN");
  const pct = (x, d = 0) => (x * 100).toFixed(d) + "%";

  function headline(R) {
    const o = R.overall, rule = o.last_week.wape, model = o.model.wape;
    return { rule: per100(rule), avg4: per100(o.four_week.wape), model: per100(model), gain: 1 - model / Math.min(rule, o.four_week.wape) };
  }
  function answerBars(R) {
    const h = headline(R), mx = Math.max(h.rule, h.avg4, h.model);
    const bar = (label, v, loud) => `<div class="abar"><span${loud ? ' class="me"' : ""}>${label}</span><div class="track"><div style="width:${(v / mx) * 100}%;background:${loud ? "var(--loud)" : "var(--mist-deep)"}"></div></div><b>${v}</b></div>`;
    return bar("Rule of thumb", h.rule) + bar("4-week average", h.avg4) + bar("Kal Kitna", h.model, true);
  }
  function storeSquares(R) {
    return R.by_store.map((s) => { const win = s.model < s.last_week; return `<span class="sq ${win ? "win" : ""}" title="Store ${s.store}: Kal Kitna off by ${per100(s.model)} per 100, rule of thumb by ${per100(s.last_week)}"></span>`; }).join("");
  }
  const storeWins = (R) => R.by_store.filter((s) => s.model < s.last_week).length;
  function productRows(R, metric = "wape") {
    const fams = K.families().filter((f) => R.by_family[f]);
    if (metric === "bias") {
      /* Bias: does each method lean high (+, more than sold) or low (−)? Closer to zero is better. */
      const mxb = Math.max(...fams.flatMap((f) => [Math.abs(R.by_family[f].last_week.bias), Math.abs(R.by_family[f].model.bias)])) || 1;
      const sg = (v) => (v >= 0 ? "+" : "−") + (Math.abs(v) * 100).toFixed(1) + "%";
      return fams.map((f) => { const d = R.by_family[f];
        return `<div class="prow"><span class="pname"><i class="ti ${K.look(f).icon}"></i>${K.look(f).en}</span><div class="pbars"><div class="track"><div style="width:${(Math.abs(d.last_week.bias) / mxb) * 100}%;background:var(--mist-deep)"></div></div><div class="track"><div style="width:${(Math.abs(d.model.bias) / mxb) * 100}%;background:var(--loud)"></div></div></div><span class="pnum"><b>${sg(d.model.bias)}</b> <small>vs ${sg(d.last_week.bias)}</small></span></div>`; }).join("");
    }
    const mx = Math.max(...fams.map((f) => R.by_family[f].last_week.wape));
    return fams.map((f) => { const d = R.by_family[f], r = per100(d.last_week.wape), m = per100(d.model.wape);
      return `<div class="prow"><span class="pname"><i class="ti ${K.look(f).icon}"></i>${K.look(f).en}</span><div class="pbars"><div class="track"><div style="width:${(d.last_week.wape / mx) * 100}%;background:var(--mist-deep)"></div></div><div class="track"><div style="width:${(d.model.wape / mx) * 100}%;background:var(--loud)"></div></div></div><span class="pnum"><b>${m}</b> <small>vs ${r}</small></span></div>`; }).join("");
  }

  /* Every test day: bars = really sold, dashed = rule of thumb, marigold = Kal Kitna. Hover/tap for numbers. */
  const SERIES_DEFAULT = { actual: true, model: true, last_week: true, four_week: false };
  function daily(box, rows, w, h, on = SERIES_DEFAULT) {
    const pl = 44, pb = 24, pt = 10, ih = h - pt - pb;
    const mx = Math.max(...rows.map((d) => Math.max(on.actual ? d.actual : 0, on.model ? d.model : 0, on.last_week ? d.last_week : 0, on.four_week ? d.four_week || 0 : 0, 1))) * 1.1;
    const bw = (w - pl - 6) / rows.length, x = (i) => pl + i * bw + bw / 2, y = (v) => pt + ih * (1 - v / mx);
    let g = "";
    for (let k = 0; k <= 3; k++) { const v = (mx * k) / 3, yy = y(v).toFixed(1); g += `<line x1="${pl}" x2="${w}" y1="${yy}" y2="${yy}" style="stroke:var(--line)"/><text x="${pl - 8}" y="${+yy + 3}" text-anchor="end">${v >= 1000 ? Math.round(v / 1000) + "k" : n0(v)}</text>`; }
    if (on.actual) rows.forEach((d, i) => { const yy = y(d.actual); g += `<rect x="${(x(i) - bw * 0.32).toFixed(1)}" y="${yy.toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" height="${(pt + ih - yy).toFixed(1)}" rx="4" style="fill:var(--mist)"/>`; });
    const line = (k) => rows.map((d, i) => `${x(i).toFixed(1)},${y(d[k]).toFixed(1)}`).join(" ");
    if (on.four_week) g += `<polyline points="${line("four_week")}" fill="none" style="stroke:var(--ink-3)" stroke-width="2" stroke-dasharray="2 5" stroke-linecap="round"/>`;
    if (on.last_week) g += `<polyline points="${line("last_week")}" fill="none" style="stroke:var(--mist-deep)" stroke-width="2.5" stroke-dasharray="6 5"/>`;
    if (on.model) g += `<polyline points="${line("model")}" fill="none" style="stroke:var(--loud)" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    rows.forEach((d, i) => { if (i % 7 === 0) g += `<text x="${x(i)}" y="${h - 6}" text-anchor="middle">${K.day(d.date, { day: "numeric", month: "short" })}</text>`;
      g += `<line class="guide" x1="${x(i)}" x2="${x(i)}" y1="${pt}" y2="${pt + ih}" style="stroke:var(--ink)" stroke-opacity=".2" opacity="0" data-g="${i}"/><rect data-i="${i}" x="${(pl + i * bw).toFixed(1)}" y="${pt}" width="${bw.toFixed(1)}" height="${ih}" fill="transparent"/>`; });
    box.innerHTML = `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Every test day: what really sold, the rule of thumb and Kal Kitna">${g}</svg>`;
    let tip = box.querySelector(".tip"); if (!tip) { tip = document.createElement("div"); tip.className = "tip"; box.appendChild(tip); }
    const show = (e) => { const el = e.target.closest("[data-i]"); if (!el) return; const i = Number(el.dataset.i), d = rows[i], r = box.getBoundingClientRect(), p = e.touches ? e.touches[0] : e;
      box.querySelectorAll(".guide").forEach((gd) => gd.setAttribute("opacity", gd.dataset.g == i ? 1 : 0));
      const off = (v) => per100(Math.abs(v - d.actual) / (d.actual || 1));
      tip.innerHTML = `<b>${K.day(d.date, { weekday: "short", day: "numeric", month: "short" })}</b><br>Really sold: <b>${n0(d.actual)}</b><br>Kal Kitna: <b>${n0(d.model)}</b> (off by ${off(d.model)}%)<br>Rule of thumb: <b>${n0(d.last_week)}</b> (off by ${off(d.last_week)}%)${on.four_week && d.four_week ? `<br>Four-week average: <b>${n0(d.four_week)}</b> (off by ${off(d.four_week)}%)` : ""}`;
      tip.style.opacity = 1; const tw = tip.offsetWidth; tip.style.left = Math.max(4, Math.min(box.clientWidth - tw - 4, p.clientX - r.left - tw / 2)) + "px"; tip.style.top = Math.max(0, p.clientY - r.top - tip.offsetHeight - 14) + "px"; };
    box.onmousemove = show; box.ontouchstart = show; box.onmouseleave = () => { tip.style.opacity = 0; box.querySelectorAll(".guide").forEach((gd) => gd.setAttribute("opacity", 0)); };
  }

  /* Beat the model: see the last 7 days, guess the next, compare with Kal Kitna. */
  function game(root, R) {
    const fams = K.families().filter((f) => R.daily_by_family[f]);
    let score = { you: 0, model: 0, rounds: 0 }, cur = null;
    const pick = () => { const f = fams[Math.floor(Math.random() * fams.length)], rows = R.daily_by_family[f], i = 7 + Math.floor(Math.random() * (rows.length - 7)); return { f, rows, i }; };
    function draw() {
      cur = pick(); const { f, rows, i } = cur, past = rows.slice(i - 7, i), day = rows[i];
      const mx = Math.max(...past.map((d) => d.actual), day.actual) * 1.15;
      root.querySelector("[data-g-title]").innerHTML = `<i class="ti ${K.look(f).icon}"></i> ${K.look(f).en}, all 54 stores · ${K.day(day.date, { weekday: "long", day: "numeric", month: "short" })}`;
      root.querySelector("[data-g-bars]").innerHTML = past.map((d) => `<div><i style="height:${(d.actual / mx) * 100}%"></i><span>${K.day(d.date, { weekday: "short" }).slice(0, 2)}</span><small>${n0(d.actual)}</small></div>`).join("") + `<div class="q"><i style="height:0"></i><span>${K.day(day.date, { weekday: "short" }).slice(0, 2)}</span><small>?</small></div>`;
      const inp = root.querySelector("[data-g-in]"); inp.value = ""; inp.placeholder = `Your guess (e.g. ${n0(past[past.length - 1].actual)})`;
      root.querySelector("[data-g-out]").innerHTML = ""; root.querySelector("[data-g-go]").hidden = false; root.querySelector("[data-g-next]").hidden = true;
    }
    function reveal() {
      const inp = root.querySelector("[data-g-in]"), guess = Number(String(inp.value).replace(/[^\d.]/g, ""));
      if (!guess) { inp.focus(); return; }
      const d = cur.rows[cur.i], off = (v) => Math.abs(v - d.actual) / d.actual, you = off(guess), m = off(d.model), rule = off(d.last_week);
      score.rounds++; if (you < m) score.you++; else score.model++;
      root.querySelector("[data-g-out]").innerHTML = `<div class="reveal"><div><span>Really sold</span><b>${n0(d.actual)}</b></div><div class="me"><span>Kal Kitna</span><b>${n0(d.model)}</b><em>off by ${pct(m)}</em></div><div><span>You</span><b>${n0(guess)}</b><em>off by ${pct(you)}</em></div><div><span>Rule of thumb</span><b>${n0(d.last_week)}</b><em>off by ${pct(rule)}</em></div></div>
        <p class="verdict">${you < m ? "You beat the model this round. Nice instinct." : "Kal Kitna was closer this time."} <span>Score: you ${score.you}, Kal Kitna ${score.model}</span></p>`;
      root.querySelector("[data-g-go]").hidden = true; root.querySelector("[data-g-next]").hidden = false;
    }
    root.querySelector("[data-g-go]").onclick = reveal;
    root.querySelector("[data-g-in]").onkeydown = (e) => { if (e.key === "Enter") reveal(); };
    root.querySelector("[data-g-next]").onclick = draw;
    draw();
  }
  const GAME_HTML = `<div class="game"><div class="g-title" data-g-title></div><div class="g-bars" data-g-bars></div>
    <div class="g-row"><input class="input" data-g-in inputmode="numeric" aria-label="Your guess"><button class="btn btn-loud" data-g-go>Reveal</button><button class="btn btn-quiet" data-g-next hidden>Next round</button></div><div data-g-out></div></div>`;

  function within10(R, k) { const s = R.errors.shares[k]; return s[0] + s[1]; }
  function importance(R) {
    const NAMES = { lag_1: "Yesterday's sales", lag_7: "Same day last week", lag_14: "Two weeks ago", lag_28: "Four weeks ago", mean_7: "Last 7-day average", mean_28: "Last 28-day average", day_of_week: "Day of the week", family: "Product", store_nbr: "Store", onpromotion: "Promotions" };
    const mx = Math.max(...R.importance.map((r) => r.share));
    return R.importance.slice(0, 6).map((r) => `<div class="imp"><span>${NAMES[r.feature] || r.feature}</span><div class="track"><div style="width:${(r.share / mx) * 100}%"></div></div><b>${pct(r.share)}</b></div>`).join("");
  }
  const RUNS = [["first model", "lr 0.05, lags 1/7/14", 0.0827, 1977], ["tenor-knit", "allow 5,000 trees", 0.0826, 2276], ["dotal-nosh", "learning rate 0.1", 0.084, 1057], ["lunar-ossa", "+ 28-day lag", 0.0817, 1397, true], ["fuggy-farl", "28-day lag at lr 0.05", 0.0823, 2691]];
  const STAGES = ["prepare", "explore", "featurize", "baseline", "train", "decide", "export", "demo", "lab"];
  function dataFolks(R) {
    const o = R.overall;
    return `<table class="tbl"><tr><th>Method</th><th class="r">WAPE</th><th class="r">Bias</th></tr>
      <tr><td>Four-week average</td><td class="r">${o.four_week.wape.toFixed(4)}</td><td class="r">${pct(o.four_week.bias, 1)}</td></tr>
      <tr><td>Same day last week</td><td class="r">${o.last_week.wape.toFixed(4)}</td><td class="r">${pct(o.last_week.bias, 1)}</td></tr>
      <tr class="me"><td>Kal Kitna (LightGBM)</td><td class="r">${o.model.wape.toFixed(4)}</td><td class="r">${pct(o.model.bias, 1)}</td></tr></table>
      <p class="fine">WAPE = total units off ÷ total units sold, on ${R.window.rows.toLocaleString("en-IN")} store-product-days the model never saw (${K.day(R.window.start, { day: "numeric", month: "short" })} – ${K.day(R.window.end, { day: "numeric", month: "short", year: "numeric" })}).</p>
      <h4>Experiments (validation only; test read once)</h4>
      <table class="tbl"><tr><th>Run</th><th>Change</th><th class="r">Valid WAPE</th><th class="r">Trees</th></tr>${RUNS.map(([n, c, w, tr, win]) => `<tr class="${win ? "me" : ""}"><td>${n}</td><td>${c}</td><td class="r">${w.toFixed(4)}</td><td class="r">${tr.toLocaleString("en-IN")}</td></tr>`).join("")}</table>
      <p class="fine">The 28-day lag only helped together with the faster learning rate: an interaction an isolating run revealed.</p>
      <h4>What the model leans on</h4>${importance(R)}
      <h4>Pipeline: <code>uv run dvc repro</code></h4><div class="stages">${STAGES.map((s) => `<span>${s}</span>`).join("")}</div>
      <h4>The data</h4><p class="fine">Corporación Favorita grocery sales (Kaggle): 54 stores, 4.5 years, 8 perishable product families, 727,488 rows. Fake zeros before each product's first sale were removed; Christmas closures, the 2016 earthquake and paydays became features. The licence forbids sharing the data, so this page shows only summaries, and the app runs the real model on simulated stores.</p>`;
  }


  /* ===================== Explore the evidence: five interactive charts =====================
     Same colour rule everywhere: marigold = Kal Kitna, grey = the rule of thumb. */
  const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  function tipOn(box, html) {
    const t = document.createElement("div"); t.className = "tip"; box.appendChild(t);
    const hide = () => { t.style.opacity = 0; box.querySelectorAll("[data-i]").forEach((n) => n.classList.remove("hot")); };
    const at = (e) => {
      const el = e.target.closest("[data-i]"); if (!el) { hide(); return; }
      box.querySelectorAll("[data-i]").forEach((n) => n.classList.toggle("hot", n === el));
      const r = box.getBoundingClientRect(), p = e.touches ? e.touches[0] : e;
      t.innerHTML = html(Number(el.dataset.i)); t.style.opacity = 1;
      const tw = t.offsetWidth; t.style.left = Math.max(4, Math.min(box.clientWidth - tw - 4, p.clientX - r.left - tw / 2)) + "px";
      t.style.top = Math.max(0, p.clientY - r.top - t.offsetHeight - 14) + "px";
    };
    box.onmousemove = at; box.ontouchstart = at; box.onmouseleave = hide;
  }
  const svg = (w, h, label, g) => `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">${g}</svg>`;

  /* 1. Heat map: products down the side, test days across; marigold where Kal Kitna was closer. */
  function heatmap(box, R, w) {
    const fams = K.families().filter((f) => R.daily_by_family[f]), days = R.daily_by_family[fams[0]].map((d) => d.date);
    const narrow = w < 520, pl = narrow ? 74 : 112, pt = 26, ch = narrow ? 22 : 30, gap = narrow ? 3 : 4;
    const cw = (w - pl - 2) / days.length, h = pt + fams.length * (ch + gap) + 4, cells = [];
    let g = "", wins = 0;
    days.forEach((dt, j) => { if (j % 7 === 0) g += `<text x="${(pl + j * cw).toFixed(1)}" y="14">${K.day(dt, { day: "numeric", month: "short" })}</text>`; });
    fams.forEach((f, i) => {
      const y = pt + i * (ch + gap);
      g += `<text x="${pl - 8}" y="${y + ch / 2 + 4}" text-anchor="end" style="fill:var(--ink-2);font-size:${narrow ? 10.5 : 12}px">${K.look(f).en}</text>`;
      R.daily_by_family[f].forEach((d, j) => {
        const a = d.actual || 1, em = Math.abs(d.model - d.actual) / a, el = Math.abs(d.last_week - d.actual) / a, v = el - em;
        if (v > 0) wins++;
        const k = Math.min(1, Math.abs(v) / 0.12), idx = cells.push({ f, d, em, el }) - 1;
        g += `<rect class="cell" data-i="${idx}" x="${(pl + j * cw + 1).toFixed(1)}" y="${y}" width="${Math.max(1, cw - 2).toFixed(1)}" height="${ch}" rx="${narrow ? 3 : 5}" style="fill:${v > 0 ? "var(--loud)" : "var(--mist-deep)"}" fill-opacity="${(0.14 + 0.86 * k).toFixed(2)}"/>`;
      });
    });
    box.innerHTML = svg(w, h, "Heat map of every product on every test day, showing where Kal Kitna was closer than the rule of thumb", g);
    tipOn(box, (i) => { const c = cells[i];
      return `<b>${K.look(c.f).en} · ${K.day(c.d.date, { weekday: "short", day: "numeric", month: "short" })}</b><br>Kal Kitna off by <b>${per100(c.em)}</b> per 100<br>Rule of thumb off by <b>${per100(c.el)}</b> per 100<br>${c.el > c.em ? "Kal Kitna was closer" : "The rule of thumb was closer"}`; });
    return { wins, n: cells.length };
  }

  /* 2. How far off, how often: share of store-product-days in each error band. */
  function bands(box, R, w, h) {
    const e = R.errors, keys = ["model", "last_week"], pl = 38, pb = 26, pt = 10, ih = h - pt - pb;
    const mx = Math.max(...keys.flatMap((k) => e.shares[k])) * 1.15, gw = (w - pl - 4) / e.bins.length, bw = Math.min(30, gw / 3);
    let g = "";
    for (let k = 0; k <= 3; k++) { const yy = pt + ih * (1 - k / 3); g += `<line x1="${pl}" x2="${w}" y1="${yy}" y2="${yy}" style="stroke:var(--line)"/><text x="${pl - 6}" y="${yy + 3}" text-anchor="end">${Math.round((mx * k) / 3 * 100)}%</text>`; }
    e.bins.forEach((b, i) => {
      const cx = pl + i * gw + gw / 2;
      keys.forEach((k, j) => { const hh = (e.shares[k][i] / mx) * ih; g += `<rect x="${(cx + (j ? 3 : -bw - 3)).toFixed(1)}" y="${(pt + ih - hh).toFixed(1)}" width="${bw.toFixed(1)}" height="${hh.toFixed(1)}" rx="5" style="fill:${k === "model" ? "var(--loud)" : "var(--mist-deep)"}"/>`; });
      g += `<text x="${cx}" y="${h - 8}" text-anchor="middle"${w < 520 ? ' style="font-size:9.5px"' : ""}>${w < 520 ? b : b + " off"}</text><rect data-i="${i}" x="${pl + i * gw}" y="${pt}" width="${gw}" height="${ih}" fill="transparent"/>`;
    });
    box.innerHTML = svg(w, h, "How far off each forecast was, Kal Kitna against the rule of thumb", g);
    tipOn(box, (i) => `<b>${e.bins[i]} off</b><br>Kal Kitna: <b>${pct(e.shares.model[i])}</b> of days<br>Rule of thumb: <b>${pct(e.shares.last_week[i])}</b> of days`);
  }

  /* 3. By weekday: units off per 100 sold, each day of the week. */
  function weekdays(box, R, w, h) {
    const rows = R.by_weekday, pl = 34, pb = 24, pt = 10, ih = h - pt - pb, keys = ["model", "last_week"];
    const mx = Math.max(...rows.flatMap((r) => keys.map((k) => r[k]))) * 1.18, gw = (w - pl - 4) / rows.length, bw = Math.min(26, gw / 3.2);
    let g = "";
    for (let k = 0; k <= 3; k++) { const yy = pt + ih * (1 - k / 3); g += `<line x1="${pl}" x2="${w}" y1="${yy}" y2="${yy}" style="stroke:var(--line)"/><text x="${pl - 6}" y="${yy + 3}" text-anchor="end">${per100((mx * k) / 3)}</text>`; }
    rows.forEach((r, i) => {
      const cx = pl + i * gw + gw / 2;
      keys.forEach((k, j) => { const hh = (r[k] / mx) * ih; g += `<rect x="${(cx + (j ? 3 : -bw - 3)).toFixed(1)}" y="${(pt + ih - hh).toFixed(1)}" width="${bw.toFixed(1)}" height="${hh.toFixed(1)}" rx="5" style="fill:${k === "model" ? "var(--loud)" : "var(--mist-deep)"}"/>`; });
      g += `<text x="${cx}" y="${h - 7}" text-anchor="middle">${WD[r.day]}</text><rect data-i="${i}" x="${pl + i * gw}" y="${pt}" width="${gw}" height="${ih}" fill="transparent"/>`;
    });
    box.innerHTML = svg(w, h, "Units off per 100 sold for each day of the week", g);
    tipOn(box, (i) => { const r = rows[i]; return `<b>${["Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays", "Sundays"][r.day]}</b><br>Kal Kitna off by <b>${per100(r.model)}</b> per 100<br>Rule of thumb off by <b>${per100(r.last_week)}</b> per 100`; });
    return rows.filter((r) => r.model < r.last_week).length;
  }

  /* 4. Every store: x = rule-of-thumb error, y = Kal Kitna error. Below the line, Kal Kitna wins. */
  function scatter(box, R, w) {
    const s = Math.min(w, 460), rows = R.by_store, p = 40, side = s - p - 12;
    const mx = Math.max(...rows.flatMap((r) => [r.model, r.last_week])) * 1.08, sc = (v) => (v / mx) * side, ox = p, oy = s - p + 6;
    let g = `<polygon points="${ox},${oy} ${ox + side},${oy - side} ${ox + side},${oy}" style="fill:var(--loud-soft)"/><line x1="${ox}" y1="${oy}" x2="${ox + side}" y2="${oy - side}" style="stroke:var(--mist-deep)" stroke-dasharray="5 5"/>`;
    g += `<text x="${ox + side - 8}" y="${oy - 10}" text-anchor="end" style="fill:var(--ink);font-weight:600">Kal Kitna better</text>`;
    for (let k = 0; k <= 3; k++) { const v = (mx * k) / 3; g += `<text x="${ox + sc(v)}" y="${oy + 16}" text-anchor="middle">${per100(v)}</text><text x="${ox - 6}" y="${oy - sc(v) + 3}" text-anchor="end">${per100(v)}</text>`; }
    g += `<text x="${ox + side / 2}" y="${s + 8}" text-anchor="middle">Rule of thumb: units off per 100</text><text transform="translate(11 ${oy - side / 2}) rotate(-90)" text-anchor="middle">Kal Kitna: units off per 100</text>`;
    rows.forEach((r, i) => { g += `<circle class="dot" data-i="${i}" cx="${(ox + sc(r.last_week)).toFixed(1)}" cy="${(oy - sc(r.model)).toFixed(1)}" r="${w < 520 ? 5.5 : 6.5}" style="fill:${r.model < r.last_week ? "var(--loud)" : "var(--mist-deep)"};stroke:var(--card)" stroke-width="1.5"/>`; });
    box.innerHTML = `<div style="max-width:${s}px;margin:0 auto">${svg(s, s + 14, "Every store: Kal Kitna's error against the rule of thumb's", g)}</div>`;
    tipOn(box, (i) => { const r = rows[i], ch = 1 - r.model / r.last_week;
      return `<b>Store ${r.store}</b><br>Kal Kitna off by <b>${per100(r.model)}</b> per 100<br>Rule of thumb off by <b>${per100(r.last_week)}</b> per 100<br>${ch > 0 ? Math.round(ch * 100) + "% fewer mistakes" : "The rule of thumb did better here"}`; });
  }

  /* 5. In rupees: the three ordering rules replayed on the test weeks (from business.json). */
  function rupees(R) {
    const b = R.business;
    if (!b || !b.policies) return `<p class="sub">Rupee results appear here after the pipeline's decide stage has run on the real data.</p>`;
    const P = b.policies, names = { naive_last_week: "Order like last week", forecast_only: "Order the forecast", kal_kitna: "Order the Kal Kitna way" };
    const money = (x) => "₹" + Math.round(x).toLocaleString("en-IN");
    const keys = Object.keys(names).filter((k) => P[k]), mx = Math.max(...keys.map((k) => P[k].mistake_cost_rs || 0)) || 1;
    return `<div class="rs">${keys.map((k) => `<div class="rrow ${k === "kal_kitna" ? "me" : ""}"><span>${names[k]}</span><div class="track"><div style="width:${((P[k].mistake_cost_rs || 0) / mx) * 100}%"></div></div><b>${money(P[k].mistake_cost_rs || 0)}</b></div>`).join("")}</div>
      <p class="sub" style="margin-top:6px">Bars show the cost of mistakes: spoiled stock plus missed sales. Shorter is better.</p>
      <table class="tbl rtbl"><tr><th>Rule</th><th class="r">Profit</th><th class="r hide-s">Waste</th><th class="r hide-s">Missed sales</th><th class="r">Fill rate</th></tr>
      ${keys.map((k) => `<tr class="${k === "kal_kitna" ? "me" : ""}"><td>${names[k]}</td><td class="r">${money(P[k].profit_rs)}</td><td class="r hide-s">${money(P[k].waste_rs)}</td><td class="r hide-s">${money(P[k].stockout_rs)}</td><td class="r">${pct(P[k].fill_rate)}</td></tr>`).join("")}</table>`;
  }


  /* 6. Pie charts: three donuts, each answering one question with a few slices. */
  function arc(cx, cy, r0, r1, a0, a1) {
    const big = a1 - a0 > Math.PI ? 1 : 0, p = (r, a) => `${(cx + r * Math.sin(a)).toFixed(2)} ${(cy - r * Math.cos(a)).toFixed(2)}`;
    if (a1 - a0 >= Math.PI * 2 - 1e-6) a1 = a0 + Math.PI * 2 - 1e-4;
    return `M${p(r1, a0)} A${r1} ${r1} 0 ${big} 1 ${p(r1, a1)} L${p(r0, a1)} A${r0} ${r0} 0 ${big} 0 ${p(r0, a0)} Z`;
  }
  function donut(parts, size, centre, sub, tips) {
    const c = size / 2, r1 = c - 4, r0 = r1 * 0.62, tot = parts.reduce((a, p) => a + p.v, 0) || 1;
    let a = 0, g = "";
    parts.forEach((p) => { const a1 = a + (p.v / tot) * Math.PI * 2; const idx = tips.push(p.tip) - 1;
      g += `<path class="slice" data-i="${idx}" d="${arc(c, c, r0, r1, a + 0.012, a1 - 0.012)}" style="fill:${p.fill}" fill-opacity="${p.op ?? 1}"/>`; a = a1; });
    g += `<text x="${c}" y="${c + 4}" text-anchor="middle" style="fill:var(--ink);font-size:${size * 0.15}px;font-weight:700">${centre}</text><text x="${c}" y="${c + size * 0.13}" text-anchor="middle" style="font-size:${Math.max(10, size * 0.065)}px">${sub}</text>`;
    return `<svg class="chart donut" viewBox="0 0 ${size} ${size}" role="img" aria-label="${sub}">${g}</svg>`;
  }
  function pies(box, R, w) {
    const narrow = w < 640, size = narrow ? 190 : 210, tips = [];
    const fams = K.families().filter((f) => R.by_family[f]);
    const mIn = within10(R, "model"), rIn = within10(R, "last_week");
    // 1. Within 10%: two small donuts side by side
    const pair = (v, name, loud) => donut([{ v, fill: loud ? "var(--loud)" : "var(--mist-deep)", tip: `<b>${name}</b><br>Within 10% of real sales on <b>${pct(v)}</b> of store-product-days` },
      { v: 1 - v, fill: "var(--mist)", tip: `<b>${name}</b><br>More than 10% off on <b>${pct(1 - v)}</b> of store-product-days` }], narrow ? 140 : 150, pct(v), name, tips);
    // 2. What sells: share of units, quiet shades, biggest first
    const units = fams.map((f) => ({ f, v: R.by_family[f].units || 0 })).sort((a, b) => b.v - a.v), U = units.reduce((a, x) => a + x.v, 0) || 1;
    const sells = units.map((x, i) => ({ v: x.v, fill: "var(--slate)", op: Math.max(0.22, 1 - i * 0.11), tip: `<b>${K.look(x.f).en}</b><br><b>${pct(x.v / U)}</b> of all units sold` }));
    // 3. Mistakes avoided: per product, units of error the rule of thumb made minus Kal Kitna's, over the test weeks
    const saved = fams.map((f) => ({ f, v: Math.max(0, R.daily_by_family[f].reduce((a, d) => a + Math.abs(d.last_week - d.actual) - Math.abs(d.model - d.actual), 0)) })).sort((a, b) => b.v - a.v);
    const S = saved.reduce((a, x) => a + x.v, 0) || 1;
    const avoided = saved.map((x, i) => ({ v: x.v, fill: "var(--loud)", op: Math.max(0.2, 1 - i * 0.11), tip: `<b>${K.look(x.f).en}</b><br><b>${pct(x.v / S)}</b> of all mistakes avoided<br>${n0(x.v)} units closer than the rule of thumb` }));
    const legend = (rows, tot, loud) => `<div class="pie-legend">${rows.slice(0, 5).map((x, i) => `<span><i style="background:${loud ? "var(--loud)" : "var(--slate)"};opacity:${Math.max(loud ? 0.2 : 0.22, 1 - i * 0.11)}"></i>${K.look(x.f).en}<b>${pct(x.v / tot)}</b></span>`).join("")}${rows.length > 5 ? `<span class="more">+ ${rows.length - 5} more</span>` : ""}</div>`;
    box.innerHTML = `<div class="pies">
      <div class="pie"><b class="h">Close to real sales</b><p class="sub">Share of store-product-days within 10% of what really sold.</p><div class="pair">${pair(mIn, "Kal Kitna", true)}${pair(rIn, "Rule of thumb", false)}</div></div>
      <div class="pie"><b class="h">What sells</b><p class="sub">Each product's share of all units sold in the test weeks.</p>${donut(sells, size, pct(units[0].v / U), K.look(units[0].f).en, tips)}${legend(units, U, false)}</div>
      <div class="pie"><b class="h">Where Kal Kitna saves most</b><p class="sub">Each product's share of all the mistakes Kal Kitna avoided.</p>${donut(avoided, size, pct(saved[0].v / S), K.look(saved[0].f).en, tips)}${legend(saved, S, true)}</div>
    </div>`;
    tipOn(box, (i) => tips[i]);
    return { mIn, rIn, top: K.look(saved[0].f).en, topShare: saved[0].v / S };
  }

  /* Toggle chips for the daily chart's lines. */
  const SERIES = [["actual", "Really sold", "var(--mist)"], ["model", "Kal Kitna", "var(--loud)"], ["last_week", "Rule of thumb", "var(--mist-deep)"], ["four_week", "Four-week average", "var(--ink-3)"]];
  function seriesToggles(el, on, redraw) {
    el.innerHTML = SERIES.map(([k, n, c]) => `<button class="toggle" aria-pressed="${on[k]}" data-k="${k}"><i style="background:${c}"></i>${n}</button>`).join("");
    el.querySelectorAll("button").forEach((b) => (b.onclick = () => { on[b.dataset.k] = !on[b.dataset.k]; if (!Object.values(on).some(Boolean)) on.model = true; seriesToggles(el, on, redraw); redraw(); }));
  }

  /* Best and worst stores (restored from the launched Lab). */
  function storeTable(R, top = 6, bottom = 3) {
    const sorted = [...R.by_store].sort((a, b) => (1 - b.model / b.last_week) - (1 - a.model / a.last_week));
    const list = sorted.slice(0, top).concat(sorted.slice(-bottom));
    return `<table class="tbl"><tr><th>Store</th><th class="r">Kal Kitna</th><th class="r">Rule of thumb</th><th class="r">Change</th></tr>${list.map((s, i) => { const ch = 1 - s.model / s.last_week;
      return `${i === top ? `<tr><td colspan="4" style="color:var(--ink-3);font-size:11.5px">Where the rule of thumb held up</td></tr>` : ""}<tr><td>Store ${s.store}</td><td class="r">${per100(s.model)}</td><td class="r">${per100(s.last_week)}</td><td class="r" style="font-weight:600;color:${ch > 0 ? "var(--good)" : "var(--bad)"}">${ch > 0 ? "−" : "+"}${Math.abs(Math.round(ch * 100))}%</td></tr>`; }).join("")}</table>
      <p class="sub" style="margin-top:6px">Units off per 100 sold. Change is how many fewer mistakes Kal Kitna made.</p>`;
  }

  /* Try it: the real model on simulated demo stores (restored from the launched Lab). */
  async function tryIt(root, w) {
    root.innerHTML = `<div class="between" style="flex-wrap:wrap;gap:10px"><p class="sub" style="margin:0">The real model on simulated stores. Pick a store and product, then tap any day.</p><select class="input" data-t-store style="width:auto;height:40px"></select></div>
      <div class="ev-tabs" data-t-chips></div><div class="chart-box" data-t-chart style="margin-top:10px"><div class="skel" style="height:200px"></div></div>
      <div class="reveal" data-t-tiles style="margin-top:12px"></div>`;
    try { if (!K.S.opts) await K.init(); } catch (e) { root.querySelector("[data-t-chart]").innerHTML = `<p class="sub">${K.esc(e.message)}</p>`; return; }
    let store = K.S.store, fam = K.families().includes("DAIRY") ? "DAIRY" : K.families()[0], sel = null;
    const sEl = root.querySelector("[data-t-store]");
    sEl.innerHTML = K.S.opts.stores.map((s) => `<option value="${s}" ${s === store ? "selected" : ""}>Store ${s}</option>`).join("");
    sEl.onchange = () => { store = Number(sEl.value); sel = null; draw(); };
    async function draw() {
      const c = root.querySelector("[data-t-chips]");
      c.innerHTML = K.families().map((f) => `<button class="chip" aria-pressed="${f === fam}" data-f="${f}"><i class="ti ${K.look(f).icon}"></i>${K.look(f).en}</button>`).join("");
      c.querySelectorAll("button").forEach((b) => (b.onclick = () => { fam = b.dataset.f; draw(); }));
      const s = await K.loadSeries(fam, store); sel = sel && s.some((d) => d.date === sel) ? sel : s[s.length - 1].date;
      K.fourWeeks(root.querySelector("[data-t-chart]"), s, w, w < 520 ? 200 : 240, sel, (d) => { sel = d; draw(); });
      const ins = K.insights(fam, s), d = s.find((x) => x.date === sel);
      root.querySelector("[data-t-tiles]").innerHTML = `<div class="me"><span>Forecast accuracy</span><b>${ins.accuracy == null ? "–" : Math.round(ins.accuracy * 100) + "%"}</b><em>4 weeks</em></div><div><span>Days within 10%</span><b>${ins.close}/${ins.days}</b><em>of real sales</em></div><div><span>${K.day(sel, { weekday: "short", day: "numeric", month: "short" })}</span><b>${K.fmt(d.forecast)} → ${K.fmt(d.actual)}</b><em>forecast → sold</em></div><div><span>Units sold</span><b>${K.fmt(ins.sold)}</b><em>4 weeks</em></div>`;
    }
    draw();
  }

  /* One-line, plain-language reading for each chart. */
  function evidenceSay(kind, R, extra) {
    const ws = R.by_store.filter((s) => s.model < s.last_week).length;
    return {
      heat: `Each square is one product on one test day. <b>Marigold</b> means Kal Kitna was closer than the rule of thumb; the deeper the colour, the bigger the win. Kal Kitna was closer on <b>${extra || "–"}</b> product-days.`,
      bands: `How far off each guess was. Kal Kitna landed within 10% of real sales on <b>${pct(within10(R, "model"))}</b> of store-product-days, against <b>${pct(within10(R, "last_week"))}</b> for the rule of thumb.`,
      week: `Units off for every 100 sold, by day of the week. Kal Kitna is ahead on <b>${extra} of 7</b> days, weekends included.`,
      stores: `Each dot is one store. Dots in the shaded area are stores where Kal Kitna made fewer mistakes: <b>${ws} of ${R.by_store.length}</b>.`,
      rupees: `The same test weeks replayed with three ways of ordering, at illustrative prices.`,
      pies: extra && extra.top ? `Three questions, one pie each. Kal Kitna lands close to real sales more often, and saves the most on <b>${extra.top.toLowerCase()}</b> (${pct(extra.topShare)} of all mistakes avoided).` : "",
    }[kind];
  }

  window.LAB = { seriesToggles, SERIES_DEFAULT, storeTable, tryIt, pies, heatmap, bands, weekdays, scatter, rupees, evidenceSay, headline, answerBars, storeSquares, storeWins, productRows, daily, game, GAME_HTML, within10, dataFolks, per100, pct };
})();
