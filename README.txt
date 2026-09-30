LEGEND TITANS — COACHING APPS
Files for a free GitHub Pages site.

WHAT'S HERE
  index.html            Landing page listing the apps
  bullpen/index.html    The Bullpen Chart app
  bullpen/manifest.webmanifest, sw.js, icon-*.png   What makes it work offline

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

UPDATING THE APP LATER
  Replace bullpen/index.html in the repo AND change the version line at the
  top of bullpen/sw.js (titans-bullpen-v1 -> v2). Without that change the
  iPads keep serving the old cached copy.
