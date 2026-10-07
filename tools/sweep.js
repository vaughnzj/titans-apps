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
/* Two top-level `function renderHistory()` declarations lived in the game app for
   several releases. The later one silently replaced the earlier, so the batter's
   read panel stopped rendering while every control still worked and every test
   passed. Only TOP-LEVEL declarations are compared - a nested helper named the
   same thing in two closures is fine and common. */
const NO_DUPLICATE_FUNCTIONS =
  '(function(){' +
  ' var src = document.documentElement.innerHTML.replace(/\\/\\*[\\s\\S]*?\\*\\//g, "");' +
  ' var re = /\\nfunction\\s+(\\w+)\\s*\\(/g, seen = {}, dup = [], m;' +
  ' while((m = re.exec(src))){ if(seen[m[1]]) { if(dup.indexOf(m[1])<0) dup.push(m[1]); } else seen[m[1]]=1; }' +
  ' return dup.join(",");' +
  '})()';

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
    ["no duplicate fns",  null,              NO_DUPLICATE_FUNCTIONS, null, ""],
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
    /* LAST: the read panel must be checked before Setup hides the charting
       screen, and Setup must be last because it hides it. */
    ["batter read panel", null,
       '((document.getElementById("readLine")||{}).textContent||"").length > 0 ? "filled" : "EMPTY"',
       null, "filled"],
    ["setup screen",      "#btnSetup",                     'document.getElementById("v-setup").hidden+""'],
    ["setup rows",        null,                            n("#suRows tr"), null, 9],
    /* Carried reads have to be visibly marked as carried, or the charter treats
       a read from six weeks ago as something somebody saw this afternoon. */
    ["carried-read bar",  null,                            '(!!document.getElementById("carriedBar"))+""', null, "true"],
  ]);

  /* Several of these refuse once the at-bat is closed, which is correct - so each
     one that needs a live at-bat gets a clean one first, rather than the sweep
     reporting the app's own guards as dead controls. */
  const freshPA = 'O.pas=[newPA(0,0)]; O.cur=O.pas.length-1; render();';
  const onePitch = freshPA + ' logPitch(2,2); render();';
  await sweep(b, "OFFENSE CHART", "/offense/index.html", [
    ["no duplicate fns",  null,              NO_DUPLICATE_FUNCTIONS, null, ""],
    ["no native dialogs", null,              NO_NATIVE_DIALOGS, null, "true"],
    /* Subs: a lineup spot holds every man who has occupied it, so a pinch hitter
       cannot inherit the starter's at-bats and a re-entry is not a second person. */
    ["sub + order buttons", null,
       '(!!document.getElementById("btnSub") && !!document.getElementById("btnOrder"))+""',
       null, "true"],
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
    /* History mirrors the Setup tab's tags and notes. It must be a MIRROR - the
       moment an entry control appears here there are two places to set a tag and
       no answer to which one is current. */
    ["reads on the header", null,
       `(function(){ var h = document.querySelector("#hist .phead.withreads");
          return h && h.querySelector(".rtag") && /What to expect/.test(h.textContent)
            ? "yes" : "NO"; })()`,
       'showTab("history");', "yes"],
    ["header may wrap",   null,
       `getComputedStyle(document.querySelector("#hist .phead.withreads")).flexWrap`,
       null, "wrap"],
    ["reads are read-only", null,
       'document.querySelectorAll("#hist .readsbar button, #hist .readsbar input, '+
       '#hist .readsbar textarea, #hist .readsbar select, #hist [data-ptag], '+
       '#hist .rtag button").length+""',
       null, "0"],
    ["reads column",      null,
       'Array.prototype.map.call(document.querySelectorAll("#hist table.grid th"),'+
       'function(e){return e.textContent;}).indexOf("Reads")>=0 ? "yes":"NO"', null, "yes"],
    /* Scouting an opposing pitcher. Every one of these lives on the Setup tab,
       so they run together and the chart screen is restored afterwards. */
    ["pitcher tag count",null,                            n("#pRows [data-pi='0'] .ptag"),
       'showTab("setup");', 7],
    ["pitcher notes",    null,                            n("#pRows [data-pi='0'] textarea[data-pf='notes']"), null, 1],
    ["pull button",      null,                            '(!!document.querySelector("[data-ppull]"))+""',
       null, "true"],
    /* A tag the coach sets by hand must stick as HIS, not get recomputed away by
       the auto layer on the next render. */
    ["pitcher tag",      "#pRows [data-pi='0'] .ptag[data-ptag='NOGIVE']",
       c("#pRows [data-pi='0'] .ptag[data-ptag='NOGIVE']")],
    ["tag is stored",    null,  'O.pitchers[0].tags.NOGIVE+""', null, "1"],
    /* POUNDS and WILD are opposites and BOTH can be auto-detected, so the
       exclusion has to hold in ptagOn, not just in the tap handler. For one
       release the panel could show a pitcher as both. */
    ["pounds/wild exclusive", null,
       '(function(){ var p=O.pitchers[0]; p.tags={POUNDS:1};'+
       ' var r=ptagOn(O,0,"POUNDS")+"/"+ptagOn(O,0,"WILD"); p.tags={WILD:1};'+
       ' r+=" "+ptagOn(O,0,"POUNDS")+"/"+ptagOn(O,0,"WILD"); p.tags={}; return r; })()',
       null, "true/false false/true"],
    ["export carries tags", null,
       '(csvOf(O).split("\\n")[0].indexOf("PitcherTags")>=0 && '+
       'csvOf(O).split("\\n")[0].indexOf("PitcherCarried")>=0)+""', null, "true"],
    /* LAST in this list on purpose: it leaves the Order column hidden, which
       would break any check below it that clicks a lineup spot. */
    ["order collapses",  "#btnOrder",                     c("#chartCols"), 'showTab("chart");'],
    /* ---- the released roster (v36) ---- */
    /* Same file, same rule as the bullpen: roster.js ships with the app and is a
       read-out here. window.TITANS_ROSTER is a global set before the app's own
       script, so every expectation is derived from the shipped file. */
    ["roster.js shipped",  null,
       '(function(){ var r=window.TITANS_ROSTER;'+
       ' return (r && r.length) ? "yes" : "NO ROSTER FILE"; })()',
       'showTab("setup");', "yes"],
    ["roster came from it", null,
       '(function(){ if(R.length!==window.TITANS_ROSTER.length) return R.length+" vs "+window.TITANS_ROSTER.length;'+
       ' var ids={}; R.forEach(function(p){ ids[p.id]=1; });'+
       ' var miss=window.TITANS_ROSTER.filter(function(p){ return !ids[p.id]; });'+
       ' return miss.length ? "missing "+miss.map(function(p){return p.name}).join(",") : "yes"; })()',
       null, "yes"],
    ["banner matches the file", null,
       '(function(){ var b=document.getElementById("rosSrc");'+
       ' if(!b) return "no banner";'+
       ' var t=b.textContent.replace(/\\s+/g," ");'+
       ' if(window.TITANS_ROSTER_SAMPLE){'+
       '   if(b.className.indexOf("bad")<0) return "sample file but class "+b.className;'+
       '   return /SAMPLE roster/.test(t) ? "yes" : t.slice(0,50); }'+
       ' if(b.className.indexOf("ok")<0) return "class "+b.className;'+
       ' if(!/Released roster/.test(t)) return t.slice(0,40);'+
       ' return (t.indexOf(window.TITANS_ROSTER_STAMP)>=0) ? "yes" : "no stamp"; })()',
       null, "yes"],
    ["sample is called out",  null,
       '(function(){ if(!window.TITANS_ROSTER_SAMPLE) return "not a sample file";'+
       ' var t=document.getElementById("rosSrc").textContent;'+
       ' return /[Dd]o not chart/.test(t) ? "yes" : "no warning"; })()',
       null, "yes"],
    /* READ-ONLY, not "mostly". One stray input is a way for an iPad to drift off
       the released list, which is the whole thing this prevents. */
    ["roster is read-only", null,
       'document.querySelectorAll("#rosRows input, #rosRows select, #rosRows button, '+
       '#rosRows textarea, #rosRows [contenteditable]").length+""', null, "0"],
    ["add-player is gone", null,
       '(!!document.getElementById("rosAdd"))+""', null, "false"],
    ["every released player listed", null,
       '(function(){ var n=document.querySelectorAll("#rosRows .rosrow").length;'+
       ' return n===window.TITANS_ROSTER.length ? "all" : n+" of "+window.TITANS_ROSTER.length; })()',
       null, "all"],
    /* bats and throws are separate fields and both have to show, because this app
       needs the bat and the bullpen needs the arm off the same record. */
    /* Same collapse in this app: the lineup is what gets set on this screen, and
       the roster was pushing it off the bottom. */
    ["roster list collapse", null,
       '(function(){ var b=document.getElementById("rosBody");'+
       ' if(!b) return "no collapsible body";'+
       ' var s=document.getElementById("rosSrc");'+
       ' var green=/\\bok\\b/.test(s?s.className:"");'+
       ' return (b.hidden === green) ? "matches the banner" : (green?"green but SHOWING":"warning but HIDDEN"); })()',
       'showTab("setup");', "matches the banner"],
    ["banner is outside the collapse", null,
       '(function(){ var b=document.getElementById("rosBody"), s=document.getElementById("rosSrc");'+
       ' if(!b||!s) return "missing";'+
       ' return b.contains(s) ? "INSIDE - it would be hidden" : "outside"; })()',
       null, "outside"],
    ["the toggle works",  "#rosToggle",
       '(document.getElementById("rosBody")||{}).hidden+""', 'showTab("setup");'],
    /* The same display rule, checked against what this app renders. The offense
       roster row prints "Last, First" in bold and the derived name beside it. */
    ["derived names match the rule", null,
       '(function(){'+
       ' var R2=window.TITANS_ROSTER;'+
       ' function k(s){ return String(s==null?"":s).trim().toLowerCase(); }'+
       ' function want(p){'+
       '   var last=String(p.last||"").trim(), first=String(p.first||"").trim();'+
       '   if(!last) return first;'+
       '   if(!first) return last;'+
       '   var sl=0, si=0, li=first.charAt(0).toLowerCase();'+
       '   R2.forEach(function(q){'+
       '     if(q.id===p.id) return;'+
       '     if(k(q.last)!==k(last)) return;'+
       '     sl++;'+
       '     if(String(q.first||"").trim().charAt(0).toLowerCase()===li) si++; });'+
       '   if(!sl) return last;'+
       '   if(!si) return last+", "+first.charAt(0).toUpperCase();'+
       '   return last+", "+first; }'+
       ' var bad=[];'+
       ' R2.forEach(function(p){'+
       '   var hit=null;'+
       '   Array.prototype.forEach.call(document.querySelectorAll("#rosRows .rosrow"),function(d){'+
       '     var b=d.querySelector("b"), sa=d.querySelector(".sa");'+
       '     if(!b||!sa) return;'+
       '     if(b.textContent.trim()===p.last+(p.first?", "+p.first:"")) hit=sa.textContent.trim(); });'+
       '   if(hit==null){ bad.push(p.last+" not listed"); return; }'+
       '   if(hit!==want(p)) bad.push(p.last+" shows "+hit+" want "+want(p)); });'+
       ' return bad.length ? bad.join(" ; ") : "yes"; })()',
       null, "yes"],
    ["an initial is actually in use", null,
       '(function(){'+
       ' var counts={};'+
       ' window.TITANS_ROSTER.forEach(function(p){'+
       '   var k=String(p.last||"").toLowerCase(); counts[k]=(counts[k]||0)+1; });'+
       ' if(!Object.keys(counts).some(function(k){ return counts[k]>1; }))'+
       '   return "VACUOUS: no shared last name in this release";'+
       ' var any=false;'+
       ' Array.prototype.forEach.call(document.querySelectorAll("#rosRows .rosrow .sa"),'+
       '   function(sa){ if(/,/.test(sa.textContent)) any=true; });'+
       ' return any ? "yes" : "no name carries an initial"; })()',
       null, "yes"],
    ["export carries hitter last and first", null,
       '(function(){ var h=csvOf(O).split(/\\r?\\n/)[0];'+
       ' return (h.indexOf("HitterLast")>=0 && h.indexOf("HitterFirst")>=0 &&'+
       '         h.indexOf("HitterID")>=0) ? "yes" : h.slice(0,110); })()',
       null, "yes"],
    ["both hands shown",  null,
       '(function(){ var p=window.TITANS_ROSTER.filter(function(x){ return x.bats!==x.throws; })[0];'+
       ' if(!p) return "no mixed-handed player in the release";'+
       ' var rows=document.querySelectorAll("#rosRows .rosrow");'+
       ' for(var i=0;i<rows.length;i++){'+
       '   if(rows[i].textContent.indexOf(p.name)<0) continue;'+
       '   var t=rows[i].textContent.replace(/\\s+/g," ");'+
       '   var want="bats "+p.bats+" · throws "+p.throws;'+
       '   return t.indexOf(want)>=0 ? "yes" : t+" (want "+want+")"; }'+
       ' return "row for "+p.name+" not found"; })()',
       null, "yes"],
    /* The lineup picker is the consumer: it has to offer the released names. */
    ["lineup picks off the release", null,
       '(function(){ var sel=document.querySelectorAll(\'[data-lf]\')[0];'+
       ' if(!sel) return "no lineup picker";'+
       ' var ids={}; for(var i=0;i<sel.options.length;i++) if(sel.options[i].value) ids[sel.options[i].value]=1;'+
       ' var off=window.TITANS_ROSTER.filter(function(p){ return ids[p.id]; });'+
       ' return off.length ? "yes" : "none of the released players are offered"; })()',
       null, "yes"],
  ]);

  await sweep(b, "BULLPEN CHART", "/bullpen/index.html", [
    ["no duplicate fns",  null,              NO_DUPLICATE_FUNCTIONS, null, ""],
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
    /* ---- live AB mode (v22). LAST in this list: it switches the pitcher out of
       script mode, which changes the whole chart screen. ---- */
    ["three modes",       null,
       '[].map.call(document.querySelectorAll(\'[data-f="mode"]\')[0].options,'+
       'function(o){return o.value}).join("/")', null, "script/free/live"],
    ["live AB panel",     null,
       'document.getElementById("abbar").hidden+""',
       'document.querySelectorAll(\'[data-f="mode"]\')[0].value="live";'+
       'document.querySelectorAll(\'[data-f="mode"]\')[0]'+
       '.dispatchEvent(new Event("input",{bubbles:true}));'+
       'document.getElementById("tab-chart").click();', "false"],
    ["result pad",        null,  n("#abRes button"), null, 16],
    /* The called spot is OPTIONAL in a live AB, and a skipped call must stay
       distinguishable from a called spot that was missed. */
    ["no-spot offered",   null,
       '(!!document.querySelector(\'#f-spot button[data-s="x"]\'))+""', null, "true"],
    /* An uncalled spot once threw inside drawCall and took the entire render down
       with it - the pitch landed in the model and the screen never moved. */
    ["no-spot still renders", null,
       '(function(){ document.querySelector(\'#f-spot button[data-s="x"]\').click();'+
       ' document.querySelector(\'#zone button[data-r="0"][data-c="0"]\').click();'+
       ' var k=document.querySelectorAll("#liveKpis .kpi");'+
       ' return (k.length && k[0].querySelector(".v").textContent==="1") ? "logged":"DEAD"; })()',
       null, "logged"],
    /* ...and it must not be graded as a miss. One ungraded pitch, nothing graded,
       so the spot percentage has no denominator rather than reading 0%. */
    /* The Chart tab used to always land on whoever was selected last, which in
       practice meant pitcher 1 forever: set a second arm up, tap Chart, and you got
       the first one's finished card with nothing saying so. The strip is the only
       way across and it reads like a header unless it is labelled. */
    ["strip says it switches", null,
       '/tap a name to switch/.test((document.querySelector(".striplbl")||{}).textContent||"")+""',
       null, "true"],
    ["ungraded is not a miss", null,
       '(function(){ var t=document.getElementById("liveRead").textContent||"";'+
       ' return /no spot called/.test(t) ? "ungraded":t.slice(0,40); })()',
       null, "ungraded"],
    /* ---- the released roster (v26) ---- */
    /* The roster SHIPS with the app as roster.js and is read-only on the iPad.
       window.TITANS_ROSTER is a global set before the app's IIFE, so every
       expectation below is derived from the shipped file itself rather than
       hardcoded - the point is that the app reads what was released, whatever
       was released. */
    ["roster.js shipped",  null,
       '(function(){ var r=window.TITANS_ROSTER;'+
       ' return (r && r.length) ? "yes" : "NO ROSTER FILE"; })()',
       'document.getElementById("tab-setup").click();', "yes"],
    /* The banner has to match the file. The repo ships the SAMPLE placeholder, so
       red-and-shouting is the correct state here; roster-states.js covers a real
       release, a missing file and a leftover local list. */
    ["banner matches the file", null,
       '(function(){ var b=document.getElementById("rosSrc");'+
       ' if(!b) return "no banner";'+
       ' var t=b.textContent.replace(/\\s+/g," ");'+
       ' if(window.TITANS_ROSTER_SAMPLE){'+
       '   if(b.className.indexOf("bad")<0) return "sample file but class "+b.className;'+
       '   return /SAMPLE roster/.test(t) ? "yes" : t.slice(0,50); }'+
       ' if(b.className.indexOf("ok")<0) return "class "+b.className;'+
       ' if(!/Released roster/.test(t)) return t.slice(0,40);'+
       ' return (t.indexOf(window.TITANS_ROSTER_STAMP)>=0) ? "yes" : "no stamp: "+t.slice(0,60); })()',
       null, "yes"],
    ["sample is called out",  null,
       '(function(){ if(!window.TITANS_ROSTER_SAMPLE) return "not a sample file";'+
       ' var t=document.getElementById("rosSrc").textContent;'+
       ' return /[Dd]o not chart/.test(t) ? "yes" : "no warning"; })()',
       null, "yes"],
    /* The panel is collapsed by default. Sixty-six players is ~2,200px of list
       sitting directly above the mound list a coach starts a session with, and you
       pick arms off a dropdown - so the list is reference, not the screen. */
    ["roster list collapse", null,
       '(function(){ var b=document.getElementById("rosBody");'+
       ' if(!b) return "no collapsible body";'+
       /* The shipped file is the SAMPLE roster, which auto-expands on purpose, so
          "collapsed by default" cannot be asserted against it. Assert the rule
          instead: hidden when the banner is green, showing when it is not. */
       ' var s=document.getElementById("rosSrc");'+
       ' var green=/\\bok\\b/.test(s?s.className:"");'+
       ' return (b.hidden === green) ? "matches the banner" : (green?"green but SHOWING":"warning but HIDDEN"); })()',
       'document.getElementById("tab-setup").click();', "matches the banner"],
    /* The banner is NOT in the collapse. It is what catches a sample or stale
       roster before a session, and a signal behind a tap is a signal nobody reads. */
    ["banner is outside the collapse", null,
       '(function(){ var b=document.getElementById("rosBody"), s=document.getElementById("rosSrc");'+
       ' if(!b||!s) return "missing";'+
       ' return b.contains(s) ? "INSIDE - it would be hidden" : "outside"; })()',
       null, "outside"],
    ["the toggle labels itself", null,
       '(function(){ var t=document.getElementById("rosToggle");'+
       ' if(!t) return "no toggle";'+
       ' var open=t.getAttribute("aria-expanded")==="true";'+
       ' if(open) return /Hide/.test(t.textContent) ? "labelled" : t.textContent;'+
       ' return t.textContent.indexOf(String(window.TITANS_ROSTER.length))>=0'+
       '   ? "labelled" : t.textContent; })()',
       null, "labelled"],
    ["the toggle works",  "#rosToggle",
       '(document.getElementById("rosBody")||{}).hidden+""'],
    ["roster header",     null,
       '[].map.call(document.querySelectorAll("#teamTbl thead th"),'+
       'function(o){return o.textContent.trim()}).join("|")', null,
       "#|Name|Shows as|Class|Throws|Bats"],
    /* READ-ONLY, not "mostly read-only". A single stray input is a way for one iPad
       to drift off the released list, which is the whole thing this prevents. */
    ["roster is read-only", null,
       'document.querySelectorAll("#teamTbl input, #teamTbl select, #teamTbl button, '+
       '#teamTbl textarea, #teamTbl [contenteditable]").length+""', null, "0"],
    ["editing controls are gone", null,
       '["addPlayer","csvPick","csvFile","pasteOpen","pasteGo","bumpCls"]'+
       '.filter(function(k){ return !!document.getElementById(k); }).join(",") || "none"',
       null, "none"],
    ["every released player listed", null,
       '(function(){ var rows=document.querySelectorAll("#teamTbl tbody tr").length;'+
       ' return rows===window.TITANS_ROSTER.length ? "all" : rows+" of "+window.TITANS_ROSTER.length; })()',
       null, "all"],
    /* A read-out can afford the full word, and "Senior" is read faster across a
       gym than "Sr". It also proves the row is rendered text, not a select. */
    /* THE DISPLAY RULE. Last name alone; an initial only where two players share a
       last name; the full first name when the initial collides too.

       These compare the RENDERED Shows-as column against the rule computed here
       from last/first. The first version of this check read window.TITANS_ROSTER's
       own `name` field, which is written by the Roster Manager - so it passed with
       the app's rule flattened to "always the last name". It was testing the file,
       not the app. */
    ["derived names match the rule", null,
       '(function(){'+
       ' var R2=window.TITANS_ROSTER;'+
       ' function k(s){ return String(s==null?"":s).trim().toLowerCase(); }'+
       ' function want(p){'+
       '   var last=String(p.last||"").trim(), first=String(p.first||"").trim();'+
       '   if(!last) return first;'+
       '   if(!first) return last;'+
       '   var sl=0, si=0, li=first.charAt(0).toLowerCase();'+
       '   R2.forEach(function(q){'+
       '     if(q.id===p.id) return;'+
       '     if(k(q.last)!==k(last)) return;'+
       '     sl++;'+
       '     if(String(q.first||"").trim().charAt(0).toLowerCase()===li) si++; });'+
       '   if(!sl) return last;'+
       '   if(!si) return last+", "+first.charAt(0).toUpperCase();'+
       '   return last+", "+first; }'+
       ' var rows=document.querySelectorAll("#teamTbl tbody tr");'+
       ' if(!rows.length) return "no roster rendered";'+
       ' var shown={};'+
       ' Array.prototype.forEach.call(rows,function(tr){'+
       '   var td=tr.children;'+
       '   if(td.length<3) return;'+
       '   shown[td[1].textContent.trim()]=td[2].textContent.trim(); });'+
       ' var bad=[];'+
       ' R2.forEach(function(p){'+
       '   var key=p.last+(p.first?", "+p.first:"");'+
       '   var got=shown[key];'+
       '   if(got==null){ bad.push(key+" not listed"); return; }'+
       '   if(got!==want(p)) bad.push(key+" shows "+got+" want "+want(p)); });'+
       ' return bad.length ? bad.join(" ; ") : "yes"; })()',
       null, "yes"],
    /* And the rule has to be doing something: the shipped file contains a shared
       last name on purpose, so at least one name must carry an initial. If this
       goes green on a release with no collision it is vacuous - it says so. */
    ["an initial is actually in use", null,
       '(function(){'+
       ' var counts={};'+
       ' window.TITANS_ROSTER.forEach(function(p){'+
       '   var k=String(p.last||"").toLowerCase(); counts[k]=(counts[k]||0)+1; });'+
       ' var shared=Object.keys(counts).filter(function(k){ return counts[k]>1; });'+
       ' if(!shared.length) return "VACUOUS: no shared last name in this release";'+
       ' var cells=document.querySelectorAll("#teamTbl tbody tr");'+
       ' var any=false;'+
       ' Array.prototype.forEach.call(cells,function(tr){'+
       '   var td=tr.children;'+
       '   if(td.length>=3 && /,/.test(td[2].textContent)) any=true; });'+
       ' return any ? "yes" : "no name carries an initial"; })()',
       null, "yes"],
    ["picker shows the derived name", null,
       '(function(){ var sel=document.querySelectorAll(\'#rosterTbl [data-f="rid"]\')[0];'+
       ' if(!sel) return "no picker";'+
       ' var want=window.TITANS_ROSTER.filter(function(p){ return p.name!==p.last; })[0];'+
       ' if(!want) return "no collision in the release";'+
       ' for(var i=0;i<sel.options.length;i++)'+
       '   if(sel.options[i].value===want.id)'+
       '     return sel.options[i].text.indexOf(want.name)===0 ? "yes" : sel.options[i].text;'+
       ' return "not offered"; })()',
       null, "yes"],
    ["export carries last and first", null,
       '(function(){ document.getElementById("tab-report").click();'+
       ' document.getElementById("expText").value="";'+
       ' document.getElementById("expCsv").click();'+
       ' var h=(document.getElementById("expText").value||"").split(/\\r?\\n/)[0];'+
       ' return (h.indexOf("PitcherLast")>=0 && h.indexOf("PitcherFirst")>=0) ? "yes" : h.slice(0,90); })()',
       null, "yes"],
    ["class spelled out",  null,
       '(function(){ var t=document.getElementById("teamTbl").textContent;'+
       ' var want={Fr:"Freshman",So:"Sophomore",Jr:"Junior",Sr:"Senior"}, miss=[];'+
       ' window.TITANS_ROSTER.forEach(function(p){'+
       '   if(p.cls && t.indexOf(want[p.cls])<0) miss.push(p.cls); });'+
       ' return miss.length ? "missing "+miss.join("/") : "yes"; })()',
       null, "yes"],
    /* The mound picker offers the released roster and nothing else. */
    ["mound picks off roster", null,
       '[].map.call(document.querySelectorAll("#rosterTbl thead th"),'+
       'function(o){return o.textContent.trim()}).join("|")',
       null, "#|Pitcher|PitchSafe 0–100|Stretch only|Runs|"],
    ["no jersey field",   null,
       'document.querySelectorAll(\'#rosterTbl [data-f="num"]\').length+""', null, "0"],
    ["picker offers the release", null,
       '(function(){ var sel=document.querySelectorAll(\'#rosterTbl [data-f="rid"]\')[0];'+
       ' if(!sel) return "no picker";'+
       ' var ids={}; for(var i=0;i<sel.options.length;i++) if(sel.options[i].value) ids[sel.options[i].value]=1;'+
       ' var miss=window.TITANS_ROSTER.filter(function(p){ return !ids[p.id]; });'+
       ' return miss.length ? "not offered: "+miss.map(function(p){return p.name}).join(",") : "all"; })()',
       null, "all"],
    /* Picking a name has to bring his class and arm with it, off the released file. */
    ["picking carries class", null,
       '(function(){ var sel=document.querySelectorAll(\'#rosterTbl [data-f="rid"]\')[0];'+
       ' if(!sel) return "no picker";'+
       ' var p=window.TITANS_ROSTER[0];'+
       ' sel.value=p.id; sel.dispatchEvent(new Event("input",{bubbles:true}));'+
       ' var w=document.querySelector("#rosterTbl .whoami");'+
       ' if(!w) return "no read-out";'+
       ' var got=w.textContent.replace(/\\s+/g," ").trim();'+
       ' var want=p.cls+" · "+p.throws+"HP";'+
       ' return got===want ? "yes" : got+" (want "+want+")"; })()',
       null, "yes"],
    /* The same kid cannot be charted twice in one session. */
    ["no double-booking", null,
       '(function(){ var sels=document.querySelectorAll(\'#rosterTbl [data-f="rid"]\');'+
       ' if(sels.length<2) return "need two slots";'+
       ' var taken=window.TITANS_ROSTER[0].id;'+
       ' for(var i=0;i<sels[1].options.length;i++)'+
       '   if(sels[1].options[i].value===taken) return "still offered";'+
       ' return "gone"; })()',
       null, "gone"],
    /* SessionID and PitcherID are the join keys a roll-up needs. A name is not a key. */
    ["ids in the export", null,
       '(function(){ document.getElementById("tab-report").click();'+
       ' document.getElementById("expText").value="";'+
       ' document.getElementById("expCsv").click();'+
       ' var h=(document.getElementById("expText").value||"").split(/\\r?\\n/)[0];'+
       ' return (h.indexOf("SessionID")>=0 && h.indexOf("PitcherID")>=0) ? "yes" : h.slice(0,80); })()',
       null, "yes"],
    ["class in the export", null,
       '(function(){ document.getElementById("tab-report").click();'+
       ' document.getElementById("expText").value="";'+
       ' document.getElementById("expCsv").click();'+
       ' var h=(document.getElementById("expText").value||"").split(/\\r?\\n/)[0];'+
       ' return (h.indexOf("Class")>=0 && h.indexOf("Jersey")<0) ? "yes" : h.slice(0,80); })()',
       'document.getElementById("tab-chart").click();'+
       'document.querySelector(\'#zone button[data-r="2"][data-c="2"]\').click();',
       "yes"],
    /* LAST: finishing a scripted card has to lead somewhere. Two arms off the
       roster, run the first out of card, leave the tab and come back. */
    ["follows the mound",  null,
       '(function(){'+
       ' document.getElementById("tab-setup").click();'+
       ' function pickInto(slot, id){'+
       '   var sel=document.querySelectorAll(\'#rosterTbl [data-f="rid"]\')[slot];'+
       '   if(!sel) return false;'+
       '   for(var i=0;i<sel.options.length;i++) if(sel.options[i].value===id){'+
       '     sel.value=id;'+
       '     sel.dispatchEvent(new Event("input",{bubbles:true})); return true; }'+
       '   return false; }'+
       ' var R2=window.TITANS_ROSTER;'+
       ' if(R2.length<3) return "need three on the roster";'+
       ' if(!pickInto(1,R2[1].id)) return "slot 1 failed";'+
       ' if(!pickInto(2,R2[2].id)) return "slot 2 failed";'+
       ' var ms=document.querySelectorAll(\'[data-f="mode"]\');'+
       ' for(var m=0;m<3;m++){ if(!ms[m]) continue;'+
       '   ms[m].value="script"; ms[m].dispatchEvent(new Event("input",{bubbles:true})); }'+
       ' document.getElementById("tab-chart").click();'+
       ' function pick(i){ document.querySelectorAll("#strip .pcard")[i].click(); }'+
       ' function on(){ return document.querySelector("#strip .pcard[aria-pressed=true] .nm").textContent; }'+
       ' pick(0);'+
       ' var n=document.querySelectorAll(\'#scriptTbl tbody [data-f="type"]\').length || 1;'+
       ' for(var i=0;i<=n;i++) document.querySelector(\'#zone button[data-r="2"][data-c="2"]\').click();'+
       ' var nb=document.getElementById("nextArm");'+
       ' if(!nb) return "no hand-off on a finished card, on "+on();'+
       ' nb.click();'+
       ' if(on()!==R2[1].name) return "hand-off landed on "+on();'+
       ' for(var j=0;j<=n;j++) document.querySelector(\'#zone button[data-r="2"][data-c="2"]\').click();'+
       ' document.getElementById("tab-report").click();'+
       ' document.getElementById("tab-chart").click();'+
       ' return (on()===R2[2].name) ? "yes" : "landed on "+on()+", wanted "+R2[2].name; })()',
       null, "yes"],
  ]);

  await b.close();
  console.log("\n" + checks + " controls checked");
  console.log(fails ? "FAILURES: " + fails : "ALL CONTROLS LIVE");
  process.exit(fails ? 1 : 0);
})();
