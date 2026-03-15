---
name: agent-browser
description: Automate web browsers from the sandbox using the agent-browser CLI. Use when the user asks to browse a website, fill a form, scrape content, take screenshots, log into something, or interact with any web page.
---

# agent-browser

Headless browser automation CLI available inside the sandbox. Use it via the `bash` tool.

## Core Workflow

Every task follows the same loop:

```bash
# 1. Open a URL
agent-browser open https://example.com

# 2. Get a snapshot — compact accessibility tree with element refs
agent-browser snapshot -i

# 3. Interact using the refs from the snapshot
agent-browser click @e3
agent-browser fill @e5 "hello world"
agent-browser press @e5 Enter

# 4. Re-snapshot to see the new state, then continue
agent-browser snapshot -i
```

Always re-snapshot after any interaction — the DOM changes and old refs may be stale.

## Navigation

```bash
agent-browser open https://example.com        # navigate to URL
agent-browser back                            # browser back
agent-browser forward                         # browser forward
agent-browser reload                          # reload page
agent-browser wait 2000                       # wait 2000ms
agent-browser wait-for-nav                    # wait for navigation to finish
```

## Snapshot (reading the page)

```bash
agent-browser snapshot -i                     # compact accessibility tree (recommended)
agent-browser snapshot                        # full snapshot
```

Snapshot output example:
```
- heading "Sign in" [ref=e1]
- textbox "Email" [ref=e2]
- textbox "Password" [ref=e3]
- button "Sign in" [ref=e4]
- link "Forgot password?" [ref=e5]
```

Always use `snapshot -i` — it uses ~200-400 tokens vs ~3000-5000 for the full DOM.

## Interacting with elements

```bash
agent-browser click @e4                       # click by ref
agent-browser fill @e2 "user@example.com"     # fill input by ref
agent-browser press @e3 Tab                   # press key on element
agent-browser select @e6 "option-value"       # select dropdown option
agent-browser hover @e7                       # hover element
agent-browser check @e8                       # check checkbox
agent-browser uncheck @e8                     # uncheck checkbox
agent-browser focus @e2                       # focus element
```

## Screenshots

```bash
agent-browser screenshot /home/daytona/workspace/screenshot.png
```

Always save screenshots to the workspace. Then use `view_image` to show them to the user, or `share_file` to give a download link.

## JavaScript evaluation

```bash
agent-browser eval "document.title"
agent-browser eval "document.querySelector('h1').textContent"
```

## Sessions (isolated browser contexts)

Use sessions when you need multiple logged-in states or isolated contexts:

```bash
agent-browser open https://example.com --session my-session
agent-browser snapshot -i --session my-session
agent-browser close --session my-session     # close this session only
```

## Extracting data (scraping)

Combine snapshot + eval to extract structured data:

```bash
# Get page text content
agent-browser eval "document.body.innerText"

# Get structured data
agent-browser eval "JSON.stringify(Array.from(document.querySelectorAll('tr')).map(r => r.innerText))"

# Or use snapshot refs to navigate tables/lists
agent-browser snapshot -i
```

## Full example — log in and scrape

```bash
# Navigate to login page
agent-browser open https://example.com/login

# See what's on the page
agent-browser snapshot -i
# → textbox "Email" [ref=e1], textbox "Password" [ref=e2], button "Log in" [ref=e3]

# Fill and submit
agent-browser fill @e1 "user@example.com"
agent-browser fill @e2 "password123"
agent-browser click @e3
agent-browser wait-for-nav

# We're logged in — snapshot the dashboard
agent-browser snapshot -i

# Extract content
agent-browser eval "document.querySelector('.dashboard').innerText"

# Screenshot for user
agent-browser screenshot /home/daytona/workspace/dashboard.png
```

## Common patterns

### Wait for dynamic content to load
```bash
agent-browser wait 1500          # fixed wait
agent-browser wait-for-nav       # wait for navigation event
```

### Handle modals/popups
```bash
agent-browser snapshot -i        # snapshot will include modal elements
agent-browser click @e12         # close/dismiss by ref
```

### Scroll and find off-screen elements
```bash
agent-browser eval "window.scrollTo(0, document.body.scrollHeight)"
agent-browser snapshot -i        # re-snapshot after scroll
```

## When to use this skill

- User asks to visit a URL and report what's there
- User wants to fill out a web form
- User wants a screenshot of a web page
- User wants to log into a service (with credentials they provide)
- User wants to scrape/extract content from a website
- User wants to automate repetitive web interactions
- Checking live status of a site or dashboard

## Important notes

- Always re-snapshot after interactions — refs change when DOM updates
- Save screenshots to the workspace, then use `view_image` or `share_file`
- The browser daemon starts automatically on first use; no setup needed
- The Chrome binary is pre-installed in the sandbox — `agent-browser install` has already been run
