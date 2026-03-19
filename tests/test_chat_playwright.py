"""
Playwright test: AstuGuía chat flow
Tests the wizard + chat with 3 questions
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright, Page

SCREENSHOTS_DIR = Path("/home/erpnext/.services/app_asturiasMobile/tests/screenshots")
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

BASE_URL = "http://localhost:8002"


async def wait_for_response(page: Page, timeout=90000):
    """Wait until the typing indicator disappears and a response appears."""
    try:
        await page.wait_for_selector(".gchat-dots", state="visible", timeout=8000)
        print("  [typing indicator appeared]")
    except Exception:
        print("  [typing indicator not seen]")
    try:
        await page.wait_for_selector(".gchat-dots", state="hidden", timeout=timeout)
        print("  [typing indicator gone — response complete]")
    except Exception:
        print("  [timeout waiting for response to complete]")
    await page.wait_for_timeout(1000)


async def wait_for_typewriter(page: Page):
    """Wait for the typewriter animation to finish (character stops talking)."""
    try:
        await page.wait_for_function(
            "!document.getElementById('guia-character')?.classList.contains('talking')",
            timeout=10000
        )
    except Exception:
        pass
    await page.wait_for_timeout(300)


async def get_last_bot_response(page: Page) -> str:
    """Extract the last bot message from the chat."""
    return await page.evaluate("""
        (() => {
            const msgs = document.querySelectorAll('.gchat-msg-bot');
            if (!msgs.length) return 'no bot messages found';
            return msgs[msgs.length - 1].innerText;
        })()
    """)


async def run_test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"]
        )
        context = await browser.new_context(
            viewport={"width": 390, "height": 844},
            user_agent="Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36"
        )
        page = await context.new_page()

        errors = []
        console_msgs = []
        page.on("console", lambda msg: console_msgs.append(f"[{msg.type}] {msg.text}"))
        page.on("console", lambda msg: errors.append(f"{msg.text}") if msg.type == "error" else None)
        page.on("pageerror", lambda err: errors.append(f"[pageerror] {err}"))

        # ── STEP 1: Load page ──────────────────────────────────────
        print("=" * 60)
        print("STEP 1: Opening http://localhost:8002")
        print("=" * 60)

        await page.goto(BASE_URL, timeout=30000)
        await page.wait_for_timeout(2000)
        await page.screenshot(path=str(SCREENSHOTS_DIR / "01_initial_load.png"))
        print(f"Page title: {await page.title()}")
        print("Screenshot 01_initial_load.png saved")

        # ── STEP 2: Dispatch book:fase3ready to skip animation ─────
        print("\n" + "=" * 60)
        print("STEP 2: Dispatching fase3ready (skip 3D animation)")
        print("=" * 60)

        await page.evaluate("window.dispatchEvent(new CustomEvent('book:fase3ready'))")
        # Wait for startGuia() setTimeout 800ms + init
        await page.wait_for_timeout(2000)

        overlay_state = await page.evaluate("""
            (() => {
                const el = document.getElementById('guia-overlay');
                if (!el) return 'not found';
                return { hidden: el.hidden, className: el.className };
            })()
        """)
        print(f"Overlay state: {overlay_state}")
        await page.screenshot(path=str(SCREENSHOTS_DIR / "02_fase3_dispatched.png"))
        print("Screenshot 02_fase3_dispatched.png saved")

        # ── STEP 3: Click character to open wizard ─────────────────
        print("\n" + "=" * 60)
        print("STEP 3: Clicking AstuGuía character")
        print("=" * 60)

        # Use JS click (element may not be visually rendered due to WebGL issues)
        await page.evaluate("document.getElementById('guia-character')?.click()")
        await page.wait_for_timeout(500)

        overlay_class = await page.evaluate("document.getElementById('guia-overlay')?.className || 'not found'")
        print(f"Overlay class: {overlay_class}")

        # Wait for typewriter to finish (step s0 text)
        print("Waiting for typewriter animation (s0 text ~3s)...")
        await wait_for_typewriter(page)
        await page.wait_for_timeout(500)

        dialog_text = await page.evaluate("document.getElementById('guia-text')?.textContent || 'not found'")
        print(f"Dialog text: {dialog_text}")

        await page.screenshot(path=str(SCREENSHOTS_DIR / "03_wizard_s0.png"))
        print("Screenshot 03_wizard_s0.png saved")

        # ── STEP 4: Enter name ─────────────────────────────────────
        print("\n" + "=" * 60)
        print("STEP 4: Entering name")
        print("=" * 60)

        # Name input is created dynamically with class 'guia-name-input' (no id)
        name_input_info = await page.evaluate("""
            (() => {
                const el = document.querySelector('.guia-name-input');
                if (!el) return 'not found';
                return { tagName: el.tagName, visible: el.offsetParent !== null, placeholder: el.placeholder };
            })()
        """)
        print(f"Name input: {name_input_info}")

        try:
            await page.wait_for_selector(".guia-name-input", timeout=8000)
            await page.fill(".guia-name-input", "Xuan")
            print("Filled name: Xuan")
            await page.wait_for_timeout(300)

            # Click the confirm button (class guia-btn inside guia-name-row)
            btn_clicked = await page.evaluate("""
                (() => {
                    const row = document.querySelector('.guia-name-row');
                    if (!row) return 'no guia-name-row';
                    const btn = row.querySelector('button, .guia-btn');
                    if (!btn) return 'no button in row';
                    btn.click();
                    return 'clicked: ' + btn.textContent;
                })()
            """)
            print(f"Name confirm: {btn_clicked}")

        except Exception as e:
            print(f"Name input handling error: {e}")
            # Fallback: check if we need to wait longer
            await page.wait_for_timeout(2000)
            name_found = await page.evaluate("!!document.querySelector('.guia-name-input')")
            print(f"Name input found after wait: {name_found}")

        # Wait for typewriter to respond with "¡Encantau de conocete Xuan!"
        print("Waiting for welcome typewriter...")
        await wait_for_typewriter(page)
        await page.wait_for_timeout(500)

        dialog_text = await page.evaluate("document.getElementById('guia-text')?.textContent || ''")
        print(f"Dialog after name: {dialog_text}")

        await page.screenshot(path=str(SCREENSHOTS_DIR / "04_after_name.png"))
        print("Screenshot 04_after_name.png saved")

        # ── STEP 5: Navigate through wizard ───────────────────────
        print("\n" + "=" * 60)
        print("STEP 5: Navigating wizard to reach result/chat")
        print("=" * 60)

        reached_chat = False

        for step_num in range(1, 10):
            await page.wait_for_timeout(500)

            overlay_class = await page.evaluate("document.getElementById('guia-overlay')?.className || ''")
            dialog_text = await page.evaluate("document.getElementById('guia-text')?.textContent || ''")
            print(f"\nStep {step_num} — overlay: '{overlay_class}'")
            print(f"  Dialog: {dialog_text[:100]}")

            # Check if chat mode
            if 'chat-mode' in overlay_class:
                print("  Chat mode active!")
                reached_chat = True
                break

            # Check for gchat-input
            input_visible = await page.evaluate("document.getElementById('gchat-input') ? true : false")
            if input_visible:
                print("  gchat-input found!")
                reached_chat = True
                break

            # Check for chat button
            chat_btn_info = await page.evaluate("""
                (() => {
                    const btn = document.getElementById('guia-chat-btn');
                    if (!btn) return null;
                    return { text: btn.textContent, visible: btn.offsetParent !== null };
                })()
            """)
            if chat_btn_info:
                print(f"  Chat btn: {chat_btn_info}")
                if chat_btn_info.get('visible'):
                    await page.evaluate("document.getElementById('guia-chat-btn').click()")
                    print("  Clicked #guia-chat-btn")
                    await page.wait_for_timeout(1000)
                    reached_chat = True
                    break

            # Get all buttons in choices
            btns = await page.evaluate("""
                (() => {
                    const choices = document.getElementById('guia-choices');
                    if (!choices) return [];
                    return Array.from(choices.querySelectorAll('button')).map(b => ({
                        text: b.textContent.substring(0, 50).trim(),
                        visible: b.offsetParent !== null
                    }));
                })()
            """)
            print(f"  Choices: {btns}")

            if not btns:
                # Try ¡Empezar aventura! or skip button
                empezar = await page.evaluate("""
                    (() => {
                        const all = document.querySelectorAll('#guia-choices button, #guia-choices .guia-btn');
                        const found = Array.from(all).find(b => b.offsetParent !== null);
                        if (found) { found.click(); return found.textContent.trim(); }
                        return null;
                    })()
                """)
                if empezar:
                    print(f"  Clicked (fallback): '{empezar}'")
                else:
                    print("  No buttons found — stopping")
                    break
            else:
                # Wait for typewriter if still running
                await wait_for_typewriter(page)

                # Click first visible button
                clicked = await page.evaluate("""
                    (() => {
                        const choices = document.getElementById('guia-choices');
                        if (!choices) return 'no choices';
                        const btn = Array.from(choices.querySelectorAll('button')).find(b => b.offsetParent !== null);
                        if (!btn) return 'no visible btn';
                        btn.click();
                        return 'clicked: ' + btn.textContent.trim().substring(0, 40);
                    })()
                """)
                print(f"  {clicked}")

            await page.screenshot(path=str(SCREENSHOTS_DIR / f"05_wizard_{step_num}.png"))
            await wait_for_typewriter(page)

        await page.screenshot(path=str(SCREENSHOTS_DIR / "06_pre_chat.png"))
        print(f"\nScreenshot 06_pre_chat.png saved (reached_chat={reached_chat})")

        # ── STEP 6: Ensure chat is open ────────────────────────────
        print("\n" + "=" * 60)
        print("STEP 6: Verifying/opening chat")
        print("=" * 60)

        # Final check on all chat-related elements
        chat_info = await page.evaluate("""
            (() => {
                const overlay = document.getElementById('guia-overlay');
                const panel = document.getElementById('guia-chat-panel');
                const input = document.getElementById('gchat-input');
                const chatBtn = document.getElementById('guia-chat-btn');
                return {
                    overlayClass: overlay ? overlay.className : 'n/a',
                    panelDisplay: panel ? window.getComputedStyle(panel).display : 'n/a',
                    inputExists: !!input,
                    chatBtnText: chatBtn ? chatBtn.textContent.trim() : 'n/a',
                    chatBtnVisible: chatBtn ? chatBtn.offsetParent !== null : false
                };
            })()
        """)
        print(f"Chat info: {chat_info}")

        # If gchat-input doesn't exist, force open chat via JS calling activateChat
        input_exists = await page.evaluate("!!document.getElementById('gchat-input')")
        if not input_exists:
            print("gchat-input doesn't exist in DOM — calling activateChat...")
            # Try to trigger chat opening via any means
            # First try clicking the chat button if visible
            clicked_chat = await page.evaluate("""
                (() => {
                    const btn = document.getElementById('guia-chat-btn');
                    if (btn && btn.offsetParent) { btn.click(); return 'chat-btn'; }
                    // Try character click to toggle
                    const char = document.getElementById('guia-character');
                    if (char) { char.click(); return 'char'; }
                    return 'nothing';
                })()
            """)
            print(f"Tried: {clicked_chat}")
            await page.wait_for_timeout(1500)

            # Check again
            input_exists = await page.evaluate("!!document.getElementById('gchat-input')")
            print(f"gchat-input exists after retry: {input_exists}")

        if not input_exists:
            print("Still no gchat-input — dumping guia-overlay innerHTML for debug:")
            overlay_html = await page.evaluate("""
                document.getElementById('guia-overlay')?.innerHTML.substring(0, 2000) || 'not found'
            """)
            print(f"Overlay HTML:\n{overlay_html}")

        # ── STEP 7: Send 3 questions ───────────────────────────────
        print("\n" + "=" * 60)
        print("STEP 7: Sending 3 questions")
        print("=" * 60)

        questions = [
            "¿Qué restaurantes hay en Llanes?",
            "¿Dónde puedo comer cocina asturiana en la costa?",
            "¿Qué rutas de senderismo hay en Gijón?"
        ]

        responses = []

        for q_idx, question in enumerate(questions, 1):
            print(f"\n{'─'*60}")
            print(f"Question {q_idx}/{len(questions)}: {question}")
            print("─" * 60)

            # Wait for input to be visible
            try:
                await page.wait_for_selector("#gchat-input", state="visible", timeout=5000)
            except Exception:
                input_info = await page.evaluate("""
                    (() => {
                        const el = document.getElementById('gchat-input');
                        if (!el) return 'not found in DOM';
                        return {
                            display: window.getComputedStyle(el).display,
                            visibility: window.getComputedStyle(el).visibility,
                            offsetParent: el.offsetParent !== null
                        };
                    })()
                """)
                print(f"  gchat-input state: {input_info}")

            # Fill and send via JS (more reliable in headless)
            sent = await page.evaluate(f"""
                (() => {{
                    const input = document.getElementById('gchat-input');
                    if (!input) return 'no input';
                    // Set value
                    input.value = {repr(question)};
                    // Trigger input event so React/etc knows about it
                    input.dispatchEvent(new Event('input', {{bubbles: true}}));
                    // Try send button
                    const sendBtn = document.getElementById('gchat-send');
                    if (sendBtn) {{ sendBtn.click(); return 'sent via btn'; }}
                    // Try Enter key
                    input.dispatchEvent(new KeyboardEvent('keydown', {{key: 'Enter', bubbles: true}}));
                    return 'sent via keydown';
                }})()
            """)
            print(f"  Send result: {sent}")

            if sent == 'no input':
                print("  ERROR: no input element found, skipping question")
                continue

            # Wait for response
            print("  Waiting for API response...")
            await wait_for_response(page, timeout=90000)

            # Screenshot
            shot_path = str(SCREENSHOTS_DIR / f"08_q{q_idx}_response.png")
            await page.screenshot(path=shot_path)
            print(f"  Screenshot {Path(shot_path).name} saved")

            # Get response text
            resp = await get_last_bot_response(page)
            responses.append((question, resp))
            print(f"\n  RESPONSE:\n{resp}\n")

            await page.wait_for_timeout(2000)

        # ── FINAL REPORT ────────────────────────────────────────────
        print("\n" + "=" * 60)
        print("FINAL REPORT")
        print("=" * 60)

        await page.screenshot(path=str(SCREENSHOTS_DIR / "09_final_state.png"))
        print("Screenshot 09_final_state.png saved")

        print("\n=== RESPONSES SUMMARY ===")
        for i, (q, r) in enumerate(responses, 1):
            print(f"\n[Q{i}] {q}")
            print(f"[A{i}]\n{r}")

        if not responses:
            print("No responses captured!")

        # Analysis
        print("\n=== ANALYSIS ===")
        all_text = " ".join(r for _, r in responses).lower()

        asturian_markers = ["ye", "paisanu", "neños", "buen provecho", "sidra", "conceyu",
                            "facer", "les", "guapi", "xente", "asturias", "asturia"]
        found_asturian = [w for w in asturian_markers if w in all_text]
        print(f"Asturian personality markers: {found_asturian}")

        data_markers = ["restaurante", "bar", "café", "km", "ruta", "senderismo", "llanes",
                        "gijón", "oviedo", "avilés", "concejo", "nombre", "calle", "teléfono"]
        found_data = [w for w in data_markers if w in all_text]
        print(f"Real data indicators: {found_data}")

        if errors:
            print(f"\n=== JS ERRORS ({len(errors)}) ===")
            for e in errors[:10]:
                print(f"  {e[:200]}")

        relevant = [m for m in console_msgs if any(k in m.lower() for k in
                    ['error', 'guia', 'chat', 'api', 'fetch', '403', '500', 'notebook', 'conv'])]
        if relevant:
            print(f"\n=== RELEVANT CONSOLE ({len(relevant)}) ===")
            for m in relevant[:20]:
                print(f"  {m[:200]}")

        await browser.close()
        print("\nTest complete!")


if __name__ == "__main__":
    asyncio.run(run_test())
