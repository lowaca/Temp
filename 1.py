import os
import sys
import io
import json
import time
import asyncio
import logging
import argparse
import requests
from playwright.async_api import async_playwright

# Rich UI Library Components
from rich.console import Console
from rich.live import Live
from rich.table import Table
from rich.progress import Progress, BarColumn, TextColumn, TimeElapsedColumn
from rich.panel import Panel
from rich.layout import Layout

# Force UTF-8 on Windows
if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# Setup paths (Files in the SAME directory as this script)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
COOKIE_FILE = os.path.join(BASE_DIR, "cookie.json")
TOPICS_FILE = os.path.join(BASE_DIR, "topics.json")

BASE_URL = "https://mujib.chorcha.net"
EXAM_PAGE_PREFIX = "https://chorcha.net/exam/"
LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "exam_automation.log")

# Setup Console and Logger
console = Console()
logging.basicConfig(
    filename=LOG_FILE,
    filemode="a",
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.INFO,
    encoding="utf-8"
)

# Shared Live Reporting Data Structure
global_results = {}  # Format: {exam_id: {"topic": ..., "progress": 0, "total": 0, "status": "Pending", "time": 0.0}}

def load_config_files():
    if not os.path.exists(COOKIE_FILE) or not os.path.exists(TOPICS_FILE):
        raise FileNotFoundError("cookie.json বা topics.json ফাইলটি খুঁজে পাওয়া যায়নি!")
    
    with open(COOKIE_FILE, "r", encoding="utf-8") as f:
        cookies = json.load(f)
    with open(TOPICS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
        topics = data if isinstance(data, list) else data.get("topics", [])
        
    return cookies, topics

def build_cookie_string(cookies):
    return "; ".join([f"{c['name']}={c['value']}" for c in cookies])

def format_playwright_cookies(cookies):
    pw_cookies = []
    for c in cookies:
        pw_c = {
            "name": c["name"],
            "value": str(c["value"]),
            "domain": c["domain"],
            "path": c.get("path", "/"),
            "httpOnly": bool(c.get("httpOnly", False)),
            "secure": bool(c.get("secure", False))
        }
        if "expirationDate" in c:
            pw_c["expires"] = c["expirationDate"]
        same_site = c.get("sameSite")
        same_site = same_site.lower() if same_site else "lax"
        pw_c["sameSite"] = same_site.capitalize() if same_site in ["lax", "strict", "none"] else "Lax"
        pw_cookies.append(pw_c)
    return pw_cookies

def create_exam(topics, cookie_string):
    payload = {
        "questionType": "all",
        "duration": 20,
        "negativeMarking": "false",
        "subNQ": ["200"],
        "quesStandard": ["varsity", "hsc"],
        "type": "all",
        "_types": "MCQ",
        "subjects": ["bang"],
        "topics": topics
    }
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Cookie": cookie_string
    }
    res = requests.post(f"{BASE_URL}/exam/new", json=payload, headers=headers, timeout=15)
    res.raise_for_status()
    exam_id = res.json().get("data", {}).get("exam", {}).get("_id")
    if not exam_id:
        raise ValueError("API থেকে Exam ID পাওয়া যায়নি।")
    return exam_id

# Live UI Generator Function
def generate_dashboard():
    table = Table(title="⚡ Chorcha.net Live Exam Automation Dashboard", expand=True)
    table.add_column("Exam ID", style="cyan", no_wrap=True)
    table.add_column("Status", style="bold")
    table.add_column("Progress (Questions Answered)", width=40)
    table.add_column("Time Taken", style="magenta")

    for exam_id, info in global_results.items():
        status = info["status"]
        if status == "Running":
            status_str = "[yellow]⏳ Running[/yellow]"
        elif status == "Success":
            status_str = "[green]✅ Success[/green]"
        elif status == "Failed":
            status_str = "[red]❌ Failed[/red]"
        else:
            status_str = "[gray]💤 Pending[/gray]"

        # Progress Calculation
        total = info["total"]
        current = info["progress"]
        if total > 0:
            percentage = int((current / total) * 100)
            progress_bar = f"[{'■' * (percentage // 5)}{' ' * (20 - (percentage // 5))}] {current}/{total} ({percentage}%)"
        else:
            progress_bar = "Initializing..."

        table.add_row(
            exam_id,
            status_str,
            progress_bar,
            f"{info['time']:.2f}s" if info["time"] > 0 else "0.00s"
        )
    return table

async def automate_playwright_exam(context, exam_id):
    url = f"{EXAM_PAGE_PREFIX}{exam_id}"
    global_results[exam_id]["status"] = "Running"
    logging.info(f"Exam Started: {exam_id}")
    
    start_time = time.time()
    page = await context.new_page()
    
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=15000)
        
        # Wait for questions to render
        await page.wait_for_selector(".pb-20 > .space-y-4 > div", timeout=15000)
        question_cards = await page.query_selector_all(".pb-20 > .space-y-4 > div")
        q_count = len(question_cards)
        
        global_results[exam_id]["total"] = q_count
        logging.info(f"Exam ID {exam_id} has {q_count} questions.")

        # Solve Questions
        for idx, card in enumerate(question_cards):
            options = await card.query_selector_all("button:not(.icon-button)")
            if options:
                try:
                    await card.scroll_into_view_if_needed()
                    await options[0].click(force=True)
                except Exception:
                    pass
            
            # Live reporting data update
            global_results[exam_id]["progress"] = idx + 1
            global_results[exam_id]["time"] = time.time() - start_time

        # Submit Workflow
        submit_button = page.locator('button[data-event="submit_btn_mock_exam"]')
        await submit_button.scroll_into_view_if_needed()
        
        await page.wait_for_function(
            '() => { const btn = document.querySelector(\'button[data-event="submit_btn_mock_exam"]\'); return btn && !btn.disabled; }',
            timeout=10000
        )
        await submit_button.click()
        
        modal_button = page.locator('button:has-text("এগিয়ে যাও"), button:has-text("Go ahead")')
        await modal_button.wait_for(state="visible", timeout=10000)
        await modal_button.click()
        
        await asyncio.sleep(1) # Extra cooldown
        
        global_results[exam_id]["status"] = "Success"
        global_results[exam_id]["time"] = time.time() - start_time
        logging.info(f"Exam Successfully Submitted: {exam_id}")
        await page.close()
        return True

    except Exception as e:
        global_results[exam_id]["status"] = "Failed"
        logging.error(f"Error in Exam {exam_id}: {str(e)}")
        try:
            await page.close()
        except:
            pass
        return False

async def main():
    parser = argparse.ArgumentParser(description="Chorcha.net Pro Live Automator")
    parser.add_argument("-m", "--mode", type=str, choices=["1", "2", "3"], help="Execution mode")
    parser.add_argument("-c", "--concurrency", type=int, default=4, help="Max parallel tabs")
    args = parser.parse_args()

    console.print(Panel("[bold magenta]🚀 Chorcha.net Async Expert Automator v2.0[/bold magenta]\n[dim]Designed for High-Speed Live Tracking[/dim]", expand=False))

    try:
        cookies, topics = load_config_files()
        cookie_string = build_cookie_string(cookies)
        pw_cookies = format_playwright_cookies(cookies)
        
        choice = args.mode
        if not choice:
            console.print("\n[bold yellow]Select Mode:[/bold yellow]\n[1] Single Combined Exam\n[2] Parallel Individual Exams\n[3] Demo Single Exam")
            choice = input("Enter choice (1-3, default 1): ").strip() or "1"

        exam_ids = []
        console.print("[blue]⚙️ Creating Exam(s) via API...[/blue]")

        if choice == "1":
            exam_ids.append(create_exam(topics, cookie_string))
        elif choice == "2":
            for t in topics:
                try:
                    exam_ids.append(create_exam([t], cookie_string))
                except Exception as e:
                    console.print(f"[red]Failed to create exam for topic {t}: {e}[/red]")
        elif choice == "3":
            exam_ids.append(create_exam([topics[0]], cookie_string))
        else:
            console.print("[red]Invalid Choice![/red]")
            sys.exit(1)

        # Pre-populate Global Results Directory for UI
        for eid in exam_ids:
            global_results[eid] = {"total": 0, "progress": 0, "status": "Pending", "time": 0.0}

        console.print(f"[green]✔ Successfully Created {len(exam_ids)} Exam(s). Starting Browser Automation...[/green]\n")

        # Playwright Execution with Live Dashboard Rendering
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True, args=['--start-maximized'])
            context = await browser.new_context(no_viewport=True)
            await context.add_cookies(pw_cookies)

            sem = asyncio.Semaphore(args.concurrency)

            async def worker(eid):
                async with sem:
                    await automate_playwright_exam(context, eid)

            worker_tasks = [asyncio.create_task(worker(eid)) for eid in exam_ids]

            # HERE IS THE MAGIC: The Live Dashboard Engine
            with Live(generate_dashboard(), refresh_per_second=4) as live:
                while not all(t.done() for t in worker_tasks):
                    live.update(generate_dashboard())
                    await asyncio.sleep(0.25)
                
                # Await all tasks to propagate exceptions/results
                await asyncio.gather(*worker_tasks)
                live.update(generate_dashboard()) # Final paint

            await browser.close()
            
        console.print("\n[bold green]🏁 Automation Task Completed. Check logs for details.[/bold green]\n")

    except Exception as err:
        console.print(f"[bold red]Fatal Error: {err}[/bold red]")
        logging.critical(f"Fatal Crash: {str(err)}")
        sys.exit(1)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        console.print("\n[bold red]🛑 ব্যবহারকারী দ্বারা অটোমেশন বন্ধ করা হয়েছে।[/bold red]\n")
        sys.exit(0)