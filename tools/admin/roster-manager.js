/* Roster Manager: the whole point is that IDs survive. */
const { chromium } = require("playwright");
let fail = 0;
function is(n,g,w){ const ok=String(g)===String(w);
  console.log((ok?"  ok   ":"  FAIL ")+n.padEnd(42)+JSON.stringify(g)+(ok?"":"  (want "+JSON.stringify(w)+")"));
  if(!ok) fail++; }

const EXISTING = [
  '/* Legend Titans - master roster',
  '   Released 2026-02-01.',
  '*/',
  'window.TITANS_ROSTER_STAMP = "2026-02-01";',
  'window.TITANS_ROSTER = [',
  '  {id:"aaa111", last:"Hasche",  first:"Brock", cls:"Jr", throws:"R", bats:"L", jersey:"17"},',
  '  {id:"bbb222", last:"Combest", first:"Jake",  cls:"So", throws:"L", bats:"L", jersey:""},',
  '];',
  ''
].join("\n");

(async () => {
  const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium" });
  const pg = await (await b.newContext({ viewport:{width:1100,height:1500} })).newPage();
  const errs=[]; pg.on("pageerror",e=>errs.push(String(e)));
  /* Google Fonts is blocked by the local egress proxy and 404s are the harness's
     own favicon - neither is the page's problem. */
  pg.on("console",m=>{ if(m.type()==="error" &&
      !/fonts\.googleapis|ERR_|favicon|404/.test(m.text())) errs.push("console: "+m.text()); });
  await pg.goto("http://localhost:8808/admin/index.html",{waitUntil:"load"});
  await pg.waitForTimeout(900);
  const ev = js => pg.evaluate(js);
  await ev('localStorage.removeItem("titans-roster-draft-v1");');
  await pg.reload({waitUntil:"load"});
  await pg.waitForTimeout(800);

  console.log("\nEMPTY STATE");
  is("release is blocked", await ev('document.getElementById("dlJs").disabled'), true);
  is("table says what to do", await ev(
     '/Upload the roster template in step 2/.test(document.getElementById("rows").textContent)'), true);
  is("first-run note is shown", await ev('document.getElementById("firstRun").hidden'), false);

  console.log("\nLOADING THE RELEASED FILE");
  await pg.click("#pasteJsOpen"); await pg.waitForTimeout(200);
  await pg.fill("#pasteJs", EXISTING);
  await pg.click("#pasteJsGo"); await pg.waitForTimeout(500);
  is("two players", await ev('document.querySelectorAll("#rows tr").length'), 2);
  is("comments and the stamp line ignored", await ev(
     'document.querySelectorAll("#rows [data-f=\'last\']")[0].value'), "Hasche");
  is("first name read too", await ev(
     'document.querySelectorAll("#rows [data-f=\'first\']")[0].value'), "Brock");
  is("ID read from the file", await ev('document.querySelectorAll("#rows .idc")[0].textContent'), "aaa111");
  is("class read", await ev('document.querySelectorAll("#rows [data-f=\'cls\']")[0].value'), "Jr");
  is("throws read", await ev('document.querySelectorAll("#rows [data-f=\'throws\']")[0].value'), "R");
  is("bats read, separate from throws", await ev(
     'document.querySelectorAll("#rows [data-f=\'bats\']")[0].value'), "L");
  is("jersey read", await ev('document.querySelectorAll("#rows [data-f=\'jersey\']")[0].value'), "17");
  is("counts rail", await ev(
     `Array.prototype.map.call(document.querySelectorAll("#counts .count"),
        function(c){ return c.querySelector(".v").textContent+" "+c.querySelector(".l").textContent; }
      ).join(" | ")`),
     "2 Players | 0 Freshmen | 1 Sophomores | 1 Juniors | 0 Seniors");

  console.log("\nMERGING A SPREADSHEET");
  const fsx = require("fs"), osx = require("os"), pathx = require("path");
  const mergeCsv = pathx.join(osx.tmpdir(), "m-" + Date.now() + ".csv");
  fsx.writeFileSync(mergeCsv,
    "Last Name,First Name,Class,Throws\nHasche,Brock,Sr,L\nDieker,Tom,Fr,R\n", "utf8");
  await pg.setInputFiles("#fileCsv", mergeCsv);
  await pg.waitForTimeout(800);
  is("three players now", await ev('document.querySelectorAll("#rows tr").length'), 3);
  is("Hasche kept his ID", await ev('document.querySelectorAll("#rows .idc")[0].textContent'), "aaa111");
  is("  his class was corrected", await ev(
     'document.querySelectorAll("#rows [data-f=\'cls\']")[0].value'), "Sr");
  is("  his throws corrected", await ev(
     'document.querySelectorAll("#rows [data-f=\'throws\']")[0].value'), "L");
  is("  his BATS left alone", await ev(
     'document.querySelectorAll("#rows [data-f=\'bats\']")[0].value'), "L");
  is("  and his jersey left alone", await ev(
     'document.querySelectorAll("#rows [data-f=\'jersey\']")[0].value'), "17");
  is("the new kid got a fresh ID", await ev(
     '(function(){ var ids=document.querySelectorAll("#rows .idc");'+
     ' var last=ids[ids.length-1].textContent;'+
     ' return (last && last!=="aaa111" && last!=="bbb222") ? "minted" : last; })()'), "minted");
  is("it reported both", await ev(
     '/1 added, 1 updated/.test(document.getElementById("mergeMsg").textContent)'), true);

  /* Typing a field and finishing it: the redraw that refreshes the derived name
     and the flags hangs off `change`, not `input`. */
  const typeLast = async (val) => { await ev(
    `(function(){ var i=document.querySelectorAll("#rows [data-f='last']");
       var n=i[i.length-1]; n.value=${JSON.stringify(val)};
       n.dispatchEvent(new Event("input",{bubbles:true}));
       n.dispatchEvent(new Event("change",{bubbles:true})); })()`);
    await pg.waitForTimeout(400); };
  const typeFirst = async (val) => { await ev(
    `(function(){ var i=document.querySelectorAll("#rows [data-f='first']");
       var n=i[i.length-1]; n.value=${JSON.stringify(val)};
       n.dispatchEvent(new Event("input",{bubbles:true}));
       n.dispatchEvent(new Event("change",{bubbles:true})); })()`);
    await pg.waitForTimeout(400); };

  console.log("\nSHARING A LAST NAME IS NOT A DUPLICATE");
  /* Dieker/Tom came in on the merge above. A second Dieker with a DIFFERENT first
     name is a different kid and must be allowed - that is the whole point of
     splitting the field. */
  await ev('document.getElementById("addOne").click();');
  await pg.waitForTimeout(250);
  await typeLast("Dieker");
  await typeFirst("Jack");
  is("not flagged as a duplicate", await ev(
     '/Same first AND last/.test(document.getElementById("flags").textContent)'), false);
  is("  two Diekers on the roster", await ev(
     `Array.prototype.filter.call(document.querySelectorAll("#rows [data-f='last']"),
        function(i){ return i.value==="Dieker"; }).length`), 2);
  is("  and they read differently", await ev(
     `Array.prototype.map.call(document.querySelectorAll("#rows .shows"),
        function(c){ return c.textContent; }).filter(function(t){ return /^Dieker/.test(t); })
        .sort().join("|")`), "Dieker, J|Dieker, T");

  console.log("\nTHE SAME FIRST AND LAST NAME IS");
  await typeFirst("Tom");
  is("flagged as bad", await ev('document.querySelector("#flags .flag").className'), "flag bad");
  is("  named the problem", await ev('document.querySelector("#flags .flag b").textContent'),
     "Same first AND last name");
  is("  both rows marked", await ev('document.querySelectorAll("#rows tr.dupe").length'), 2);
  is("RELEASE IS BLOCKED", await ev('document.getElementById("dlJs").disabled'), true);

  console.log("\nFIXING IT UNBLOCKS THE RELEASE");
  await typeFirst("Tim");
  is("release allowed", await ev('document.getElementById("dlJs").disabled'), false);
  /* He still has no class, so the page rightly keeps warning - a release is allowed,
     a missing class is not an error. Set it and the flag should clear. */
  is("still warns about his class", await ev(
     '/No class set/.test(document.getElementById("flags").textContent)'), true);
  await ev(`(function(){ var s=document.querySelectorAll("#rows [data-f='cls']");
    var last=s[s.length-1]; last.value="Fr";
    last.dispatchEvent(new Event("input",{bubbles:true})); })()`);
  await pg.waitForTimeout(400);
  is("flag goes green once classed", await ev(
     '/Ready/.test(document.getElementById("flags").textContent)'), true);

  console.log("\nA BLANK ROW ALSO BLOCKS");
  await ev('document.getElementById("addOne").click();');
  await pg.waitForTimeout(350);
  is("blocked", await ev('document.getElementById("dlJs").disabled'), true);
  is("  and says why", await ev(
     '/Blank row/.test(document.getElementById("flags").textContent)'), true);
  await ev(`(function(){ var d=document.querySelectorAll("#rows [data-del]");
    d[d.length-1].click(); })()`);
  await pg.waitForTimeout(350);
  is("removing it unblocks", await ev('document.getElementById("dlJs").disabled'), false);

  console.log("\nTHE GENERATED FILE");
  await ev('document.getElementById("showJs").click();');
  await pg.waitForTimeout(350);
  const js = await ev('document.getElementById("outJs").value');
  is("declares the array", /window\.TITANS_ROSTER = \[/.test(js), true);
  is("writes last and first", /last:"Hasche"/.test(js) && /first:"Brock"/.test(js), true);
  is("carries a release stamp", /window\.TITANS_ROSTER_STAMP = "\d{4}-\d{2}-\d{2}"/.test(js), true);
  is("warns against hand-editing", /DO NOT HAND-EDIT/.test(js), true);
  is("Hasche's ID is in it verbatim", /id:"aaa111"/.test(js), true);
  is("Combest's too", /id:"bbb222"/.test(js), true);
  is("one line per player", (js.match(/^\s{2}\{id:/gm)||[]).length,
     await ev('document.querySelectorAll("#rows tr").length'));
  is("no trailing comma on the last", /\}\n\];/.test(js), true);

  /* and it must round-trip: feeding it back in changes nothing */
  console.log("\nROUND TRIP");
  const before = await ev('JSON.stringify(JSON.parse(localStorage.getItem("titans-roster-draft-v1")).r)');
  await pg.click("#pasteJsOpen"); await pg.waitForTimeout(200);
  await pg.fill("#pasteJs", js);
  await pg.click("#pasteJsGo"); await pg.waitForTimeout(500);
  const after = await ev('JSON.stringify(JSON.parse(localStorage.getItem("titans-roster-draft-v1")).r)');
  is("the file reads back identically", after, before);

  console.log("\nTHE CLASS BUMP");
  /* Who is on the roster before the bump, so the assertions below are about what
     the bump DID rather than about a roster this test only assumes. */
  const nameCls = () => ev(
    `Array.prototype.map.call(document.querySelectorAll("#rows tr"), function(tr){
       var n=tr.querySelector("[data-f='last']"), c=tr.querySelector("[data-f='cls']");
       return (n?n.value:"?")+":"+(c?c.value:"");
     }).join(" | ")`);
  const idsNow = () => ev(
    `Array.prototype.map.call(document.querySelectorAll("#rows .idc"),
       function(c){ return c.textContent; }).join("|")`);
  /* The fixture has no junior, and a junior is the whole point of the ordering
     trap: remove the seniors AFTER bumping and this year's Jr->Sr gets swept out
     in the same pass. Make one. */
  await ev(`(function(){ var r=document.querySelectorAll("#rows tr");
    for(var i=0;i<r.length;i++){
      var n=r[i].querySelector("[data-f='last']"), c=r[i].querySelector("[data-f='cls']");
      if(n && /Combest/.test(n.value) && c){ c.value="Jr";
        c.dispatchEvent(new Event("input",{bubbles:true})); return; }
    } })()`);
  await pg.waitForTimeout(400);
  /* Give one player no class at all - he must survive the bump untouched. */
  await ev('document.getElementById("addOne").click();');
  await pg.waitForTimeout(250);
  await typeLast("Zane Unclassed");
  await pg.waitForTimeout(400);
  console.log("     before: " + await nameCls());
  const srBefore = await ev(
    `Array.prototype.filter.call(document.querySelectorAll("#rows tr"), function(tr){
       var c=tr.querySelector("[data-f='cls']"); return c && c.value==="Sr"; }).length`);
  const srIds = await ev(
    `Array.prototype.map.call(document.querySelectorAll("#rows tr"), function(tr){
       var c=tr.querySelector("[data-f='cls']"), d=tr.querySelector(".idc");
       return (c && c.value==="Sr" && d) ? d.textContent : null; }).filter(Boolean).join("|")`);
  is("there are seniors to graduate", srBefore > 0, true);

  /* It must ASK first - this is the only irreversible thing the tool does. */
  await ev('document.getElementById("bump").click();');
  await pg.waitForTimeout(300);
  is("it asks before doing it", await ev('document.getElementById("askBox").hidden'), false);
  is("  names who is leaving", await ev(
     '/Coming off the roster/.test(document.getElementById("askWho").textContent)'), true);
  is("  warns the IDs go", await ev(
     '/new ID|csv backup/i.test(document.getElementById("askBody").textContent)'), true);

  /* Cancel must change nothing. */
  const beforeCancel = await nameCls();
  await ev('document.getElementById("askNo").click();');
  await pg.waitForTimeout(350);
  is("cancel closes it", await ev('document.getElementById("askBox").hidden'), true);
  is("  and changed nothing", await nameCls(), beforeCancel);

  /* Escape too. */
  await ev('document.getElementById("bump").click();');
  await pg.waitForTimeout(250);
  await pg.keyboard.press("Escape");
  await pg.waitForTimeout(300);
  is("escape closes it", await ev('document.getElementById("askBox").hidden'), true);
  is("  and changed nothing", await nameCls(), beforeCancel);

  /* Now go through with it. */
  await ev('document.getElementById("bump").click();');
  await pg.waitForTimeout(250);
  await ev('document.getElementById("askYes").click();');
  await pg.waitForTimeout(450);
  console.log("     after:  " + await nameCls());
  const afterBump = await nameCls();
  /* The graduated seniors are gone BY NAME; the new seniors are last year's
     juniors, so "no seniors at all" would be the wrong assertion. */
  const gradNames = beforeCancel.split(" | ")
    .filter(x => x.endsWith(":Sr")).map(x => x.split(":")[0]);
  is("the graduated seniors are gone", gradNames.length > 0 &&
     gradNames.every(n => afterBump.indexOf(n + ":") < 0), true);
  /* The one real trap: removing seniors AFTER bumping would sweep this year's
     juniors out in the same pass. The juniors have to still be here, as seniors. */
  const jrNames = beforeCancel.split(" | ")
    .filter(x => x.endsWith(":Jr")).map(x => x.split(":")[0]);
  is("this year's juniors survived", jrNames.length > 0 &&
     jrNames.every(n => afterBump.indexOf(n + ":Sr") >= 0), true);
  is("  an unclassed player is untouched", afterBump.indexOf("Zane Unclassed:") >= 0, true);
  is("  he was NOT given a class", /Zane Unclassed:(Fr|So|Jr|Sr)/.test(afterBump), false);
  /* Every graduated ID is gone. */
  const idsAfter = await idsNow();
  is("the graduated IDs are gone", srIds.split("|").some(id => idsAfter.indexOf(id) >= 0), false);
  is("  it reports who left", await ev(
     '/graduated and removed/.test(document.getElementById("bumpMsg").textContent)'), true);
  is("  and points at the changelog", await ev(
     '/CHANGELOG/.test(document.getElementById("bumpMsg").textContent)'), true);

  /* A second bump with nobody classed says so rather than looking broken. */
  console.log("\nNOTHING TO BUMP");
  /* One at a time, re-querying each pass: the input handler calls draw(), which
     rebuilds the rows, so a cached NodeList is stale after the first change and
     the rest of the loop writes to detached nodes. */
  for(let k=0;k<12;k++){
    const left = await ev(
      `(function(){ var s=document.querySelectorAll("#rows [data-f='cls']");
         for(var i=0;i<s.length;i++) if(s[i].value){ s[i].value="";
           s[i].dispatchEvent(new Event("input",{bubbles:true})); return "more"; }
         return "done"; })()`);
    await pg.waitForTimeout(200);
    if(left === "done") break;
  }
  is("every class cleared", await ev(
     `Array.prototype.filter.call(document.querySelectorAll("#rows [data-f='cls']"),
        function(s){ return !!s.value; }).length`), 0);
  await ev('document.getElementById("bump").click();');
  await pg.waitForTimeout(300);
  is("it does not ask", await ev('document.getElementById("askBox").hidden'), true);
  is("  and says why", await ev(
     '/Nobody to move/.test(document.getElementById("bumpMsg").textContent)'), true);

  console.log("\nTHE CSV BACKUP");
  is("csv is offered", await ev('document.getElementById("dlCsv").disabled'), false);

  if(errs.length){ console.log("\n  ERRORS: "+errs.join(" | ")); fail+=errs.length; }
  console.log(fail ? "\n"+fail+" FAILED" : "\nall good");
  await b.close();
  process.exit(fail?1:0);
})();
