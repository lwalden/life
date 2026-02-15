life
====

Conways Game of Life in Javascript

This was originally a weekend project I did for my portfolio when I was in Code boot camp over a decade ago.

I picked it up again recently to practive Agentic Coding with Claude Code and Codex.


Local development
-----------------

Serve over HTTP (required for ES modules):

```powershell
cd D:\Source\life\life
.\serve-local.ps1
```

Optional custom port:

```powershell
.\serve-local.ps1 -Port 8080
```

Performance limits
------------------

`js/config.js` now separates practical and hard limits:

- Recommended max (for smooth interaction on typical hardware):
  - Canvas size: `1200`
  - Visible grid size: `160`
  - World size: `1000`
- Theoretical max (upper bound allowed by runtime clamps):
  - Canvas size: `2000`
  - Visible grid size: `240`
  - World size: `2000`

Defaults are capped to recommended values when fallbacks are used.

Minimap redraw throttling
-------------------------

Minimap redraw frequency can be throttled with:

- `CONFIG.MINIMAP_REDRAW_THROTTLE_MS` in `js/config.js`

Set to `0` (default) for immediate redraws, or a value like `16`/`33` to reduce redraw pressure during rapid pan/zoom interactions.
