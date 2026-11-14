# UI backlog

## P18 — Context menu at the cursor

Requested by the owner on 2026-11-14; planned alongside future proxy work.
Not implemented yet. A light interface change, not a broad visual redesign.

On right-click inside the player, show the existing context menu at the cursor
instead of its fixed anchor. The owner calls this a tooltip; the current
contextmenu handler opens `главноеменю`, so the implementation target is that menu.

Acceptance criteria:
- Anchor the menu at the right-click position with a small gap.
- Clamp/flip placement near edges so the whole menu stays inside the visible player.
- Work in windowed and fullscreen modes and after resizing/browser zoom.
- Recalculate placement on each right-click; preserve menu actions.
- Preserve usable placement for toolbar/keyboard opening, where no cursor event exists.
- Preserve existing close and focus behavior.

Code pointers: `addon/player.js` contextmenu handler on `глаз`, window manager
`м_Окно`, and `.главноеменю` positioning in `addon/player.css`.
