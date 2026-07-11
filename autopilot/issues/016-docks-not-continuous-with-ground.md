# 016 — docks don't read continuous with the ground

- severity: medium (waterfront junctions are constant-view geometry on the
  harbor walk)
- evidence: owner playtest report, 2026-07-10 ("docks don't appear
  continuous with the rest of the ground"). No coords given — audit ALL
  dock↔shore junctions: the harbor star docks (packs/moorings.js) and the
  harbor-mouth finger docks by the Diversey apron.
- observed: where a dock meets land the junction reads discontinuous — a
  visible gap, height mismatch, or floating deck root instead of a flush
  landing.
- expected: every dock's landward root sits flush with the shore surface it
  meets — derive the deck y at the junction from the shore's own surface
  (coastQuery/tierAt or the apron height), close any daylight gap with the
  shore edge, add a small threshold/curb piece where grades genuinely
  differ. The owner's harbor-mouth photo
  (refs/diversey-corner/harbor-mouth-IMG_0399.jpeg) shows the real read:
  docks meet a continuous concrete apron at grade.
- route: task 038.
