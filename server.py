#!/usr/bin/env python3
"""
Simple local HTTP server for NumberLink
Serves static files and automatically opens the browser.
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8000

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable caching-friendly or no-cache headers for dev
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def run():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Try finding an open port starting at 8000
    global PORT
    for p in range(8000, 8020):
        try:
            with socketserver.TCPServer(("", p), CustomHandler) as httpd:
                PORT = p
                url = f"http://localhost:{PORT}"
                print(f"==================================================")
                print(f"  NumberLink Server spustený na: {url}")
                print(f"  Pre ukončenie stlačte Ctrl+C")
                print(f"==================================================")
                webbrowser.open(url)
                httpd.serve_forever()
                break
        except OSError:
            continue

if __name__ == '__main__':
    try:
        run()
    except KeyboardInterrupt:
        print("\nServer zastavený.")
        sys.exit(0)
