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
import zipfile
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.firefox.options import Options


ROOT = Path(__file__).resolve().parents[1]
DESTINATIONS = {"gql.twitch.tv:443", "usher.ttvnw.net:443"}
connections = []
traffic = []
completed = threading.Event()
result = {}


class Tunnel(socketserver.StreamRequestHandler):
    def handle(self):
        first = self.rfile.readline(4096).decode("ascii").strip().split()
        if len(first) != 3:
            return
        headers = {}
        while line := self.rfile.readline(4096).strip():
            name, value = line.decode("ascii").split(":", 1)
            headers[name.lower()] = value.strip()
        if first[0] == "GET" and first[1] == "/metrics":
            body = json.dumps({"hosts": connections, "bytes": sum(item["bytes"] for item in traffic)}).encode()
            self.wfile.write(b"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: " + str(len(body)).encode() + b"\r\nConnection: close\r\n\r\n" + body)
            return
        if first[0] == "POST" and first[1] == "/result":
            result.update(json.loads(self.rfile.read(int(headers["content-length"]))))
            self.wfile.write(b"HTTP/1.1 200 OK\r\nContent-Length: 0\r\nConnection: close\r\n\r\n")
            completed.set()
            return
        if first[0] != "CONNECT" or first[1] not in DESTINATIONS:
            self.wfile.write(b"HTTP/1.1 403 Forbidden\r\n\r\n")
            return
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


LAB_SCRIPT = """
'use strict';
const base = 'http://127.0.0.1:PORT';
async function configure(enabled) {
    await browser.storage.local.set({qualityProxyEnabled: enabled, qualityProxyUrl: base});
    await new Promise(resolve => setTimeout(resolve, 500));
}
function request(url, marked = false) {
    return new Promise(done => {
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
    });
}
async function main() {
    await configure(true);
    const token = await request('https://gql.twitch.tv/gql', true);
    const playlist = await request('https://usher.ttvnw.net/api/channel/hls/weave_proxy_fixture.m3u8');
    const before = await (await fetch(base + '/metrics')).json();
    const ordinary = await request('https://gql.twitch.tv/gql');
    const afterOrdinary = await (await fetch(base + '/metrics')).json();
    await configure(false);
    const disabled = await request('https://gql.twitch.tv/gql', true);
    const afterDisabled = await (await fetch(base + '/metrics')).json();
    return {token, playlist, ordinary, disabled, before, afterOrdinary, afterDisabled};
}
main().catch(error => ({error: error.message})).then(value => fetch(base + '/result', {
    method: 'POST', body: JSON.stringify(value)
}));
"""


def main():
    with tempfile.TemporaryDirectory(prefix="weave-proxy-test-") as folder, Server(("127.0.0.1", 0), Tunnel) as server:
        threading.Thread(target=server.serve_forever, daemon=True).start()
        addon = Path(folder) / "addon"
        shutil.copytree(ROOT / "addon", addon)
        manifest_path = addon / "manifest.json"
        manifest = json.loads(manifest_path.read_text())
        manifest["permissions"].append("proxy")
        manifest["permissions"].append("http://127.0.0.1/*")
        manifest.pop("optional_permissions", None)
        # Keep the production background and routing code, replacing only the
        # player document with a controlled page from the same extension URL.
        (addon / "player.html").write_text('<!doctype html><title>Proxy transport test</title><script src="proxy-lab.js" defer></script>')
        (addon / "proxy-lab.js").write_text(LAB_SCRIPT.replace("PORT", str(server.server_address[1])))
        (addon / "proxy-lab-open.js").write_text("browser.tabs.create({url: browser.runtime.getURL('player.html')});")
        manifest["background"]["scripts"].append("proxy-lab-open.js")
        manifest_path.write_text(json.dumps(manifest))
        archive = Path(folder) / "fixture.xpi"
        with zipfile.ZipFile(archive, "w") as package:
            for item in addon.rglob("*"):
                if item.is_file():
                    package.write(item, item.relative_to(addon))
        options = Options()
        options.add_argument("-headless")
        with webdriver.Firefox(options=options) as driver:
            driver.install_addon(str(archive), temporary=True)
            assert completed.wait(100), "extension transport test did not finish"
            assert "error" not in result, result
            assert all(result[key] > 0 for key in ["token", "playlist", "ordinary", "disabled"]), result
            assert DESTINATIONS <= set(result["before"]["hosts"]), result
            assert result["before"] == result["afterOrdinary"], "ordinary GraphQL cannot reuse a proxy tunnel"
            assert result["before"] == result["afterDisabled"], "disabled mode cannot reuse a proxy tunnel"
            assert set(connections) <= DESTINATIONS
            print("PASS: native Firefox proxy API tunnels selected HTTPS requests through localhost; ordinary GraphQL and disabled mode stay direct")
        server.shutdown()


if __name__ == "__main__":
    main()
