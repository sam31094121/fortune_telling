---
name: precision-arrow-review
description: "Conduct precise visual cross-checks for an open Codex right-side page before UI edits. Use when the user wants to inspect, point at, or verify a visible element together before changing it."
---

# Precision Arrow Review

Use this workflow for collaborative visual edits where the user wants to confirm the exact on-screen target before any change.

## Targeting workflow

1. Open or preserve the relevant page in Codex's right-side panel. If the user refers to a visible element, inspect the current panel state before asking them to repeat it. Before positioning the indicator, tell the user the most useful place to move or hold the page so both sides can cross-check the same target.
2. Navigate to the requested card or element, then place a temporary, high-contrast arrow or highlight on the exact target. Keep that indicator fixed and visible until the user explicitly confirms it or asks to reposition it. Do not edit the design yet.
3. State the target in plain language and wait for the user to confirm or refine the position. Treat each correction as a new targeting instruction.
4. After confirmation, remove the temporary indicator and make only the approved change. Keep the panel on the target while the user reviews it.

## Interaction rules

- Distinguish the card, component, label, and exact sub-element. Never infer that a request about text, an icon, or a seal applies to the whole card.
- Keep temporary arrows and highlights separate from product UI. Do not hide, move, or remove one while the user is using it to cross-check; remove it only after confirmation and before final verification.
- For repeated components, confirm whether the user wants a one-item experiment or a synchronized change across every instance before editing.
- Preserve user-requested mobile framing and avoid scrolling away from the confirmed target unless they ask.
- Treat the arrow's card area as the shared review boundary: the user may move the relevant card or sub-element into that area, then the assistant names and fixes the exact target before any edit.
- When the user points with their hand or describes a hand position on the shared right-side page, align the temporary arrow to that same visual position. If the reference is visible in Codex, capture fresh panel context first; otherwise ask only for the smallest positional clarification needed. Treat that arrow placement as the approval checkpoint before editing.
- When the user says they are talking to someone else or asks to pause, stop all navigation, inspection, edits, and unsolicited updates until a direct instruction resumes the workflow.

## Completion check

Before reporting completion, verify that the intended element changed, temporary targeting aids are gone, and unrelated visible content was not altered.
