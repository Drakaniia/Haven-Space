"""Smooth 1080p Playwright walkthrough recorder for Haven Space.

Records 5 separate WebM chapters (Guest & Auth, Boarder Pre-Tenancy,
Boarder Tenancy, Landlord, Admin) at 1920x1080 with:
- Crisp visible SVG pointer cursor + click ripple at exact click coordinates
- Continuous requestAnimationFrame smooth scrolling (no section jumps)
- Click-driven navigation across header, sidebar, and cards
- Full landlord authentication + real file upload flows
"""

from __future__ import annotations

import json
import os
import shutil
import sys
import urllib.request
from pathlib import Path
from playwright.sync_api import Locator, Page, sync_playwright

BASE_URL = os.environ.get("HAVEN_WEB_URL", "http://localhost:3000").rstrip("/")
API_URL = os.environ.get("HAVEN_API_URL", "http://127.0.0.1:8000").rstrip("/")
DEMO_PASSWORD = os.environ.get("HAVEN_DEMO_PASSWORD", "Landlord123!")

ROOT_DIR = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT_DIR / "output" / "videos" / "raw"
SAMPLE_IMAGE = ROOT_DIR / "apps" / "web" / "public" / "assets" / "images" / "Haven_Space_Logo.png"

CURSOR_INIT_JS = """
(() => {
  if (window.__havenCursorInstalled) return;
  window.__havenCursorInstalled = true;

  let lastX = 960;
  let lastY = 540;

  const install = () => {
    if (!document.body || document.getElementById('haven-demo-cursor')) return;
    const style = document.createElement('style');
    style.textContent = `
      #haven-demo-cursor {
        position: fixed;
        top: 0;
        left: 0;
        width: 28px;
        height: 28px;
        pointer-events: none;
        z-index: 2147483647;
        transform: translate3d(960px, 540px, 0);
        transition: transform 0.015s linear;
        filter: drop-shadow(0 2px 5px rgba(0,0,0,0.35));
      }
      #haven-demo-cursor.clicking svg {
        transform: scale(0.84);
      }
      #haven-demo-cursor svg {
        transition: transform 0.09s ease-out;
        display: block;
      }
      .haven-demo-ripple {
        position: fixed;
        width: 22px;
        height: 22px;
        border-radius: 9999px;
        border: 3px solid rgba(180, 83, 9, 0.92);
        background: rgba(180, 83, 9, 0.18);
        pointer-events: none;
        z-index: 2147483646;
        transform: translate(-50%, -50%) scale(0.8);
        animation: havenRipple 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      @keyframes havenRipple {
        0% { transform: translate(-50%, -50%) scale(0.6); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(2.8); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    const el = document.createElement('div');
    el.id = 'haven-demo-cursor';
    el.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 2.5L20 11.2L12.6 13.1L9.5 20.5L4 2.5Z" fill="#1f1f1f" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
    </svg>`;
    el.style.transform = `translate3d(${lastX}px, ${lastY}px, 0)`;
    document.body.appendChild(el);
  };

  window.__havenPulseAt = (x, y) => {
    if (!document.body) return;
    const r = document.createElement('div');
    r.className = 'haven-demo-ripple';
    r.style.left = x + 'px';
    r.style.top = y + 'px';
    document.body.appendChild(r);
    setTimeout(() => r.remove(), 650);
  };

  document.addEventListener('mousemove', (e) => {
    lastX = e.clientX;
    lastY = e.clientY;
    const el = document.getElementById('haven-demo-cursor');
    if (el) el.style.transform = `translate3d(${lastX}px, ${lastY}px, 0)`;
  }, { passive: true });

  document.addEventListener('mousedown', (e) => {
    const el = document.getElementById('haven-demo-cursor');
    if (el) el.classList.add('clicking');
    window.__havenPulseAt(e.clientX, e.clientY);
  }, { passive: true });

  document.addEventListener('mouseup', () => {
    const el = document.getElementById('haven-demo-cursor');
    if (el) el.classList.remove('clicking');
  }, { passive: true });

  const startObserver = () => {
    if (document.documentElement) {
      const obs = new MutationObserver(install);
      obs.observe(document.documentElement, { childList: true, subtree: true });
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { install(); startObserver(); });
  } else {
    install();
    startObserver();
  }
})();
"""


def wait_settle(page: Page, ms: int = 850) -> None:
    try:
        page.wait_for_load_state("networkidle", timeout=4500)
    except Exception:
        pass
    page.wait_for_timeout(ms)


def smooth_scroll_to(page: Page, target_y: int, duration_ms: int) -> None:
    page.evaluate(
        """({ targetY, duration }) => new Promise((resolve) => {
            const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
            const dest = Math.min(maxScroll, Math.max(0, targetY));
            const start = window.scrollY;
            const delta = dest - start;
            if (Math.abs(delta) < 6) { resolve(); return; }
            const t0 = performance.now();
            // Smooth sine ease-in-out for continuous natural glide
            const ease = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
            function step(now) {
                const p = Math.min(1, (now - t0) / duration);
                window.scrollTo(0, start + delta * ease(p));
                if (p < 1) requestAnimationFrame(step);
                else resolve();
            }
            requestAnimationFrame(step);
        })""",
        {"targetY": target_y, "duration": duration_ms},
    )


def smooth_glide_page(page: Page, px_per_sec: float = 420.0, return_top: bool = True) -> None:
    """Continuously glide down the full page at a steady reading pace, then back up."""
    max_scroll = int(page.evaluate("Math.max(0, document.documentElement.scrollHeight - window.innerHeight)"))
    if max_scroll < 80:
        page.wait_for_timeout(450)
        return
    down_ms = int(max(1300, min(5200, (max_scroll / px_per_sec) * 1000)))
    smooth_scroll_to(page, max_scroll, down_ms)
    page.wait_for_timeout(550)
    if return_top:
        up_ms = int(max(850, min(2200, down_ms * 0.45)))
        smooth_scroll_to(page, 0, up_ms)
        page.wait_for_timeout(350)


def move_and_click(page: Page, locator: Locator, pause_after_ms: int = 850) -> bool:
    try:
        el = locator.first
        el.wait_for(state="visible", timeout=5000)
        el.scroll_into_view_if_needed(timeout=4000)
        page.wait_for_timeout(150)
        box = el.bounding_box()
        if box:
            cx = box["x"] + box["width"] / 2
            cy = box["y"] + box["height"] / 2
            page.mouse.move(cx, cy, steps=26)
            page.wait_for_timeout(200)
            page.mouse.click(cx, cy)
        else:
            el.click()
        wait_settle(page, pause_after_ms)
        return True
    except Exception as exc:
        print(f"     [skip click] {exc}")
        return False


def type_smooth(page: Page, locator: Locator, text: str, delay_ms: int = 34) -> bool:
    try:
        el = locator.first
        el.wait_for(state="visible", timeout=5000)
        el.scroll_into_view_if_needed(timeout=4000)
        box = el.bounding_box()
        if box:
            cx = box["x"] + min(box["width"] / 2, 120)
            cy = box["y"] + box["height"] / 2
            page.mouse.move(cx, cy, steps=22)
            page.wait_for_timeout(150)
            page.mouse.click(cx, cy)
        else:
            el.click()
        el.fill("")
        el.type(text, delay=delay_ms)
        page.wait_for_timeout(220)
        return True
    except Exception as exc:
        print(f"     [skip type] {exc}")
        return False


def upload_file_with_cursor(page: Page, input_index: int = 0) -> bool:
    """Move cursor visibly to the upload dropzone/label, ripple-click, and attach file."""
    if not SAMPLE_IMAGE.exists():
        print(f"     [skip upload] missing {SAMPLE_IMAGE}")
        return False
    try:
        file_input = page.locator('input[type="file"]').nth(input_index)
        file_input.wait_for(state="attached", timeout=5000)
        # Try to visually glide cursor to the enclosing label/dropzone
        label = file_input.locator("xpath=ancestor::label[1]")
        if label.count() > 0 and label.first.is_visible():
            label.first.scroll_into_view_if_needed(timeout=4000)
            page.wait_for_timeout(180)
            box = label.first.bounding_box()
            if box:
                cx = box["x"] + box["width"] / 2
                cy = box["y"] + box["height"] / 2
                page.mouse.move(cx, cy, steps=26)
                page.wait_for_timeout(220)
                page.evaluate("({x, y}) => window.__havenPulseAt && window.__havenPulseAt(x, y)", {"x": cx, "y": cy})
                page.wait_for_timeout(260)
        file_input.set_input_files(str(SAMPLE_IMAGE))
        wait_settle(page, 1350)
        return True
    except Exception as exc:
        print(f"     [skip upload] {exc}")
        return False


def nav_click_or_goto(page: Page, path: str, selector: str | None = None, pause_ms: int = 950, scroll: bool = True) -> None:
    """Prefer clicking a visible nav link so the cursor visibly drives transitions."""
    print(f"  -> {path}")
    clicked = False
    if selector:
        loc = page.locator(selector).first
        if loc.count() > 0 and loc.is_visible():
            clicked = move_and_click(page, loc, pause_after_ms=pause_ms)
    if not clicked:
        page.goto(f"{BASE_URL}{path}", wait_until="domcontentloaded", timeout=20000)
        wait_settle(page, pause_ms)
    if scroll:
        smooth_glide_page(page)


def login_as(page: Page, email: str, password: str = DEMO_PASSWORD) -> None:
    print(f"  [auth] logging in as {email}")
    page.goto(f"{BASE_URL}/auth/login", wait_until="domcontentloaded", timeout=20000)
    wait_settle(page, 700)
    type_smooth(page, page.locator('input[type="email"], input[name="email"]'), email, delay_ms=26)
    type_smooth(page, page.locator('input[type="password"], input[name="password"]'), password, delay_ms=26)
    move_and_click(page, page.locator('button[type="submit"]'), pause_after_ms=1400)


def fetch_first_listing_id() -> int:
    try:
        with urllib.request.urlopen(f"{API_URL}/listings", timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            items = data.get("listings") or data.get("data") or (data if isinstance(data, list) else [])
            if items and isinstance(items[0], dict) and "id" in items[0]:
                return int(items[0]["id"])
    except Exception:
        pass
    return 1


def record_chapter(name: str, fn) -> Path:
    chapter_dir = RAW_DIR / name
    if chapter_dir.exists():
        shutil.rmtree(chapter_dir)
    chapter_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n=== Recording chapter: {name} ===")
    errors: list[str] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            device_scale_factor=1,
            record_video_dir=str(chapter_dir),
            record_video_size={"width": 1920, "height": 1080},
        )
        context.add_init_script(CURSOR_INIT_JS)
        page = context.new_page()
        page.on("pageerror", lambda err: errors.append(f"pageerror: {err}"))

        try:
            # Start cursor gently near center
            page.mouse.move(960, 540)
            fn(page)
        finally:
            video_path = Path(page.video.path()) if page.video else None
            context.close()
            browser.close()

    if errors:
        print(f"  [warn] {len(errors)} pageerror(s) in {name}: {errors[:3]}")

    if video_path and video_path.exists():
        target = RAW_DIR / f"{name}.webm"
        shutil.move(str(video_path), str(target))
        shutil.rmtree(chapter_dir, ignore_errors=True)
        print(f"  [ok] saved {target.name} ({target.stat().st_size // 1024} KB)")
        return target

    raise RuntimeError(f"Video file not created for chapter {name}")


def chapter_01_guest_and_auth(page: Page) -> None:
    listing_id = fetch_first_listing_id()
    nav_click_or_goto(page, "/", pause_ms=1200, scroll=True)
    nav_click_or_goto(page, "/for-landlords", selector='header a[href="/for-landlords"], nav a[href="/for-landlords"]', pause_ms=1050, scroll=True)
    nav_click_or_goto(page, "/find-a-room", selector='header a[href="/find-a-room"], nav a[href="/find-a-room"]', pause_ms=1100, scroll=False)

    search_input = page.locator('input[placeholder*="Search" i], input[type="search"]')
    if search_input.count() > 0:
        type_smooth(page, search_input, "Sampaloc", delay_ms=42)
        page.wait_for_timeout(850)
    smooth_glide_page(page, px_per_sec=440.0)

    # Click first listing card if present, else direct route
    room_card = page.locator('a[href^="/rooms/"]').first
    if room_card.count() > 0 and room_card.is_visible():
        move_and_click(page, room_card, pause_after_ms=1100)
        smooth_glide_page(page, px_per_sec=440.0)
    else:
        nav_click_or_goto(page, f"/rooms/{listing_id}", pause_ms=1100, scroll=True)

    nav_click_or_goto(page, "/maps", selector='a[href="/maps"]', pause_ms=1600, scroll=False)
    nav_click_or_goto(page, "/haven-ai", selector='header a[href="/haven-ai"], nav a[href="/haven-ai"]', pause_ms=1100, scroll=False)
    ai_input = page.locator('textarea, input[type="text"]').first
    if ai_input.count() > 0:
        type_smooth(page, ai_input, "Quiet boarding house near UST under 4000 with WiFi", delay_ms=30)
        page.wait_for_timeout(600)

    nav_click_or_goto(page, "/legal/terms-of-service", pause_ms=650, scroll=True)
    nav_click_or_goto(page, "/auth/choose", selector='a[href="/auth/choose"]', pause_ms=900, scroll=False)
    nav_click_or_goto(page, "/auth/signup", selector='a[href="/auth/signup"]', pause_ms=850, scroll=False)
    nav_click_or_goto(page, "/auth/forgot-password", pause_ms=750, scroll=False)

    # Landlord authentication: sign-up flow
    nav_click_or_goto(page, "/auth/signup/landlord", pause_ms=900, scroll=False)
    type_smooth(page, page.locator('#firstName, input[name="firstName"]'), "Marco", delay_ms=28)
    type_smooth(page, page.locator('#lastName, input[name="lastName"]'), "Santos", delay_ms=28)
    type_smooth(page, page.locator('#email, input[type="email"]'), "marco.demo.landlord@haven.demo", delay_ms=24)
    pw_inputs = page.locator('input[type="password"]')
    if pw_inputs.count() >= 2:
        type_smooth(page, pw_inputs.nth(0), DEMO_PASSWORD, delay_ms=24)
        type_smooth(page, pw_inputs.nth(1), DEMO_PASSWORD, delay_ms=24)
    smooth_scroll_to(page, 460, 900)
    house_name = page.locator('#boardingHouseName, input[name="boardingHouseName"]')
    if house_name.count() > 0:
        type_smooth(page, house_name, "Maple Leaf Boarding House", delay_ms=26)
    submit_btn = page.locator('button[type="submit"]')
    if submit_btn.count() > 0:
        move_and_click(page, submit_btn, pause_after_ms=1500)

    nav_click_or_goto(page, "/auth/login", pause_ms=850, scroll=False)


def chapter_02_boarder_pre_tenancy(page: Page) -> None:
    listing_id = fetch_first_listing_id()
    login_as(page, "new.boarder@haven.demo")
    nav_click_or_goto(page, "/boarder/find-a-room", selector='aside a[href="/boarder/find-a-room"]', pause_ms=1050, scroll=True)
    nav_click_or_goto(page, f"/boarder/find-a-room/{listing_id}", pause_ms=1050, scroll=True)
    nav_click_or_goto(page, f"/boarder/find-a-room/{listing_id}/tour", pause_ms=950, scroll=True)
    nav_click_or_goto(page, f"/boarder/find-a-room/{listing_id}/apply", pause_ms=950, scroll=False)

    msg_box = page.locator("textarea").first
    if msg_box.count() > 0:
        type_smooth(page, msg_box, "Hi! I would love to apply for a room starting next month. Quiet student, non-smoker.", delay_ms=26)
        submit_btn = page.locator('button[type="submit"]')
        if submit_btn.count() > 0:
            move_and_click(page, submit_btn, pause_after_ms=1350)

    nav_click_or_goto(page, "/boarder/applications", selector='aside a[href="/boarder/applications"]', pause_ms=1050, scroll=True)
    nav_click_or_goto(page, "/boarder/applications/settings", pause_ms=900, scroll=True)
    nav_click_or_goto(page, "/boarder/settings", selector='aside a[href="/boarder/settings"]', pause_ms=950, scroll=True)


def chapter_03_boarder_tenancy(page: Page) -> None:
    login_as(page, "confirmed.boarder@haven.demo")
    nav_click_or_goto(page, "/boarder", selector='aside a[href="/boarder"]', pause_ms=1200, scroll=True)
    nav_click_or_goto(page, "/boarder/tenancy", selector='aside a[href="/boarder/tenancy"]', pause_ms=1100, scroll=True)
    nav_click_or_goto(page, "/boarder/payments", selector='aside a[href="/boarder/payments"]', pause_ms=1050, scroll=True)
    nav_click_or_goto(page, "/boarder/payments/pay", selector='a[href="/boarder/payments/pay"]', pause_ms=1000, scroll=False)
    # Demonstrate receipt file upload
    upload_file_with_cursor(page, 0)
    smooth_glide_page(page, px_per_sec=420.0)

    nav_click_or_goto(page, "/boarder/messages", selector='aside a[href="/boarder/messages"]', pause_ms=1050, scroll=False)
    thread_link = page.locator('a[href*="/boarder/messages/"]').first
    if thread_link.count() > 0:
        move_and_click(page, thread_link, pause_after_ms=1000)
        reply_box = page.locator("textarea, input[placeholder*='message' i]").first
        if reply_box.count() > 0:
            type_smooth(page, reply_box, "Thanks Ms. Lina! Also confirming I will settle next month's rent via GCash.", delay_ms=26)
            send_btn = page.locator('button[type="submit"], button:has-text("Send")').first
            if send_btn.count() > 0:
                move_and_click(page, send_btn, pause_after_ms=900)

    nav_click_or_goto(page, "/boarder/announcements", selector='aside a[href="/boarder/announcements"]', pause_ms=1050, scroll=True)
    nav_click_or_goto(page, "/boarder/house-rules", selector='aside a[href="/boarder/house-rules"]', pause_ms=950, scroll=True)


def chapter_04_landlord(page: Page) -> None:
    # 1. Unverified landlord authentication + verification document file upload
    login_as(page, "pending.owner@haven.demo")
    nav_click_or_goto(page, "/landlord/verification", pause_ms=1050, scroll=False)
    upload_file_with_cursor(page, 0)
    smooth_glide_page(page, px_per_sec=420.0)

    # 2. Verified landlord authentication & full portal walkthrough
    login_as(page, "lina.santos@haven.demo")
    nav_click_or_goto(page, "/landlord", selector='aside a[href="/landlord"]', pause_ms=1200, scroll=True)
    nav_click_or_goto(page, "/landlord/properties", selector='aside a[href="/landlord/properties"]', pause_ms=1050, scroll=True)

    prop_link = page.locator('a[href*="/landlord/properties/"]').first
    if prop_link.count() > 0:
        move_and_click(page, prop_link, pause_after_ms=1050)
        smooth_glide_page(page, px_per_sec=440.0)

    # Listing creation + property photo file upload
    nav_click_or_goto(page, "/landlord/listings/create", selector='a[href="/landlord/listings/create"]', pause_ms=1050, scroll=False)
    upload_file_with_cursor(page, 0)
    smooth_glide_page(page, px_per_sec=440.0)

    nav_click_or_goto(page, "/landlord/maps", selector='aside a[href="/landlord/maps"]', pause_ms=1400, scroll=False)
    nav_click_or_goto(page, "/landlord/invitations", selector='aside a[href="/landlord/invitations"]', pause_ms=900, scroll=True)
    nav_click_or_goto(page, "/landlord/applications", selector='aside a[href="/landlord/applications"]', pause_ms=1100, scroll=True)
    nav_click_or_goto(page, "/landlord/boarders", selector='aside a[href="/landlord/boarders"]', pause_ms=1050, scroll=True)
    nav_click_or_goto(page, "/landlord/payments", selector='aside a[href="/landlord/payments"]', pause_ms=1050, scroll=True)
    nav_click_or_goto(page, "/landlord/payments/record", pause_ms=950, scroll=True)
    nav_click_or_goto(page, "/landlord/messages", selector='aside a[href="/landlord/messages"]', pause_ms=1050, scroll=False)
    nav_click_or_goto(page, "/landlord/announcements", selector='aside a[href="/landlord/announcements"]', pause_ms=1050, scroll=True)
    nav_click_or_goto(page, "/landlord/calendar", selector='aside a[href="/landlord/calendar"]', pause_ms=1050, scroll=True)
    nav_click_or_goto(page, "/landlord/activity", selector='aside a[href="/landlord/activity"]', pause_ms=950, scroll=True)
    nav_click_or_goto(page, "/landlord/pricing", selector='aside a[href="/landlord/pricing"]', pause_ms=950, scroll=True)
    nav_click_or_goto(page, "/landlord/maintenance", pause_ms=900, scroll=True)
    nav_click_or_goto(page, "/landlord/renewals", pause_ms=900, scroll=True)
    nav_click_or_goto(page, "/landlord/settings", selector='aside a[href="/landlord/settings"]', pause_ms=950, scroll=True)


def chapter_05_admin(page: Page) -> None:
    login_as(page, "admin@haven.demo")
    tabs = [
        ("overview", "Overview"),
        ("users", "Users"),
        ("properties", "Properties"),
        ("applications", "Applications"),
        ("landlords", "Landlords"),
        ("property-access", "Property Access"),
        ("audit", "Audit log"),
        ("settings", "Settings"),
    ]
    for tab, label in tabs:
        nav_click_or_goto(
            page,
            f"/admin?tab={tab}",
            selector=f'aside a:has-text("{label}")',
            pause_ms=1050,
            scroll=True,
        )


def main() -> int:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    chapters = [
        ("01-guest-and-auth", chapter_01_guest_and_auth),
        ("02-boarder-pre-tenancy", chapter_02_boarder_pre_tenancy),
        ("03-boarder-tenancy", chapter_03_boarder_tenancy),
        ("04-landlord", chapter_04_landlord),
        ("05-admin", chapter_05_admin),
    ]
    for name, fn in chapters:
        record_chapter(name, fn)
    print("\nAll 5 chapters recorded successfully.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
