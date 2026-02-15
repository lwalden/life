param(
    [ValidateRange(1, 65535)]
    [int]$Port = 5500,
    [string]$BindAddress = "127.0.0.1"
)

$ErrorActionPreference = "Stop"

Set-Location -Path $PSScriptRoot

if (-not (Test-Path -Path (Join-Path $PSScriptRoot "index.html"))) {
    throw "Expected index.html in $PSScriptRoot"
}

$pythonCommand = if (Get-Command py -ErrorAction SilentlyContinue) { "py" } elseif (Get-Command python -ErrorAction SilentlyContinue) { "python" } else { $null }

if (-not $pythonCommand) {
    throw "Python is required to run the local server. Install Python and retry."
}

Write-Host "Serving $PSScriptRoot at http://localhost:$Port/"
Write-Host "Press Ctrl+C to stop."

if ($pythonCommand -eq "py") {
    py -m http.server $Port --bind $BindAddress
} else {
    python -m http.server $Port --bind $BindAddress
}
