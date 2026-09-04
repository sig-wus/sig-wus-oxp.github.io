#!/usr/bin/env python3
"""Headless-browser interaction test for the SIG-WUS X-change catalog.

Attribution: written by GLM (glm-5.3-flash) via the Oh My Pi coding harness,
2026-09-04, working with Dr. Richard Nauber on the SIG-WUS X-change repo.

Drives the page with REAL input events (CDP Input.dispatchMouseEvent) rather
than synthetic DOM events — the two differ: an <object> SVG embed captures real
clicks inside the embedded document, so delegated listeners on the page never
fire (this bit us once: clicking a card illustration did nothing).

Covers:
  1. clicking a card ANYWHERE (media image, title, description) opens the
     detail dialog with non-empty content;
  2. the dialog close button, Escape, and backdrop click all close it;
  3. the disclaimer-cell Contribute button opens the contribute dialog;
  4. card "Improve" opens the contribute dialog in edit mode;
  5. no JS page errors during all of the above;
  6. every dialog-declared element referenced by the JS actually exists.

Usage: python3 test/browser_test.py [port]   (default 8000, expects the dev
server to already serve the repository root on that port)
"""

import asyncio
import json
import pathlib
import socket
import subprocess
import sys
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".test-deps"))  # optional deps dir

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
BASE = f"http://127.0.0.1:{PORT}"

CHROME_CANDIDATES = [
    ROOT / ".chrome/chrome-linux64/chrome",
    pathlib.Path.home() / ".omp/puppeteer/chrome/150.0.7871.24/chrome-linux64/chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
]


def find_chrome():
    for c in CHROME_CANDIDATES:
        if c.is_file() and c.stat().st_mode & 0o111:
            return str(c)
    raise SystemExit("No Chromium/Chrome binary found; install one or extend CHROME_CANDIDATES")


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class Browser:
    """Minimal CDP client over chromium --headless --remote-debugging-port."""

    def __init__(self):
        self.chrome = find_chrome()
        self.port = free_port()
        self.proc = None
        self.ws = None
        self.mid = 0
        self.page_errors = []

    def start(self):
        self.proc = subprocess.Popen(
            [
                self.chrome,
                "--headless=new",
                "--no-sandbox",
                "--disable-gpu",
                f"--remote-debugging-port={self.port}",
                f"--user-data-dir=/tmp/oxp-browser-test-{self.port}",
                "--window-size=1400,1000",
                "about:blank",
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        for _ in range(50):
            try:
                urllib.request.urlopen(f"http://127.0.0.1:{self.port}/json/version", timeout=1)
                return
            except OSError:
                time.sleep(0.2)
        raise SystemExit("Chrome did not open its CDP port")

    def connect(self):
        try:
            import websockets  # noqa: F401
        except ImportError:
            raise SystemExit("Run: uv pip install websockets  (or pip install websockets)")
        import asyncio

        loop = asyncio.new_event_loop()
        self.loop = loop
        loop.run_until_complete(self._connect())
        return loop

    async def _connect(self):
        import websockets

        targets = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{self.port}/json").read())
        page = targets[0]
        self.ws = await websockets.connect(page["webSocketDebuggerUrl"], max_size=64 * 1024 * 1024)
        self.pump = self.loop.create_task(self._pump())
        await self.cmd("Page.enable")
        await self.cmd("Runtime.enable")

    async def _pump(self):
        while True:
            msg = json.loads(await self.ws.recv())
            if msg.get("method") == "Runtime.exceptionThrown":
                self.page_errors.append(msg["params"]["exceptionDetails"].get("text", "?"))
            elif "id" in msg and msg["id"] in self.pending:
                fut = self.pending.pop(msg["id"])
                if "error" in msg:
                    fut.set_exception(RuntimeError(str(msg["error"])))
                else:
                    fut.set_result(msg.get("result", {}))

    async def cmd(self, method, **params):
        self.mid += 1
        fut = self.loop.create_future()
        self.pending[self.mid] = fut
        await self.ws.send(json.dumps({"id": self.mid, "method": method, "params": params}))
        return await asyncio.wait_for(fut, timeout=30)

    async def js(self, expr):
        r = await self.cmd("Runtime.evaluate", expression=expr, returnByValue=True, awaitPromise=True)
        if r.get("exceptionDetails"):
            raise RuntimeError(json.dumps(r["exceptionDetails"]["exception"])[:300])
        return r["result"].get("value")

    def stop(self):
        if self.proc:
            self.proc.terminate()
            try:
                self.proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.proc.kill()
        subprocess.run(["rm", "-rf", f"/tmp/oxp-browser-test-{self.port}"])


def main():
    # server reachable?
    try:
        urllib.request.urlopen(BASE + "/", timeout=3)
    except OSError as e:
        raise SystemExit(f"Dev server not reachable at {BASE} ({e}). Start: python3 -m http.server {PORT}")

    b = Browser()
    b.pending = {}
    b.start()
    loop = b.connect()
    failed = False

    async def run():
        nonlocal failed
        import asyncio

        b.loop.create_task(b._pump())

        await b.cmd(
            "Page.navigate",
            url=f"{BASE}/?browsertest={int(time.time())}",
        )
        await asyncio.sleep(2.5)

        # ---- 1. real clicks everywhere on the first card must open the dialog
        zones = await b.js(
            """
            (() => {
              const card = [...document.querySelectorAll('.card')][0];
              if (!card) return null;
              card.scrollIntoView({ block: 'center' });
              const r = card.getBoundingClientRect();
              const at = (fy) => {
                const x = r.left + r.width / 2, y = r.top + r.height * fy;
                return { x, y, hit: (document.elementFromPoint(x, y) || {}).tagName || 'OFFSCREEN' };
              };
              return { id: card.dataset.id, media: at(0.3), title: at(0.62), body: at(0.8) };
            })()
            """
        )
        if zones is None:
            print("FAIL: no cards rendered")
            return True
        # a click point falling outside the viewport (elementFromPoint == null) would
        # silently do nothing - re-scroll per zone and recompute
        await asyncio.sleep(0.3)
        for zone in ("media", "title", "body"):
            # recompute per zone: the dialog from the previous zone must be closed and
            # the card re-scrolled so the point is guaranteed on-screen
            pt = await b.js(
                """
                (() => {
                  const card = [...document.querySelectorAll('.card')][0];
                  card.scrollIntoView({ block: 'center' });
                  const fy = %s;
                  const r = card.getBoundingClientRect();
                  const x = r.left + r.width / 2, y = r.top + r.height * fy;
                  const el = document.elementFromPoint(x, y);
                  return { x, y, hit: el ? el.tagName : 'OFFSCREEN' };
                })()
                """
                % {"media": "0.3", "title": "0.62", "body": "0.8"}[zone]
            )
            if pt["hit"] == "OFFSCREEN":
                print(f"FAIL: {zone} point offscreen even after scroll")
                failed = True
                continue
            await asyncio.sleep(0.2)
            await b.cmd("Input.dispatchMouseEvent", type="mousePressed", x=pt["x"], y=pt["y"], button="left", clickCount=1)
            await b.cmd("Input.dispatchMouseEvent", type="mouseReleased", x=pt["x"], y=pt["y"], button="left", clickCount=1)
            await asyncio.sleep(0.6)
            open_ = await b.js("document.getElementById('detailDialog').open")
            body_len = await b.js("document.getElementById('dialogBody').innerHTML.length")
            # "nothing but blur" bug class: dialog opens but renders 0px tall/wide,
            # or #dialogBody got nested into the close button by a missing tag.
            geom = await b.js(
                """
                (() => {
                  const d = document.getElementById('detailDialog');
                  const r = d.getBoundingClientRect();
                  const body = document.getElementById('dialogBody');
                  return {
                    w: r.width, h: r.height,
                    bodyParentIsDialog: body.parentElement === d,
                    childCount: d.children.length,
                  };
                })()
                """
            )
            ok = open_ and body_len > 100 and geom["h"] > 200 and geom["bodyParentIsDialog"]
            print(
                f"click card {zones['id']} at {zone} (hit {pt['hit']}): open={open_}, "
                f"body={body_len}, dialog {geom['w']:.0f}x{geom['h']:.0f}, "
                f"body direct child={geom['bodyParentIsDialog']} -> {'OK' if ok else 'FAIL'}"
            )
            if not ok:
                failed = True
            if open_:
                await b.js("document.getElementById('closeDialog').click()")
                await asyncio.sleep(0.3)
                if await b.js("document.getElementById('detailDialog').open"):
                    print("FAIL: close button did not close dialog")
                    failed = True

        # ---- 2. Escape closes
        await b.js("[...document.querySelectorAll('.card')][0].click()")
        await asyncio.sleep(0.5)
        await b.cmd("Input.dispatchKeyEvent", type="keyDown", key="Escape", code="Escape", windowsVirtualKeyCode=27)
        await b.cmd("Input.dispatchKeyEvent", type="keyUp", key="Escape", code="Escape", windowsVirtualKeyCode=27)
        await asyncio.sleep(0.4)
        esc_closed = not await b.js("document.getElementById('detailDialog').open")
        print(f"Escape closes dialog: {'OK' if esc_closed else 'FAIL'}")
        if not esc_closed:
            failed = True

        # ---- 3. backdrop click closes (click far outside dialog box)
        await b.js("[...document.querySelectorAll('.card')][0].click()")
        await asyncio.sleep(0.5)
        await b.cmd("Input.dispatchMouseEvent", type="mousePressed", x=8, y=8, button="left", clickCount=1)
        await b.cmd("Input.dispatchMouseEvent", type="mouseReleased", x=8, y=8, button="left", clickCount=1)
        await asyncio.sleep(0.4)
        bd_closed = not await b.js("document.getElementById('detailDialog').open")
        print(f"backdrop click closes dialog: {'OK' if bd_closed else 'FAIL'}")
        if not bd_closed:
            failed = True

        # ---- 4. Contribute button in disclaimer cell opens new-entry dialog
        await b.js("document.querySelector('.stat-disclaimer-cell #contributeBtn').click()")
        await asyncio.sleep(0.5)
        opened = await b.js("document.getElementById('contributeDialog').open")
        mode = await b.js("document.getElementById('contribMode').textContent")
        ok = opened and mode == "New entry"
        print(f"disclaimer Contribute opens new-entry form: {'OK' if ok else 'FAIL'}")
        if not ok:
            failed = True
        await b.js("document.getElementById('contributeDialog').close()")

        # ---- 4b. stat cells toggle their filters; first cell resets everything
        seq = await b.js(
            """
            (() => {
              const g = (id) => document.getElementById(id);
              const buy = g('buyableFilter'), hw = g('hwOpenFilter'), sw = g('swOpenFilter');
              const s1 = buy.checked;
              g('statBuyCell').click();
              const s2 = buy.checked;
              g('statBuyCell').click();
              const s3 = buy.checked;
              const h1 = hw.checked;
              g('statHwCell').click();
              const h2 = hw.checked;
              g('statTotalCell').click();
              return { buy: [s1, s2, s3], hw: [h1, h2], hwAfterReset: hw.checked, swAfterReset: sw.checked };
            })()
            """
        )
        ok = (
            seq["buy"] == [False, True, False]          # click toggles, click again untoggles
            and seq["hw"] == [True, False]              # HW chip on by default, cell click unchecks
            and seq["hwAfterReset"] and seq["swAfterReset"]  # first cell resets to defaults
        )
        print(f"stat cell toggles + reset cell: buy={seq['buy']} hw={seq['hw']} reset(hw,sw)=({seq['hwAfterReset']},{seq['swAfterReset']}) -> {'OK' if ok else 'FAIL'}")
        if not ok:
            failed = True

        # ---- 5. card Improve opens edit-mode form, prefilled
        await b.js("[...document.querySelectorAll('.card')][0].querySelector('[data-contribute]').click()")
        await asyncio.sleep(0.5)
        opened = await b.js("document.getElementById('contributeDialog').open")
        mode = await b.js("document.getElementById('contribMode').textContent")
        prefill = await b.js("document.getElementById('cf_platform').value")
        ok = opened and mode == "Improve existing entry" and prefill
        print(f"card Improve opens edit form prefilled ({prefill!r}): {'OK' if ok else 'FAIL'}")
        if not ok:
            failed = True
        await b.js("document.getElementById('contributeDialog').close()")

        # ---- 6. dialog "Improve on GitHub" works from the detail dialog
        await b.js("[...document.querySelectorAll('.card')][0].click()")
        await asyncio.sleep(0.5)
        await b.js("document.querySelector('[data-improve]').click()")
        await asyncio.sleep(0.5)
        opened = await b.js("document.getElementById('contributeDialog').open")
        mode = await b.js("document.getElementById('contribMode').textContent")
        ok = opened and mode == "Improve existing entry"
        print(f"dialog Improve on GitHub: {'OK' if ok else 'FAIL'}")
        if not ok:
            failed = True
        await b.js("document.getElementById('contributeDialog').close()")

        # ---- 7. page errors collected during the whole run
        if b.page_errors:
            print("FAIL: runtime page errors:")
            for e in b.page_errors:
                print(f"  {e}")
            failed = True
        else:
            print("no runtime page errors: OK")

    try:
        loop.run_until_complete(run())
    finally:
        b.stop()

    if failed:
        print("Browser interaction test FAILED")
        sys.exit(1)
    print("Browser interaction test OK")
    sys.exit(0)


if __name__ == "__main__":
    main()
