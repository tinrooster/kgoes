# EasySchematic — Roadmap & release notes

**Last reviewed:** 2026-05-27

This file tracks rack/print/layout UX shipped in the KGO-ES / trackIT fork. Upstream numbering and trackIT sync are documented in trackIT at `docs/plant-easyschematic-numbering.md`.

---

## Shipped (Rack elevation & face-plate · 2026-05)

### Rack metadata & device editor

- **`rackHeightU`**, **`mountingClass`** (`rack` | `shelf` | `throwdown` | `zero-u`) on device data with migration in `rackMount.ts`.
- **Device editor — Rack elevation** section: rack U, mounting type, optional sync of height (mm) from rack U.
- **Apply rack metadata** dialog: *this device* vs *all instances*; “all” also updates **project definition default** (`deviceDefinitionRackMetadata` in schematic store).
- Rack view: U badges, mounting labels, sidebar filters.

### Face-plate layout editor

- **Dual panels** when rear ports exist: **Stacked** (default) or **Side by side**; click a panel to focus.
- **Align / distribute** toolbar (Untitled UI-style icons); **F9** snap; arrow-key nudge (grid when snap on, ~2 px when off).
- **AutoCAD-style marquee:** drag **right** → window (blue, fully inside); drag **left** → crossing (green dashed, port **center** inside box). Shared logic in `src/selectionBoxUtils.ts`.
- **Marquee rendering:** `vectorEffect="non-scaling-stroke"` (~2 px on screen). On blue face-plates, **5 px white halo** + light `drop-shadow` so the window box stays visible (`MARQUEE_FACE_PLATE_HALO_PX`).
- **Initial zoom:** `fitZoomToCanvas()` caps at `zoom ≤ 1` (viewBox width = `svgW/zoom`; values > 1 magnify). `ResizeObserver` fits once the modal canvas has size; **Reset view** restores fit.
- **Persistence:** per-device layout plus **`facePlateDefinitionLayouts`** for definition defaults; apply-all updates instances + default.
- **Apply face-plate layout** dialog: same scope options as rack metadata.

### Schematic & print sheet

- Schematic: directional selection classes `selection-window` / `selection-crossing` in `index.css` (2 px border + 1 px white outline).
- **Print View** tab label (legacy “Sheet N” display names mapped via `printPageLabels.ts`).
- Rack page tab: **Rack Elevations** for new pages.
- Print sheet: align/distribute, marquee overlay, shared layout helpers (`printSheetLayoutUtils.ts`).

### Port linking (rack ↔ schematic)

- Rack cross-link annotations and port context actions (see `RackRenderer`, `PortContextMenu`).

---

## Implementation notes (for maintainers)

| Topic | Location |
|--------|----------|
| Marquee hit tests | `selectionBoxUtils.ts` — `hitTestItemRect`, `hitTestPoint` |
| Face-plate fit zoom | `FacePlateEditor.tsx` — `fitZoomToCanvas()`, `autoFitDoneRef` |
| Definition defaults on save | `store.ts` — `saveFacePlateLayout`, `saveDeviceRackMetadata` |
| Print tab display name | `printPageLabels.ts` — `printPageTabLabel()` |

---

## Planned / deferred

| Item | Notes |
|------|--------|
| Register import from schematic (trackIT) | Numbers in `schematic_json` only until publish/reconcile |
| VJF template polish | Grid generator in `vjfLayout.ts`; more card templates as needed |
| Rack drag-and-drop layout | Long-term trackIT roadmap item — interactive rack diagram |
