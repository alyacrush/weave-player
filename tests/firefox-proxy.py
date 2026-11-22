"""Exercise Firefox's native proxy API with an isolated CONNECT forwarder.

Only the fixture manifest grants proxy access upfront. The shipped manifest
keeps it optional. This test uses no Twitch account and records hostnames only.
"""

import json
import select
import shutil
import socket
import socketserver
import tempfile
import threading
import time
import zipfile
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.firefox.options import Options


ROOT = Path(__file__).resolve().parents[1]
UUID = "d97115bd-f83a-412d-8e01-12d152f70bf1"
PLAYER = f"moz-extension://{UUID}/player.html"
DESTINATIONS = {"gql.twitch.tv:443", "usher.ttvnw.net:443"}
connections = []
traffic = []


class Tunnel(socketserver.StreamRequestHandler):
    def handle(self):
        first = self.rfile.readline(4096).decode("ascii").strip().split()
        if len(first) != 3 or first[0] != "CONNECT" or first[1] not in DESTINATIONS:
            self.wfile.write(b"HTTP/1.1 403 Forbidden\r\n\r\n")
            return
        while self.rfile.readline(4096).strip():
            pass
        host, port = first[1].split(":")
        with socket.create_connection((host, int(port)), timeout=15) as remote:
            connections.append(first[1])
            counter = {"bytes": 0}
            traffic.append(counter)
            self.wfile.write(b"HTTP/1.1 200 Connection Established\r\n\r\n")
            self.wfile.flush()
            while True:
                readable, _, _ = select.select([remote, self.connection], [], [], 20)
                if not readable:
                    return
                for source in readable:
                    data = source.recv(65536)
                    if not data:
                        return
                    if source is self.connection:
                        counter["bytes"] += len(data)
                    (self.connection if source is remote else remote).sendall(data)


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def configure(driver, enabled, port):
    driver.execute_async_script("""
        const done = arguments[arguments.length - 1];
        browser.storage.local.set({qualityProxyEnabled: arguments[0],
            qualityProxyUrl: 'http://127.0.0.1:' + arguments[1]}).then(() => done(true));
    """, enabled, port)
    # Let the background observe the storage notification before sending traffic.
    time.sleep(0.5)


def request(driver, url, marked=False):
    return driver.execute_async_script("""
        const [url, marked, done] = arguments;
        const xhr = new XMLHttpRequest();
        const gql = url.includes('gql.twitch.tv');
        xhr.open(gql ? 'POST' : 'GET', url);
        xhr.timeout = 20000;
        if (marked) xhr.setRequestHeader('X-Weave-Playback-Token', '1');
        if (gql) {
            xhr.setRequestHeader('Client-ID', 'kimne78kx3ncx6brgo4mv6wki5h1ko');
            xhr.setRequestHeader('Content-Type', 'text/plain');
        }
        xhr.onload = () => done(xhr.status);
        xhr.onerror = xhr.ontimeout = () => done(0);
        xhr.send(gql ? JSON.stringify({query: 'query { __typename }'}) : null);
    """, url, marked)


def main():
    with tempfile.TemporaryDirectory(prefix="weave-proxy-test-") as folder, Server(("127.0.0.1", 0), Tunnel) as server:
        threading.Thread(target=server.serve_forever, daemon=True).start()
        addon = Path(folder) / "addon"
        shutil.copytree(ROOT / "addon", addon)
        manifest_path = addon / "manifest.json"
        manifest = json.loads(manifest_path.read_text())
        manifest["permissions"].append("proxy")
        manifest.pop("optional_permissions", None)
        # Keep the production background and routing code, replacing only the
        # player document with a controlled page from the same extension URL.
        (addon / "player.html").write_text("<!doctype html><title>Proxy transport test</title>")
        manifest_path.write_text(json.dumps(manifest))
        archive = Path(folder) / "fixture.xpi"
        with zipfile.ZipFile(archive, "w") as package:
            for item in addon.rglob("*"):
                if item.is_file():
                    package.write(item, item.relative_to(addon))
        options = Options()
        options.add_argument("-headless")
        options.set_preference("extensions.webextensions.uuids", json.dumps({"weave-player@alyacrush": UUID}))
        with webdriver.Firefox(options=options) as driver:
            driver.set_script_timeout(25)
            driver.install_addon(str(archive), temporary=True)
            driver.get(PLAYER)
            port = server.server_address[1]
            configure(driver, True, port)
            assert request(driver, "https://gql.twitch.tv/gql", True) > 0, "proxied HTTPS token-class request reaches Twitch"
            assert "gql.twitch.tv:443" in connections
            assert request(driver, "https://usher.ttvnw.net/api/channel/hls/weave_proxy_fixture.m3u8") > 0
            assert "usher.ttvnw.net:443" in connections
            before = len(connections)
            sent = sum(item["bytes"] for item in traffic)
            assert request(driver, "https://gql.twitch.tv/gql") > 0
            assert len(connections) == before, "ordinary GraphQL uses the normal route"
            assert sum(item["bytes"] for item in traffic) == sent, "ordinary GraphQL cannot reuse a proxy tunnel"
            configure(driver, False, port)
            assert request(driver, "https://gql.twitch.tv/gql", True) > 0
            assert len(connections) == before, "disabled proxy uses the normal route"
            assert sum(item["bytes"] for item in traffic) == sent, "disabled mode cannot reuse a proxy tunnel"
            assert set(connections) <= DESTINATIONS
            print("PASS: native Firefox proxy API tunnels selected HTTPS requests through localhost; ordinary GraphQL and disabled mode stay direct")
        server.shutdown()


if __name__ == "__main__":
    main()
