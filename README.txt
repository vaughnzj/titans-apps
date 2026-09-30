LEGEND TITANS — COACHING APPS
Files for a free GitHub Pages site.

WHAT'S HERE
  index.html            Landing page listing both apps
  bullpen/index.html    The Bullpen Chart app
  bullpen/templates.js  The weekly bullpen scripts (you edit this one)
  game/index.html       The Dugout Pitch Chart app
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
  Replace <app>/index.html in the repo AND change the version line at the
  top of that app's sw.js:
      bullpen/sw.js   titans-bullpen-v1 -> v2
      game/sw.js      titans-game-v1    -> v2
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


WHICH VERSION IS AN iPAD ON?
  Both apps print their build in the header — "v8" next to the app name on the
  bullpen chart, "v2" next to Pitch Chart on the game app. Read it off the
  screen; no need to hunt for a feature that changed.

  If it shows something like "v8 =/= v7" in amber, that iPad has downloaded a
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

WHEN I CHANGE AN APP, THREE THINGS MOVE TOGETHER
  <app>/index.html     the app itself
  <app>/sw.js          CACHE version, or the iPads keep the old copy
  the BUILD line near the top of the script in index.html
  If the last two disagree the app says so in amber, so a missed bump shows up
  rather than sitting there silently.
