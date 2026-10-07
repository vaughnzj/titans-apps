LEGEND TITANS — COACHING APPS
Files for a free GitHub Pages site.

WHAT'S HERE
  CHANGELOG.md          What changed in each version of each app — update it when you bump a version
  index.html            Landing page listing both apps
  bullpen/index.html    The Bullpen Chart app
  bullpen/guide.html    The Bullpen Chart coach's guide
  bullpen/templates.js  The weekly bullpen scripts (you edit this one)
  bullpen/roster.js     The released master roster — SAME FILE also in offense/
  offense/roster.js     The same file again (a service worker can only cache
                        inside its own folder, so it has to be in both)
  tools/sweep.js        Clicks every control and checks it still does something
  tools/roster-states.js  Checks the four roster states the apps can be in
  tools/admin/          Test suites for the Roster Manager, plus the generator
                        that builds Titans-Roster-Template.xlsx. See its README.
  game/index.html       The Dugout Pitch Chart app
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
  Without that change the iPads keep serving the old cached copy. The two
  apps cache separately, so updating one never disturbs the other.


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

  The guides carry an "App v9" / "App v4" / "App v1" line under the title. When you change
  an app, change that line too so a coach can tell the guide matches the app in
  front of them. A guide is a plain web page — edit it in GitHub, bump the
  version in <app>/sw.js, and the iPads pick it up the same way they pick up
  the app.

WHICH VERSION IS AN iPAD ON?
  Both apps print their build in the header — "v9" next to the app name on the
  bullpen chart, "v4" next to Pitch Chart on the game app, "v1" on the offense
  chart. Read it off the
  screen; no need to hunt for a feature that changed.

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

WHEN I CHANGE AN APP, FOUR THINGS MOVE TOGETHER
  <app>/index.html     the app itself
  <app>/sw.js          CACHE version, or the iPads keep the old copy
  the BUILD line near the top of the script in index.html
  <app>/guide.html     the "App v_" line under the title, if the change shows
  If the last two disagree the app says so in amber, so a missed bump shows up
  rather than sitting there silently.
  CHANGELOG.md is the fifth. Update it first, while you remember what changed.

BEFORE EVERY PUSH, RUN BOTH TEST SCRIPTS
  python3 -m http.server 8807 &
  node tools/sweep.js            every control still does something
  node tools/roster-states.js    the four roster states
  sweep.js stays green through a bug that silently breaks roster identity, which
  is why the second script exists. Run both.

  The Roster Manager has three more suites in tools/admin/ -- they need a small
  harness first because that page loads SheetJS from a CDN. tools/admin/README.txt
  has the six steps.

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

  To change the roster:
    1. Fill in Titans-Roster-Template.xlsx (Software folder).
    2. Open Titans Roster Manager.html. LOAD THE RELEASED roster.js FIRST —
       that is what keeps every existing ID. Then upload the spreadsheet.
    3. Download roster.js. Drop it into BOTH bullpen/ and offense/.
    4. Bump the CACHE name in BOTH sw.js files, or the iPads keep the old roster.
    5. Add a line to the roster table in CHANGELOG.md.
    6. Open each iPad once on wifi.

  Until the first real roster is released, both apps ship a SAMPLE roster and
  show a red "SAMPLE roster — not the real team" banner. It will let a coach
  chart, which is why it shouts: anything charted against sample IDs joins up
  with nothing.


THE OFFENSE CHART IS DIFFERENT IN ONE WAY
  It never overwrites a game. "Finish & file this game" moves the game to the
  History tab and starts a clean one; nothing is ever thrown away. That is the
  fix we want in the other two apps eventually, so if it holds up over a season,
  copy it rather than redesigning it.

  It reads the released roster (roster.js), the same one the Bullpen Chart reads,
  so a hitter's season stays under one spelling and one ID. Nobody edits the team
  on an iPad — see THE ROSTER below.
