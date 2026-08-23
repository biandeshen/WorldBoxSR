# Client layer

The client is a non-authoritative adapter over the deterministic simulation engine. It may render and inspect world state, but all simulation mutations must go through engine commands.

Current prototype controls:

- click: spawn one human through `applyCommand`;
- Shift-click: spawn ten humans;
- drag: pan the camera;
- mouse wheel: zoom around the pointer;
- right-click / Alt-click / touch tap: inspect the target tile; repeated inspection cycles through humans, settlements, and the tile at that coordinate.

Camera state and inspector selection live only in the client and are deliberately absent from world snapshots.
