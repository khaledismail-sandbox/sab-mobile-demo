# SAB Mobile — Amplitude Demo App

A phone-framed static web app that replicates SAB Mobile (Saudi Awwal Bank's retail
banking app), instrumented end-to-end with Amplitude (Analytics, Session Replay,
frustration autocapture, Guides & Surveys). Pure static files — no build step, no
server, no npm install.

## The story

Login with the release toggle set to **v8.4.0 — New release** and every transfer ends
on a broken error screen (`Transfer Error Screen Viewed`, a dead **Contact Support**
button that collects `[Amplitude] Dead Click` / `[Amplitude] Rage Click`, and
`Transfer Abandoned` on exit). On **v8.1.7 — Stable** the same flow completes end to
end with revenue on `Transfer Completed`. The fixed treatment screen lives at
`/improved-transfer` — reachable only by typing the URL, fires no events.

## Publish to GitHub Pages (two commands)

From inside this folder:

```bash
# 1. Create the repo and push (requires the GitHub CLI, logged in)
git init -b main && git add -A && git commit -m "SAB Mobile Amplitude demo" \
  && gh repo create sab-mobile-demo --public --source=. --push

# 2. Enable GitHub Pages on the main branch
gh api -X POST "repos/{owner}/sab-mobile-demo/pages" \
  -f "source[branch]=main" -f "source[path]=/"
```

The app goes live at `https://<your-username>.github.io/sab-mobile-demo/` a minute or
two later. Deep links and refreshes on inner routes (e.g. `/transfer/details`) work on
Pages via the `404.html` SPA redirect — no configuration needed, any repo name works.

## Run locally

Any static server works for the happy path, e.g. `python3 -m http.server 8080`.
Note: refreshing on an inner route locally 404s with a plain static server (that SPA
fallback is what GitHub Pages' `404.html` provides in production).

## Demo cheat-sheet

- **User ID**: free text on the login screen (`usr_xxxxxxxxxx` pre-generated). Passed
  verbatim to `amplitude.setUserId(...)` — no PII.
- **Release toggle**: v8.1.7 = transfer works · v8.4.0 = broken error screen.
- **Fee waiver codes** on the transfer details form: `SABFREE` or `AWWAL0`.
- **Quick Transfer** tile on Home deep-links into the flow with a favourite
  pre-selected.
- Every tracked event is echoed to the browser console as `[SAB demo] track: …`.
- UTM parameters on the URL (`?utm_source=...`) override the default
  `sab_app / direct / brand_direct` identify values.
