"""Static file server for local preview.

Identical to `python3 -m http.server` except that it tells the browser not
to cache anything. Without this the browser holds on to main.js/CSS across
edits and the preview shows stale behaviour.

Development only — nothing here ships.
"""

import sys
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    ThreadingHTTPServer(("127.0.0.1", port), NoCacheHandler).serve_forever()
