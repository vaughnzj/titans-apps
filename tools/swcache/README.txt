SERVICE-WORKER CACHE TEST

Proves the one thing that makes a roster release painless: a new roster.js
reaches the app with NO cache bump, while the app itself stays cache-first and
still opens with no signal.

Why it needs its own harness:
  - Service workers are ALLOWED here. sweep.js and roster-states.js block them
    on purpose; this suite is about the worker, so blocking it tests nothing.
  - Playwright's setOffline does NOT reach fetches made from inside a service
    worker. The first version of the offline step "passed" while the worker was
    quietly going to the network and caching a newer roster. Real offline means
    stopping the server, so this suite owns the server process.
  - Request interception does not reliably reach worker fetches either, which is
    why server.py exists: touch a file called ".delay" with a number of seconds
    and every roster.js response stalls that long. That is the gym-wifi case.

SETUP
  mkdir -p tools/swcache/site
  cp bullpen/* tools/swcache/site/
  node tools/swcache/roster-freshness.js        (it starts and stops the server)

WHAT IT COVERS, in order
  1  First load: the worker installs and caches roster v1.
  2  A new roster.js on the server, no cache bump -> the app sees it.  <- the point
  3  CONTROL: index.html is tampered with on the server and the app still serves
     the cached copy, proving only roster.js changed behaviour.
  4  Real offline, server stopped: the app opens on the roster it actually had.
  5  A 6s stall against a 2.5s budget: the app is usable in under 3s on the
     cached roster, and the late response is NOT written to the cache - storing
     it would mean the next open showed a roster this one declined to use.
  6  Stall gone: the new roster lands, app version unchanged.

Step 2 has been proved to fail by taking roster.js back off the network-first
path: it reports the old roster, which is exactly the silent failure this change
removes.
