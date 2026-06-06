/** KGO fork branding (formerly EasySchematic). */
/** PWA / OS title bar — match trackIT (`vite.config.ts` theme_color). */
export const KGO_ES_PWA_THEME_COLOR = "#1e3a5f";

export const KGO_ES_NAME = "KGO-ES";
export const KGO_ES_SHORT = "ES";
export const KGO_ES_LEGACY_NAME = "EasySchematic";

/** Upstream AGPL-3.0 project this fork is derived from. */
export const KGO_ES_UPSTREAM_NAME = "EasySchematic";
export const KGO_ES_UPSTREAM_AUTHOR = "duremovich";
export const KGO_ES_UPSTREAM_REPO_URL = "https://github.com/duremovich/EasySchematic";

/** Primary tab label for the signal-flow canvas (store id remains `"schematic"`). */
export const KGO_ES_DRAWING_TAB_LABEL = "Drawing";

/** Default name for a blank drawing file (center title + new document). */
export const KGO_ES_DEFAULT_DRAWING_NAME = "Untitled Drawing";

/** Project chip label when no trackIT drawing is linked. */
export const KGO_ES_DEFAULT_PROJECT_LABEL = "Untitled project";

/** Plain-language fork credit (About dialog, etc.). */
export const KGO_ES_FORK_CREDIT =
  `${KGO_ES_NAME} is forked from EasySchematic by ${KGO_ES_UPSTREAM_AUTHOR} (AGPL-3.0).`;
export const KGO_ES_UPSTREAM_DOCS_URL = "https://docs.easyschematic.live";
export const KGO_ES_UPSTREAM_DEVICES_URL = "https://devices.easyschematic.live";

/** This fork (trackIT / KGO integration). */
export const KGO_ES_REPO_URL = "https://github.com/ac-pcr1/ES";
export const KGO_ES_ISSUES_URL = "https://github.com/ac-pcr1/ES/issues";
export const KGO_ES_SUPPORT_EMAIL = "alan.c.hay@abc.com";
export const KGO_ES_TRACKIT_REPO_URL = "https://github.com/ac-pcr1/trackIT_v2";

/** Shown in browser tab and PWA install name. */
export const KGO_ES_TAGLINE = "Plant engineering schematics for trackIT";

export const KGO_ES_PAGE_TITLE = `${KGO_ES_NAME} — ${KGO_ES_TAGLINE}`;

export const KGO_ES_DESCRIPTION =
  "Signal flow diagrams, rack elevations, and print sheets linked to trackIT plant drawings. Built for KGO broadcast engineering.";

export const KGO_ES_ABOUT_BLURB =
  "Plant schematic editor for trackIT: signal flow, rack elevations, and print sheets with plant cable numbering.";

export const KGO_ES_ATTRIBUTION =
  `Based on ${KGO_ES_UPSTREAM_NAME} (AGPL-3.0). See upstream source for original authors and license.`;

/** `document.title` when a drawing is open: "My Show — KGO-ES" */
export function kgoEsDocumentTitle(drawingName?: string | null): string {
  const name = drawingName?.trim();
  return name ? `${name} — ${KGO_ES_NAME}` : KGO_ES_PAGE_TITLE;
}
