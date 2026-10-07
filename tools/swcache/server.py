#!/usr/bin/env python3
"""A static server that can be told to stall roster.js.

A real service-worker test needs a real server: Playwright's request
interception does not reliably reach fetches made from inside a service
worker, which is exactly where the code under test lives.

Touch a file called ".delay" containing a number of seconds and every
roster.js request sleeps that long. Delete it and they are instant. That is
how the gym-wifi-that-never-answers case gets tested without guessing.
"""
import os
import sys
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))


class H(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        rel = path.split("?", 1)[0].split("#", 1)[0].lstrip("/")
        return os.path.join(ROOT, "site", rel)

    def send_head(self):
        if "roster.js" in self.path:
            d = os.path.join(ROOT, ".delay")
            if os.path.exists(d):
                try:
                    secs = float(open(d).read().strip() or "5")
                except ValueError:
                    secs = 5.0
                time.sleep(secs)
        # No-store everywhere so the browser's own http cache never muddies a
        # result: the only cache in play should be the service worker's.
        return SimpleHTTPRequestHandler.send_head(self)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("Service-Worker-Allowed", "/")
        SimpleHTTPRequestHandler.end_headers(self)

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8810
    ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
