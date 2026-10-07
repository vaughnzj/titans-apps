/* The template has to survive the trip it was built for: fill it in Excel, upload
   it to the Roster Manager, get the right people out — including two players who
   share a last name, which is the case that used to silently merge into one. */
const { chromium } = require("playwright");
const F = "/home/claude/pgtest/fixtures/";
let fail = 0;
function is(n,g,w){ const ok=String(g)===String(w);
  console.log((ok?"  ok   ":"  FAIL ")+n.padEnd(48)+JSON.stringify(g)+(ok?"":"  (want "+JSON.stringify(w)+")"));
  if(!ok) fail++; }

(async () => {
  const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium" });
  const pg = await (await b.newContext({ viewport:{width:1200,height:1500} })).newPage();
  const errs=[]; pg.on("pageerror",e=>errs.push(String(e)));
  pg.on("console",m=>{ if(m.type()==="error" && !/fonts\.googleapis|ERR_|favicon|404/.test(m.text())) errs.push("console: "+m.text()); });
  await pg.goto("http://localhost:8808/admin/index.html",{waitUntil:"load"});
  await pg.waitForTimeout(600);
  const ev = js => pg.evaluate(js);
  const reset = async () => {
    await ev('localStorage.removeItem("titans-roster-draft-v1");');
    await pg.reload({waitUntil:"load"}); await pg.waitForTimeout(700);
  };
  const field = f => ev(
    `Array.prototype.map.call(document.querySelectorAll("#rows [data-f='${f}']"),
       function(i){return i.value;}).join("|")`);
  const shows = () => ev(
    `Array.prototype.map.call(document.querySelectorAll("#rows .shows"),
       function(c){return c.textContent;}).join("|")`);
  const flags = () => ev('document.getElementById("flags").textContent');
  /* Real typing fires input AND change; the redraw that refreshes the Shows-as
     column and the flags hangs off change, so a test that only fires input sees a
     stale screen. */
  const type = (f, idx, val) => ev(
    `(function(){ var n=document.querySelectorAll("#rows [data-f='${f}']")[${idx}];
       n.value=${JSON.stringify(val)};
       n.dispatchEvent(new Event("input",{bubbles:true}));
       n.dispatchEvent(new Event("change",{bubbles:true})); })()`);
  const last = async f => (await field(f)).split("|").length - 1;

  console.log("\n1 — THE FILLED-IN TEMPLATE");
  await reset();
  await pg.setInputFiles("#fileCsv", F+"tmpl2-filled.xlsx");
  await pg.waitForTimeout(900);
  is("four players", await field("last"), "Zeb Pistoris|Zdieker|Zdieker|Zhasche");
  is("  first names", await field("first"), "Mike|Tom|Jack|");
  is("  classes", await field("cls"), "Sr|Jr|Fr|So");
  is("  throws", await field("throws"), "R|R|L|R");
  is("  bats kept separate", await field("bats"), "R|L|L|S");
  is("  jersey, leading zero intact", await field("jersey"), "9|07||");
  /* THE POINT. Two Zdiekers must be two people. Before names were split the second
     one overwrote the first and the tool reported "1 updated". */
  is("  two same-surname players BOTH landed", await ev(
     'document.querySelectorAll("#rows tr").length'), 4);
  is("  with different IDs", await ev(
     '(function(){ var ids=[].map.call(document.querySelectorAll("#rows .idc"),'+
     'function(c){return c.textContent;});'+
     ' return new Set(ids).size===ids.length ? "all unique" : ids.join("|"); })()'), "all unique");
  is("  shows as: initial only where shared", await shows(),
     "Zeb Pistoris|Zdieker, T|Zdieker, J|Zhasche");
  is("  reported 4 added", await ev(
     '/4 added, 0 updated/.test(document.getElementById("mergeMsg").textContent)'), true);
  is("  Notes column ignored", /EXAMPLE|Notes/.test(await ev('document.getElementById("rows").textContent')), false);
  is("  title rows skipped", /LEGEND|Type into/.test(await ev('document.getElementById("rows").textContent')), false);
  is("  releasable", await ev('document.getElementById("dlJs").disabled'), false);
  /* Zhasche has no first name: an amber warning, never a block. */
  is("  warns about the missing first name", /No first name/.test(await flags()), true);

  console.log("\n2 — RE-UPLOADING THE SAME FILE CHANGES NOTHING");
  const ids = await ev(
    '[].map.call(document.querySelectorAll("#rows .idc"),function(c){return c.textContent}).join("|")');
  await pg.setInputFiles("#fileCsv", F+"tmpl2-filled.xlsx");
  await pg.waitForTimeout(900);
  is("still four", await ev('document.querySelectorAll("#rows tr").length'), 4);
  is("  IDs untouched", await ev(
     '[].map.call(document.querySelectorAll("#rows .idc"),function(c){return c.textContent}).join("|")'), ids);
  is("  reported 4 updated", await ev(
     '/0 added, 4 updated/.test(document.getElementById("mergeMsg").textContent)'), true);

  console.log("\n3 — GIVING ZHASCHE A FIRST NAME");
  await type("first", 3, "Al");
  await pg.waitForTimeout(400);
  is("the warning clears", /No first name/.test(await flags()), false);
  is("  and the shared name is reported as handled",
     /shared last name is handled/.test(await flags()), true);
  is("  Zhasche still shows bare", await shows(),
     "Zeb Pistoris|Zdieker, T|Zdieker, J|Zhasche");

  console.log("\n4 — A TRUE DUPLICATE BLOCKS THE RELEASE");
  await ev('document.getElementById("addOne").click();');
  await pg.waitForTimeout(300);
  await type("last", 4, "Zdieker");
  await pg.waitForTimeout(350);
  await type("first", 4, "Tom");
  await pg.waitForTimeout(450);
  is("blocked", await ev('document.getElementById("dlJs").disabled'), true);
  is("  names the problem", /Same first AND last name/.test(await flags()), true);

  console.log("\n5 — SHARING ONLY A LAST NAME IS FINE");
  /* Tim, not Tom. Three Zdiekers now, and Tom/Tim collide on the INITIAL - which is
     the rule's third tier: fall through to the full first name. */
  await type("first", 4, "Tim");
  await pg.waitForTimeout(450);
  is("release allowed again", await ev('document.getElementById("dlJs").disabled'), false);
  is("  Jack keeps an initial, Tom and Tim get full names", await shows(),
     "Zeb Pistoris|Zdieker, Tom|Zdieker, J|Zhasche|Zdieker, Tim");
  is("  three distinct IDs for three Zdiekers", await ev(`(function(){
       var out=[];
       Array.prototype.forEach.call(document.querySelectorAll("#rows tr"), function(tr){
         var l=tr.querySelector("[data-f='last']"), d=tr.querySelector(".idc");
         if(l && l.value==="Zdieker" && d) out.push(d.textContent);
       });
       return (out.length===3 && new Set(out).size===3) ? "yes" : out.join("|");
     })()`), "yes");

  console.log("\n6 — THE BLANK TEMPLATE, EXAMPLE ROWS LEFT IN");
  await reset();
  await pg.setInputFiles("#fileCsv", F+"tmpl2-asis.xlsx");
  await pg.waitForTimeout(900);
  is("the three examples came through", await field("last"), "Hasche|Dieker|Dieker");
  is("  which is what Check warns about", await ev(
     '/3 added/.test(document.getElementById("mergeMsg").textContent)'), true);

  if(errs.length){ console.log("\n  ERRORS: "+errs.join(" | ")); fail+=errs.length; }
  console.log(fail ? "\n"+fail+" FAILED" : "\nall good");
  await b.close(); process.exit(fail?1:0);
})();
