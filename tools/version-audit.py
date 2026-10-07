#!/usr/bin/env python3
"""Every place a version number is written, checked against every other place.

Why this exists: a version lives in FIVE files per app, and two of them have to
agree exactly or the app shows a permanent amber `v27 != v28 - tap to fix` that
tapping cannot clear - stampBuild() compares BUILD against the cache-name suffix,
so bumping one without the other is a bug you ship to every iPad. The other three
are documentation, and a guide that describes the wrong build is how a coach ends
up following steps for a screen he does not have.

    python3 tools/version-audit.py          (from the repo root)

Exits non-zero on any disagreement.
"""
import io, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APPS = [("bullpen", "Bullpen Chart"), ("offense", "Offense Chart"), ("game", "Pitch Chart")]
fail = []


def read(*p):
    f = os.path.join(ROOT, *p)
    return io.open(f, encoding="utf-8").read() if os.path.exists(f) else None


def check(label, got, want):
    ok = got == want
    print(("  ok   " if ok else "  FAIL ") + label.ljust(40) + str(got) +
          ("" if ok else "   (want %s)" % want))
    if not ok:
        fail.append(label)


chlog = read("CHANGELOG.md") or ""
readme = read("README.txt") or ""

for folder, name in APPS:
    idx = read(folder, "index.html")
    sw = read(folder, "sw.js")
    gd = read(folder, "guide.html")
    if idx is None or sw is None:
        fail.append(folder + " missing")
        print("  FAIL " + folder + ": no index.html or sw.js")
        continue

    build = (re.search(r'var BUILD = "([^"]+)"', idx) or [None, None])[1]
    print("\n%s - source says %s" % (name, build))
    if not build:
        fail.append(folder + " has no BUILD")
        print("  FAIL no BUILD in index.html")
        continue

    # 1-2. The pair that MUST match or the app nags forever.
    cache = (re.search(r'var CACHE = "(titans-[a-z]+-)([^"]+)"', sw) or [None, None, None])
    check("sw.js cache name", cache[2], build)
    check("  cache prefix is this app", cache[1], "titans-%s-" % folder)

    # 3-4. The guide's masthead and its "which version am I on" callout.
    if gd is None:
        check("guide.html", "missing", "present")
    else:
        mast = re.search(r'App v([0-9]+)', gd)
        check("guide masthead", "v" + mast.group(1) if mast else None, build)
        callout = re.search(r'describes <b>v([0-9]+)</b>', gd)
        check("guide version callout", "v" + callout.group(1) if callout else None, build)

    # 5. The changelog's standings table, which is what Jim reads before a push.
    row = re.search(r'\*\*%s\*\*[^|]*\|([^|]*)\|' % re.escape(name), chlog)
    said = re.search(r'v([0-9]+)', row.group(1)) if row else None
    check("changelog standings row", "v" + said.group(1) if said else None, build)
    # And that the version has its own entry, not just a table cell.
    check("changelog has a %s entry" % build, ("### %s ·" % build) in chlog, True)

    # The roster file every app now needs a copy of, inside its own folder.
    check("roster.js in the folder", os.path.exists(os.path.join(ROOT, folder, "roster.js")), True)
    check("  and in the worker's file list", '"./roster.js"' in sw, True)

print("\n" + ("%d MISMATCHED: %s" % (len(fail), ", ".join(fail)) if fail else "every version location agrees"))
sys.exit(1 if fail else 0)
