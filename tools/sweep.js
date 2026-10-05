/* Control sweep — click every interactive control in both apps and assert the
   page actually changed. Three controls were dead for four releases because
   verification only covered what had been edited, not what might have been
   disturbed; a button wired to a missing function is valid JavaScript and fails
   silently. Run before every ship:
       cd titans-apps && python3 -m http.server 8807 &
       node tools/sweep.js
   Exits non-zero if anything is dead. */
const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:8807";
let fails = 0, checks = 0;

async function sweep(b, app, path, controls) {
  const pg = await (await b.newContext({ viewport:{width:1280,height:1100}, serviceWorkers:"block" })).newPage();
  const errs = []; pg.on("pageerror", e => errs.push(String(e)));
  await pg.goto(BASE + path, { waitUntil:"load" });
  await pg.waitForTimeout(1400);
  console.log("\n" + app);
  for (const [name, sel, probe, setup, expect] of controls) {
    if (setup) { await pg.evaluate(setup); await pg.waitForTimeout(250); }
    if (sel === null) {                      /* presence check, nothing to click */
      const v = await pg.evaluate(probe); checks++;
      const ok = String(v) === String(expect);
      console.log((ok ? "  ok   " : "  MISS ") + name.padEnd(22) + v + " (expected " + expect + ")");
      if (!ok) fails++;
      continue;
    }
    let before;
    try { before = await pg.evaluate(probe); }
    catch(e){ console.log("  x  " + name + " — probe failed: " + e.message); fails++; continue; }
    try { await pg.click(sel, { timeout:3000 }); }
    catch(e){ console.log("  x  " + name + " — cannot click " + sel); fails++; continue; }
    await pg.waitForTimeout(300);
    const after = await pg.evaluate(probe);
    const ok = before !== after; checks++;
    console.log((ok ? "  ok   " : "  DEAD ") + name.padEnd(22) +
                '"' + String(before).slice(0,30) + '" -> "' + String(after).slice(0,30) + '"');
    if (!ok) fails++;
  }
  if (errs.length) { console.log("  page errors: " + errs.join(" | ")); fails += errs.length; }
  await pg.close();
}

const t = s => `(document.querySelector(${JSON.stringify(s)})||{}).textContent||"∅"`;
const c = s => `(document.querySelector(${JSON.stringify(s)})||{}).className||"∅"`;
const n = s => `document.querySelectorAll(${JSON.stringify(s)}).length`;

/* The whole stylesheet once went missing from a playground build. Every control
   still worked, the sweep passed, and the page was unreadable. Appearance is not
   something the control checks can see, so assert it directly: the rules loaded,
   and the navy header bar is actually painted. */
/* The published playground runs in a sandboxed iframe with no allow-modals, so
   window.confirm() returns false instantly and alert() does nothing - silently.
   Every guarded action was dead in the playground for weeks while working on the
   iPad. Nothing may call a native dialog; everything asks through ask(). */
const NO_NATIVE_DIALOGS =
  '(function(){' +
  ' var src = document.documentElement.innerHTML;' +
  ' var bad = /[^.\\w](confirm|alert|prompt)\\s*\\(/.test(' +
  '   src.replace(/\\/\\*[\\s\\S]*?\\*\\//g, "") );' +
  ' return (!bad)+"";' +
  '})()';

const styled = sel =>
  '(function(){' +
  ' var n=[].slice.call(document.styleSheets).reduce(function(t,s){' +
  '   try{return t+s.cssRules.length}catch(e){return t} },0);' +
  ' var b=document.querySelector(' + JSON.stringify(sel) + ');' +
  ' var bg=b?getComputedStyle(b).backgroundColor:"";' +
  ' var painted=!!bg && bg!=="transparent" && bg.indexOf("rgba(0, 0, 0, 0)")<0;' +
  ' return (n>80 && painted)+"";' +
  '})()';

(async () => {
  const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium" });

  await sweep(b, "PITCH CHART", "/game/index.html", [
    ["no native dialogs", null,              NO_NATIVE_DIALOGS, null, "true"],
    ["stylesheet",       null,                            styled('.top'), null, "true"],
    ["call pad cell",    "#callPad button:nth-child(3)",  t("#callHint")],
    ["call pad toggle",  "#callPad button:nth-child(3)",  t("#callHint")],
    ["zone cell",        "#zone .cell:nth-child(13)",     t("#seq")],
    ["pitch type",       "#types button:nth-child(2)",    t("#types button.on")],
    ["mod button",       "#mods button:nth-child(2)",     t("#seq")],
    ["trajectory",       "#trajRow button:nth-child(1)",  c("#trajRow button:nth-child(1)")],
    ["hard contact",     "#hardBtn",                      c("#hardBtn")],
    ["result",           "#results button:nth-child(5)",  t("#results button.on")],
    ["undo",             "#btnUndo",                      t("#seq")],
    ["batter strip",     "#scoutPick button:nth-child(1)",c("#scoutPick button:nth-child(1)")],
    ["scout tag",        "#tagsP button:nth-child(1)",    c("#tagsP button:nth-child(1)")],
    ["position seg",     "#posSeg button:nth-child(3)",   c("#posSeg button:nth-child(3)")],
    ["report tab",       '#tabs button[data-tab="mix"]',  'document.getElementById("tab-mix").style.display'],
    ["lineup toggle",    "#btnLeft",                      c(".wrap")],
    ["colour key",       null,                            n(".zonekey span"), null, 4],
    ["finish & file",    null,                            n("#btnFinish"), null, 1],
    ["history pane",     null,                            n("#tab-hist"), null, 1],
  ]);

  /* Several of these refuse once the at-bat is closed, which is correct - so each
     one that needs a live at-bat gets a clean one first, rather than the sweep
     reporting the app's own guards as dead controls. */
  const freshPA = 'O.pas=[newPA(0,0)]; O.cur=O.pas.length-1; render();';
  const onePitch = freshPA + ' logPitch(2,2); render();';
  await sweep(b, "OFFENSE CHART", "/offense/index.html", [
    ["no native dialogs", null,              NO_NATIVE_DIALOGS, null, "true"],
    ["stylesheet",       null,                            styled('.top'), null, "true"],
    /* presence, not change: these must always be on screen */
    ["fielder numbers",  null,                            n("#diamond text"), 'showTab("chart");', 9],
    ["colour key",       null,                            n(".zonekey span"), null, 3],
    ["pitch type",       "#types button:nth-child(3)",    t("#types button.on"), 'showTab("chart");'],
    ["zone cell",        "#zone .cell:nth-child(13)",     t("#seq"),  freshPA],
    ["mod button",       "#mods button:nth-child(2)",     t("#seq"),  onePitch],
    ["trajectory",       "#trajRow button:nth-child(1)",  c("#trajRow button:nth-child(1)"), onePitch],
    ["hard contact",     "#hardBtn",                      c("#hardBtn"), onePitch],
    ["result",           "#results button:nth-child(5)",  t("#results button.on"), onePitch],
    ["spray scope",      '[data-spray] [data-sv="A"]',    t("#sprayNote")],
    /* needs an at-bat to exist at that spot to jump to */
    ["lineup spot",      "[data-spot='2']",               t("#paWho"),
       'O.pas=[newPA(2,0), newPA(0,0)]; O.cur=1; render();'],
    ["mound chip",       "#pChips [data-cp='1']",         t("#pChips .pchip.on"), 'O.cp=0; render();'],
    ["tab: report",      "#tab-report",                   'document.getElementById("v-report").hidden+""'],
    ["tab: history",     "#tab-history",                  'document.getElementById("v-history").hidden+""'],
  ]);

  await sweep(b, "BULLPEN CHART", "/bullpen/index.html", [
    ["no native dialogs", null,              NO_NATIVE_DIALOGS, null, "true"],
    ["stylesheet",       null,                            styled('.bar'), null, "true"],
    ["tab: chart",       "#tab-chart",                    'document.getElementById("v-chart").hidden+""'],
    ["tab: report",      "#tab-report",                   'document.getElementById("v-report").hidden+""'],
    ["tab: history",     "#tab-hist",                     'document.getElementById("v-hist").hidden+""'],
    ["back to setup",    "#tab-setup",                    'document.getElementById("v-setup").hidden+""'],
    /* The demo pitcher was removed in v18. A fresh app opens EMPTY — no script,
       no names — so these two guard against a seeded session creeping back in,
       and every check below has to make its own row first. */
    ["no sample banner",  null,
       '(!document.getElementById("sampleBar") && !document.getElementById("clearSample"))+""',
       null, "true"],
    ["fresh start is empty", null,
       n('#scriptTbl tbody [data-f="type"]'), null, 0],
    /* count the row CONTROLS: an empty-state row is still one <tr>, so rows alone
       cannot tell "no script" from "one pitch". */
    ["add pitch",        "#addPitch",                     n('#scriptTbl tbody [data-f="type"]')],
    /* Delivery codes. SS is the slide step; SL is the Slider pitch type and must
       never leak into this list. */
    ["delivery options",  null,
       '[].map.call(document.querySelectorAll(\'#scriptTbl tbody select[data-f="ws"]\')[0].options,'+
       'function(o){return o.value}).join("/")', null, "W/S/SS"],
    /* Situations are a picked list on purpose — typed notes never group. */
    ["situation options", null,
       '[].map.call(document.querySelectorAll(\'#scriptTbl tbody select[data-f="sit"]\')[0].options,'+
       'function(o){return o.value}).join("/")', null, "/R1/R2/2K/20"],
    ["script header",     null,
       '[].map.call(document.querySelectorAll("#scriptTbl thead th"),'+
       'function(o){return o.textContent.trim()}).join("|")', null, "#|W/S/SS|Pitch|Location|Situation|"],
    /* Headers and cells are written in two different places, so a reorder can move
       one and not the other and still look plausible. Assert they agree. */
    ["column order",      null,
       '[].map.call(document.querySelectorAll(\'#scriptTbl tbody tr[data-i="0"] [data-f]\'),'+
       'function(o){return o.getAttribute("data-f")}).join("|")', null, "ws|type|spot|sit"],
    /* The four routines are the only scripts that ship now. */
    /* The only control in the app that destroys data. It must exist, and it must
       be the guarded kind - a bare click with no dialog would be the bug. */
    ["reset button",      null,
       '(!!document.getElementById("btnReset"))+""', null, "true"],
    ["templates listed",  null,
       '[].map.call(document.querySelectorAll("#tplPick option"),'+
       'function(o){return o.textContent.trim()}).slice(1).join(" / ")', null,
       "Fastball Command / Breaking Ball & Stretch / Holding Runners / Hitter\'s Counts"],
  ]);

  await b.close();
  console.log("\n" + checks + " controls checked");
  console.log(fails ? "FAILURES: " + fails : "ALL CONTROLS LIVE");
  process.exit(fails ? 1 : 0);
})();
