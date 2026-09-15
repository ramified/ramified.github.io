$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8765
$url = "http://127.0.0.1:$port/math_workspace.html"
$existing = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if (-not $existing) {
  $python = Get-Command py -ErrorAction SilentlyContinue
  if (-not $python) { $python = Get-Command python -ErrorAction SilentlyContinue }
  if (-not $python) { throw 'Python is required. Install Python or run: python -m http.server 8765' }
  Start-Process -FilePath $python.Source -ArgumentList @('-m','http.server',$port,'--bind','127.0.0.1') -WorkingDirectory $root -WindowStyle Hidden | Out-Null
  Start-Sleep -Milliseconds 500
}
Start-Process $url
