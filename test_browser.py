from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.on("console", lambda msg: print(f"Console ({msg.type}): {msg.text}"))
    page.on("pageerror", lambda err: print(f"Page Error: {err}"))
    try:
        page.goto('http://127.0.0.1:5173')
        page.wait_for_timeout(2000)
        page.screenshot(path='screenshot.png', full_page=True)
        with open('body.html', 'w', encoding='utf-8') as f:
            f.write(page.content())
    except Exception as e:
        print(f"Error navigating: {e}")
    browser.close()
