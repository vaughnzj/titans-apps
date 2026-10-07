/* The spring workflow Jim described: names now, jerseys later.
   Two things have to hold, and neither is obvious from reading the code:
     - a later upload keeps EVERY id, so nothing already charted is orphaned;
     - a column the later file does not contain is left alone, so the class years
       typed in between are not wiped by a jersey-only file.
   Run it the same way as the other admin suites - see README.txt. */
const { chromium } = require("playwright");
let fail=0;
function is(n,g,w){const ok=String(g)===String(w);
  console.log((ok?"  ok   ":"  FAIL ")+n.padEnd(46)+JSON.stringify(g)+(ok?"":"  (want "+JSON.stringify(w)+")"));
  if(!ok)fail++;}
(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});
 const pg=await (await b.newContext({viewport:{width:1200,height:1600}})).newPage();
 const errs=[]; pg.on("pageerror",e=>errs.push(String(e)));
 const ev=js=>pg.evaluate(js);
 await pg.goto("http://localhost:8808/admin/index.html",{waitUntil:"load"});
 await pg.waitForTimeout(700);
 await ev('localStorage.removeItem("titans-roster-draft-v1")');
 await pg.reload({waitUntil:"load"}); await pg.waitForTimeout(700);

 console.log("\nSTEP 1 — the roster as it stands today, names only");
 await pg.setInputFiles("#fileCsv","/home/claude/pgtest/fixtures/jim2627.xlsx");
 await pg.waitForTimeout(2200);
 is("78 players", await ev('document.querySelectorAll("#rows tr").length'), 78);

 console.log("\nSTEP 2 — Jim fills in some class years and a jersey by hand");
 const pick = (last, first) => `(function(){
   var rows=document.querySelectorAll("#rows tr");
   for(var i=0;i<rows.length;i++){
     var l=rows[i].querySelector("[data-f='last']"), f=rows[i].querySelector("[data-f='first']");
     if(l&&f&&l.value===${JSON.stringify(last)}&&f.value===${JSON.stringify(first)}) return i;
   } return -1; })()`;
 const setf = async (last, first, field, val) => {
   const i = await ev(pick(last,first));
   await ev(`(function(){ var n=document.querySelectorAll("#rows tr")[${i}].querySelector("[data-f='${field}']");
     n.value=${JSON.stringify(val)};
     n.dispatchEvent(new Event("input",{bubbles:true}));
     n.dispatchEvent(new Event("change",{bubbles:true})); })()`);
   await pg.waitForTimeout(260);
 };
 await setf("Andrews","Liam","cls","So");
 await setf("Bader","Chase","cls","Jr");
 await setf("Brown","Nolan","cls","Sr");
 await setf("Brown","Nolan","throws","L");
 await setf("Zadigian","Drew","cls","Jr");
 await setf("Zadigian","Drew","jersey","99");       /* a jersey he already knew */
 is("the counts rail picked them up", await ev(
    `(function(){ var c=document.querySelectorAll("#counts .count");
       var out={};
       Array.prototype.forEach.call(c,function(d){
         out[d.querySelector(".l").textContent]=d.querySelector(".v").textContent; });
       return out["Juniors"]+" Jr, "+out["Seniors"]+" Sr"; })()`), "2 Jr, 1 Sr");

 const idsBefore = await ev(
   '[].map.call(document.querySelectorAll("#rows .idc"),function(c){return c.textContent}).join("|")');

 console.log("\nSTEP 3 — spring: upload a jersey file with NO class column");
 await pg.setInputFiles("#fileCsv","/home/claude/pgtest/fixtures/spring-jerseys.xlsx");
 await pg.waitForTimeout(1400);
 is("nobody added", await ev('document.querySelectorAll("#rows tr").length'), 78);
 is("  reported as updates only", await ev(
    '/0 added, 7 updated/.test(document.getElementById("mergeMsg").textContent)'), true);
 is("  EVERY ID unchanged", await ev(
    '[].map.call(document.querySelectorAll("#rows .idc"),function(c){return c.textContent}).join("|")'),
    idsBefore);

 const read = async (last, first, field) => {
   const i = await ev(pick(last,first));
   return ev(`document.querySelectorAll("#rows tr")[${i}].querySelector("[data-f='${field}']").value`);
 };
 console.log("\n  the jerseys landed:");
 is("  Andrews jersey", await read("Andrews","Liam","jersey"), "13");
 is("  Lythgoe Beckett keeps a leading zero", await read("Lythgoe","Beckett","jersey"), "05");
 console.log("\n  and nothing else was touched:");
 is("  Andrews class survived", await read("Andrews","Liam","cls"), "So");
 is("  Bader class survived (not in the jersey file)", await read("Bader","Chase","cls"), "Jr");
 is("  Brown Nolan class survived", await read("Brown","Nolan","cls"), "Sr");
 is("  Brown Nolan throws survived", await read("Brown","Nolan","throws"), "L");
 is("  Zadigian class survived", await read("Zadigian","Drew","cls"), "Jr");
 is("  Zadigian jersey was OVERWRITTEN by the file", await read("Zadigian","Drew","jersey"), "1");
 if(errs.length){ console.log("\n  ERRORS: "+errs.join(" | ")); fail+=errs.length; }
 console.log(fail?"\n"+fail+" FAILED":"\nall good");
 await b.close(); process.exit(fail?1:0);
})();
