/* Roster Manager: real Excel uploads. Fixtures are built to look like a program's
   actual file — title rows above the header, columns in the wrong order, a stray
   blank row, a class written as a number. */
const { chromium } = require("playwright");
const F = "/home/claude/pgtest/fixtures/";
let fail = 0;
function is(n,g,w){ const ok=String(g)===String(w);
  console.log((ok?"  ok   ":"  FAIL ")+n.padEnd(44)+JSON.stringify(g)+(ok?"":"  (want "+JSON.stringify(w)+")"));
  if(!ok) fail++; }

(async () => {
  const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium" });
  const pg = await (await b.newContext({ viewport:{width:1100,height:1500} })).newPage();
  const errs=[]; pg.on("pageerror",e=>errs.push(String(e)));
  pg.on("console",m=>{ if(m.type()==="error" && !/fonts\.googleapis|ERR_|favicon|404/.test(m.text())) errs.push("console: "+m.text()); });
  await pg.goto("http://localhost:8808/admin/index.html",{waitUntil:"load"});
  await pg.waitForTimeout(600);
  const ev = js => pg.evaluate(js);
  const reset = async () => {
    await ev('localStorage.removeItem("titans-roster-draft-v1");');
    await pg.reload({waitUntil:"load"});
    await pg.waitForTimeout(700);
  };
  /* The name is two fields now. These read the LAST name column; `shows` reads the
     derived label the apps will print. */
  const names = () => ev(
    `Array.prototype.map.call(document.querySelectorAll("#rows [data-f='last']"),
       function(i){return i.value;}).join("|")`);
  const shows = () => ev(
    `Array.prototype.map.call(document.querySelectorAll("#rows .shows"),
       function(c){return c.textContent;}).join("|")`);
  const field = f => ev(
    `Array.prototype.map.call(document.querySelectorAll("#rows [data-f='${f}']"),
       function(i){return i.value;}).join("|")`);

  await reset();
  console.log("\nSETUP");
  is("the library loaded", await ev('typeof XLSX !== "undefined"'), true);
  is("paste-rows is gone", await ev('(!!document.getElementById("pasteCsvOpen"))+""'), "false");
  is("one upload button", await ev('document.getElementById("pickCsv").textContent.trim()'), "Upload a file");
  is("formats are stated", await ev('document.getElementById("fmtNote").textContent'),
     "Excel (.xlsx, .xlsm, .xls) or .csv");

  console.log("\nA REAL PROGRAM .xlsx — title rows, columns out of order");
  await pg.setInputFiles("#fileCsv", F+"program.xlsx");
  await pg.waitForTimeout(900);
  is("three players, blank row dropped", await names(), "Hasche|Combest|Dieker");
  /* "Combest, J" in one column splits on the comma - last Combest, first J. A
     bare token stays a last name. Nothing is guessed from a space. */
  is("  the comma form split", await ev(
     `Array.prototype.map.call(document.querySelectorAll("#rows [data-f='first']"),
        function(i){return i.value;}).join("|")`), "|J|");
  is("  classes", await field("cls"), "Jr|So|");
  is("  throws from its column", await field("throws"), "R|L|R");
  is("  bats, separate", await field("bats"), "L|L|R");
  is("  jersey", await field("jersey"), "17||");
  is("  it named the sheet", await ev(
     '/program\\.xlsx . Pitchers/.test(document.getElementById("mergeMsg").textContent)'), true);
  is("  reported 3 added", await ev(
     '/3 added, 0 updated/.test(document.getElementById("mergeMsg").textContent)'), true);

  console.log("\nRE-UPLOADING THE SAME FILE CHANGES NOTHING");
  const idsBefore = await ev(
    'Array.prototype.map.call(document.querySelectorAll("#rows .idc"),function(c){return c.textContent;}).join("|")');
  await pg.setInputFiles("#fileCsv", F+"program.xlsx");
  await pg.waitForTimeout(900);
  is("still three", await names(), "Hasche|Combest|Dieker");
  is("  IDs untouched", await ev(
     'Array.prototype.map.call(document.querySelectorAll("#rows .idc"),function(c){return c.textContent;}).join("|")'),
     idsBefore);
  is("  reported 3 updated", await ev(
     '/0 added, 3 updated/.test(document.getElementById("mergeMsg").textContent)'), true);

  console.log("\n.xlsm WORKS THE SAME");
  await pg.setInputFiles("#fileCsv", F+"macro.xlsm");
  await pg.waitForTimeout(900);
  is("macro workbook read", /Macro Kid/.test(await names()), true);

  console.log("\nTWO CANDIDATE SHEETS — IT ASKS");
  await reset();
  await pg.setInputFiles("#fileCsv", F+"two-sheets.xlsx");
  await pg.waitForTimeout(900);
  is("nothing imported yet", await ev('document.querySelectorAll("#rows [data-f=\'name\']").length'), 0);
  is("a picker appeared", await ev('document.getElementById("sheetBox").hidden'), false);
  is("  both sheets offered", await ev(
     'Array.prototype.map.call(document.querySelectorAll("#sheetPick [data-sheet]"),'+
     'function(b){return b.textContent;}).join("|")'), "Hitters|Arms");
  await pg.click('#sheetPick [data-sheet="Arms"]');
  await pg.waitForTimeout(700);
  is("picked sheet imported", await names(), "Pistoris|Glen");
  is("  picker closed", await ev('document.getElementById("sheetBox").hidden'), true);
  is("  and it says which sheet", await ev(
     '/Arms/.test(document.getElementById("mergeMsg").textContent)'), true);

  console.log("\nONE SHEET, NO HEADER — READ POSITIONALLY");
  await reset();
  await pg.setInputFiles("#fileCsv", F+"bare.xlsx");
  await pg.waitForTimeout(900);
  is("no picker needed", await ev('document.getElementById("sheetBox").hidden'), true);
  is("names taken from column 1", await names(), "Swigart|Fuller");
  is("  classes sniffed", await field("cls"), "Jr|So");
  is("  hands sniffed", await field("throws"), "R|L");

  console.log("\n.csv STILL WORKS, NO LIBRARY NEEDED");
  await reset();
  const fs = require("fs"), os = require("os"), path = require("path");
  const csv = path.join(os.tmpdir(), "r-" + Date.now() + ".csv");
  fs.writeFileSync(csv, 'Name,Class,Throws\n"Starns, B",Sr,R\nBerkey,Fr,L\n', "utf8");
  await pg.setInputFiles("#fileCsv", csv);
  await pg.waitForTimeout(800);
  /* The CSV reader has to keep a quoted comma together, and THEN the splitter
     turns it into last + first. Two different jobs, both have to work. */
  is("quoted name with a comma", await names(), "Starns|Berkey");
  is("  split into last and first", await shows(), "Starns|Berkey");
  is("  classes", await field("cls"), "Sr|Fr");

  console.log("\nNOT A ROSTER AT ALL");
  const junk = path.join(os.tmpdir(), "j-" + Date.now() + ".csv");
  fs.writeFileSync(junk, "\n,,\n\n", "utf8");
  const n0 = await ev('document.querySelectorAll("#rows [data-f=\'name\']").length');
  await pg.setInputFiles("#fileCsv", junk);
  await pg.waitForTimeout(800);
  is("roster untouched", await ev('document.querySelectorAll("#rows [data-f=\'name\']").length'), n0);
  is("  and it says so", await ev(
     '/No names found/.test(document.getElementById("mergeMsg").textContent)'), true);

  console.log("\nSTILL RELEASABLE AFTERWARDS");
  await ev('document.getElementById("showJs").click();');
  await pg.waitForTimeout(400);
  const js = await ev('document.getElementById("outJs").value');
  is("file generated", /window\.TITANS_ROSTER = \[/.test(js), true);
  is("  Starns is in it, split", /last:"Starns"\s*,\s*first:"B"/.test(js), true);

  if(errs.length){ console.log("\n  ERRORS: "+errs.join(" | ")); fail+=errs.length; }
  console.log(fail ? "\n"+fail+" FAILED" : "\nall good");
  await b.close();
  process.exit(fail?1:0);
})();
