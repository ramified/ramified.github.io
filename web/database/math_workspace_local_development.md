# Fast local workspace testing

Double-clicking `math_workspace.html` opens it with the `file://` protocol. Browsers block ES module imports and module Web Workers from that protocol, so the workspace cannot initialize reliably that way.

For one-click testing on Windows, double-click `open_math_workspace.cmd`. It starts a local server on `127.0.0.1:8765` when needed and opens `math_workspace.html`. The server reads only this directory; nothing is uploaded. The equivalent PowerShell launcher is `open_math_workspace.ps1`.

If PowerShell script execution is restricted, run this once from PowerShell instead:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Then keep `http://127.0.0.1:8765/math_workspace.html` open while editing. Refreshing the page picks up changes.
