LEGEND TITANS — COACHING APPS
Files for a free GitHub Pages site.

WHAT'S HERE
  CHANGELOG.md          What changed in each version of each app — update it when you bump a version
  index.html            Landing page listing all three apps
  bullpen/index.html    The Bullpen Chart app
  bullpen/guide.html    The Bullpen Chart coach's guide
  bullpen/templates.js  The weekly bullpen scripts (you edit this one)
  bullpen/roster.js     The released master roster — THE SAME FILE, THREE TIMES
  offense/roster.js     A service worker can only cache files inside its own
  game/roster.js        folder, so each app needs its own copy. All three apps
                        read the roster: the bullpen and the game app for our
                        pitchers, the offense app for our hitters.
  tools/sweep.js        Clicks every control and checks it still does something
  tools/roster-states.js  Checks the four roster states the apps can be in
  tools/version-audit.py  Checks every place a version is written against every
                        other place — index.html, sw.js, both spots in the guide,
                        and CHANGELOG.md, for all three apps
  tools/swcache/        Proves a new roster reaches an app with no cache bump
  tools/admin/          Test suites for the Roster Manager, plus the generator
                        that builds Titans-Roster-Template.xlsx. See its README.
  game/index.html       The Pitch Chart app
  game/guide.html       The Pitch Chart coach's guide
  offense/index.html    The Offense Chart app (how they pitch us)
  offense/guide.html    The Offense Chart coach's guide
  <app>/manifest.webmanifest, sw.js, icon-*.png   What makes each one work offline

ONE-TIME SETUP (about 15 minutes)
  1. Make a free account at github.com
  2. New repository. Name it: titans-apps
     Set it to PUBLIC. Tick "Add a README file". Create.
  3. Add file > Upload files. Drag in EVERYTHING from this folder,
     keeping the bullpen folder as a folder. Commit.
  4. Settings > Pages. Under "Build and deployment", Source = Deploy from a branch,
     Branch = main, folder = / (root). Save.
  5. Wait a minute or two, then open:
     https://YOURNAME.github.io/titans-apps/
     That link is what you send the coaches.

PUTTING IT ON AN iPAD
  1. Open the link in SAFARI, on wifi
  2. Tap the Bullpen Chart
  3. Wait for the green "Ready to use offline" bar
  4. Share > Add to Home Screen
  From then on it opens with no signal, with the Titans icon.

UPDATING AN APP LATER
  Add the change to CHANGELOG.md first, while you still remember what it was.
  Then replace <app>/index.html in the repo AND change the version line at the
  top of that app's sw.js:
      bullpen/sw.js   titans-bullpen-v8 -> v9
      game/sw.js      titans-game-v3    -> v4
      offense/sw.js   titans-offense-v1 -> v2
  Without that change the iPads keep serving the old cached copy. The three
  apps cache separately, so updating one never disturbs the others.
  Then run: python3 tools/version-audit.py


BULLPEN SCRIPT TEMPLATES
  Every mound has to run the same script or the leaderboard stops meaning
  anything, so load the same template on all four. Building a script by hand
  is still allowed — it just will not compare across mounds.

  ADDING A WEEKLY TEMPLATE (do this at home)
    1. Build the script on an iPad
    2. Tap "Save as template" — it hands you a finished line
    3. Paste that line into bullpen/templates.js, above the closing ]
    4. Rename it in that line, e.g. {name:"Winter Week 3", code:"TBP1..."}
    5. Upload templates.js AND bump the version in bullpen/sw.js
       (titans-bullpen-v8 -> v9), or the iPads keep the old list

  THE LOCK
    Loading a template locks the script. Unlock to edit is one tap,
    but the moment the script changes the bar turns amber and says "Modified",
    and every row of that iPad's export is stamped ScriptModified = Y.
    When you merge the four CSVs, sort on ScriptID — one value means all four
    mounds ran the same routine.


THE COACH'S GUIDES
  Each app has a GUIDE link in its own header, which opens <app>/guide.html.
  The guides are cached offline with the app, so a coach can read them in the
  gym with no signal. They are also linked from the landing page.

  Each guide carries an "App v__" line under the title AND a second version in
  its "Which version am I on?" callout. When you change an app, change BOTH, so a
  coach can tell the guide matches the app in front of him.
  version-audit.py checks both of them. A guide is a plain web page — edit it in GitHub, bump the
  version in <app>/sw.js, and the iPads pick it up the same way they pick up
  the app.

WHICH VERSION IS AN iPAD ON?
  Each app prints its build in the header, right after the app name. Read it
  off the screen; no need to hunt for a feature that changed.

  If it shows something like "v9 =/= v8" in amber, that iPad has downloaded a
  new version but is still showing the old one. Close the app fully from the
  app switcher and open it again.

  The build also goes into the exports, so a file tells you which app produced it.

PICKING UP A NEW VERSION
  1. Open the app on wifi. The new copy downloads quietly in the background;
     the screen still shows the old one.
  2. Close it completely from the app switcher.
  3. Open it again. New version.
  Don't delete and re-add the home screen icon to force it — on iOS that can
  take the app's saved session with it. Export first if you ever do.

WHEN I CHANGE AN APP, FIVE PLACES MOVE TOGETHER
  <app>/index.html     the BUILD line near the top of its script
  <app>/sw.js          the CACHE version, or the iPads keep the old copy
  <app>/guide.html     the "App v__" line under the title
  <app>/guide.html     and the version named in the "Which version am I on?" box
  CHANGELOG.md         the standings table AND an entry for the new version

  THE FIRST TWO MUST MATCH EXACTLY. The app compares its BUILD against its own
  cache name, so bumping one without the other puts a permanent amber
  "v27 =/= v28 -- tap to fix" on every iPad, and tapping it cannot clear it.

  Update CHANGELOG.md first, while you remember what changed. Then:
      python3 tools/version-audit.py
  which checks all five, for all three apps, and names what disagrees.

BEFORE EVERY PUSH, RUN THE TEST SCRIPTS
  python3 tools/version-audit.py   every version location agrees (needs no server)
  python3 -m http.server 8807 &
  node tools/sweep.js              every control still does something
  node tools/roster-states.js      the four roster states, in all three apps
  sweep.js stays green through a bug that silently breaks roster identity, which
  is why the second script exists. Run all three.

  Run version-audit.py FIRST. A version lives in five files per app and two of
  them have to match exactly, or the app shows a permanent amber "v27 =/= v28 --
  tap to fix" that tapping cannot clear. It catches that in a second.

  AFTER TOUCHING ANY sw.js, also run tools/swcache/ -- it proves a new roster
  reaches the app with no cache bump, that app code is still cache-first, and
  that the app still opens offline and against a stalling server. Run it ONCE PER
  APP; it needs its own harness. See tools/swcache/README.txt.

  The Roster Manager has four more suites in tools/admin/ -- they need a small
  harness first because that page loads SheetJS from a CDN. tools/admin/README.txt
  has the six steps.

  Every check in all of these has been deliberately broken once and watched go
  red. A check that cannot fail is worse than no check: twice in this project a
  green suite was hiding the exact bug it was written for.

THE ROSTER
  The master roster is RELEASED, not typed. It ships as roster.js next to each
  app and nothing in any app can change it — the panel on Setup is a read-out.
  That is an identity decision: every export joins on an ID, and while each iPad
  kept its own roster the same kid typed twice got two IDs and his season split
  in half the moment the files were stacked up.

  THE ROSTER MANAGER IS NOT PART OF THIS REPO.
  It lives one folder up, beside titans-apps, as a plain file:
      Software\Titans Roster Manager.html    <- double-click it
  Deliberately not uploaded to GitHub. On the Pages site any coach who found the
  URL could generate a roster.js, which contradicts the whole point of the roster
  being released rather than edited — and hands them a dead end, since they can't
  deploy it. It would also put the tool's saved working copy in the same browser
  storage bucket as the three apps, which share a few MB between them.

  There is only ONE copy of it, on purpose. It had a second life as a private
  claude.ai page; that was deleted on Oct 7, 2026 because two copies drift and one
  of them had already fallen two versions behind without anybody noticing.

  In June, after the season: open the Roster Manager, load the released roster.js,
  and hit "Move everyone up a class". Everyone moves up and the GRADUATING SENIORS
  COME OFF THE ROSTER. That is deliberate — their charted work is already in the
  exports you have collected, name and class included, so nothing is lost and the
  mound picker doesn't fill up with alumni. It is the one thing the tool cannot
  undo: take the .csv backup first if you want a record of who left.

  LAST NAME AND FIRST NAME ARE SEPARATE COLUMNS in the template. That is not
  cosmetic: one combined field is what let a senior Dieker and a freshman Dieker
  import as ONE player, with the tool reporting "1 updated" and nothing blocking
  the release. Identity is the pair now.

  On an iPad a player still reads as just his last name. He only picks up an
  initial -- "Dieker, T" -- when somebody else on the roster shares that last
  name, and his full first name if the initial collides too. Two players with the
  same first AND last name are refused at release; there is no way to tell them
  apart. Fill in first names even when nobody shares a surname: it is the only
  thing available if a brother turns up next year.

  YOU DO NOT HAVE TO KNOW EVERYTHING AT ONCE. Names first; class, throwing hand
  and jerseys whenever you learn them. A later upload matches on last + first, so
  every ID survives, and a column the new file does not contain is left alone -- a
  jersey-only file cannot wipe the class years you typed in. A column it DOES
  contain wins, which is how a correction gets in.
  The catch: the match key is the name. Correct a spelling in the Roster Manager,
  where the ID comes forward. Uploading a file with a corrected spelling is a name
  the tool has never seen, and it mints a NEW id.

  To change the roster -- THREE STEPS, NO VERSION NUMBERS:
    1. Fill in Titans-Roster-Template.xlsx (Software folder).
    2. Open Titans Roster Manager.html. LOAD THE RELEASED roster.js FIRST --
       that is what keeps every existing ID. Then upload the spreadsheet.
    3. Download roster.js, drop it into ALL THREE of bullpen/, offense/ and
       game/, and push. Then add a line to the roster table in CHANGELOG.md.
       All three, every time. A folder that gets missed keeps serving the roster
       it already had, its banner says so quietly, and the IDs in that app's
       exports stop matching the other two.

  No cache bump. No build number. The apps ask the server for roster.js before
  falling back to their saved copy, so a new one lands the next time an iPad
  opens with signal. An iPad that has been offline keeps the roster it had, says
  so in its banner, and picks up the new one when it next has signal.

  THE CACHE BUMP IS STILL REQUIRED FOR AN APP CHANGE -- index.html, guide.html,
  templates.js. Those are code and stay cache-first. See the next section.

  Until the first real roster is released, an app ships a SAMPLE roster and shows
  a red "SAMPLE roster — not the real team" banner. It will let a coach chart,
  which is why it shouts: anything charted against sample IDs joins up with
  nothing. The copy in the working folder is the SAMPLE; the copies already on
  GitHub are the real release. Don't overwrite a live one with a sample.

  NO SAMPLE DATA IN ANY APP. All three open on a clean, saving session. The
  sample games are gone (bullpen v21, offense v40, game v18) because a released
  roster demonstrates an app better than invented names, and because the sample
  was the thing standing between opening the app and charting. One of them also
  turned out to be hiding a real bug: a lineup spot holding a TYPED name went
  through different code than a roster pick, so the broken path was never the one
  on screen when the app opened. A demo, if one is ever wanted again, belongs in
  History as a filed game — not as a second path through the live one.


ALL THREE APPS FILE RATHER THAN OVERWRITE
  "Finish & file" moves a session to the History tab and starts a clean one;
  nothing is thrown away. The Offense Chart had it first and the other two copied
  it rather than redesigning it. A coach who forgets to export still has every
  game he charted, with an Export button beside each one.
