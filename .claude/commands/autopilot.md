Launch the Harbor Days autopilot control panel.

Run it DETACHED so it outlives this session (PowerShell):

```powershell
Start-Process node -ArgumentList "autopilot\gui.mjs" -WorkingDirectory "C:\Users\James.Friedman\Downloads\harbor-days-autopilot" -WindowStyle Hidden
```

It binds 127.0.0.1:4599 (auto-increments if busy) and opens the browser itself.
Tell the owner the URL (http://localhost:4599/) and what the panel does:
▶ Start / ⏸ Pause (graceful STOP sentinel, honored between iterations — the
current task always finishes first), the live milestone feed (mirrors the ntfy
topic), the queue state, and the feedback box — feedback notes land in
autopilot/feedback/ and every iteration session reads them at task start;
big asks become new queue tasks automatically.

Do not start the loop itself unless asked — the panel's Start button is the
owner's control.
