Take an in-game screenshot at the given spot and show me what's there.

$ARGUMENTS is `x z [yaw] [pitch] [dist]` (yaw defaults 0, pitch 0.15, dist 12).

Run `node tools/shot.mjs lookat "play=1&x=<x>&z=<z>&yaw=<yaw>&pitch=<pitch>&dist=<dist>" 2500`, READ the PNG, and describe what's in frame — flagging anything misplaced, clipping, floating, or off-style. Remember the camera sits at player-position minus (sin yaw, cos yaw)·dist and looks along +(sin yaw, cos yaw); ?dbg=1 can be added for the position HUD.
