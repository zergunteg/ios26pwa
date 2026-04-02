#!/usr/bin/env python3
from __future__ import annotations

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent


class NoCacheStaticHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, directory: str | None = None, **kwargs):
        super().__init__(*args, directory=directory or str(ROOT), **kwargs)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve the project over localhost for iOS Simulator testing.")
    parser.add_argument("--host", default="127.0.0.1", help="Host interface to bind to.")
    parser.add_argument("--port", type=int, default=4173, help="Port to listen on.")
    args = parser.parse_args()

    handler = partial(NoCacheStaticHandler, directory=str(ROOT))
    server = ThreadingHTTPServer((args.host, args.port), handler)

    print(f"Serving {ROOT} at http://{args.host}:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
