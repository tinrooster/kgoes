/** Reject site AMSL / mis-tagged values used as tower height AGL in KGO-ES tower draft. */

const SUTRO_TOP_FT_AGL = 977;
const SUTRO_SITE_CODES = new Set(["SUTRO", "SUTROTOWER"]);

/** Typical US mountaintop site AMSL band when catalog confuses elevation with tower AGL. */
const SUSPICIOUS_AMSL_AS_AGL_MIN_FT = 1600;
const SUSPICIOUS_AMSL_AS_AGL_MAX_FT = 2200;

function normalizeSiteCode(code: string | undefined): string {
  return (code ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

export function isSutroTowerSiteCode(siteCode: string | undefined): boolean {
  return SUTRO_SITE_CODES.has(normalizeSiteCode(siteCode));
}

export function isSutroElevationReferenceUrl(url: string | undefined): boolean {
  const hay = (url ?? "").toLowerCase();
  return hay.includes("sutro-elevation") || hay.includes("/mountaintops/sutro/");
}

/**
 * Clamp mistaken AMSL / site-elevation values to known tower AGL.
 * When siteCode is unknown, Sutro reference art still implies 977 ft.
 */
export function sanitizeTowerHeightFtAgl(
  ftAgl: number | undefined,
  opts?: {
    siteCode?: string;
    siteElevationFtAmsl?: number;
    referenceUrl?: string;
  },
): number {
  if (ftAgl == null || !Number.isFinite(ftAgl) || ftAgl <= 0) return 0;
  const siteCode = normalizeSiteCode(opts?.siteCode);
  const sutro =
    isSutroTowerSiteCode(siteCode) ||
    isSutroElevationReferenceUrl(opts?.referenceUrl);

  if (sutro && ftAgl > SUTRO_TOP_FT_AGL + 120) {
    return SUTRO_TOP_FT_AGL;
  }

  const elev = opts?.siteElevationFtAmsl;
  if (
    elev != null &&
    elev > 0 &&
    Math.abs(ftAgl - elev) < 200 &&
    ftAgl >= SUSPICIOUS_AMSL_AS_AGL_MIN_FT
  ) {
    if (sutro) return SUTRO_TOP_FT_AGL;
  }

  if (
    ftAgl >= SUSPICIOUS_AMSL_AS_AGL_MIN_FT &&
    ftAgl <= SUSPICIOUS_AMSL_AS_AGL_MAX_FT &&
    sutro
  ) {
    return SUTRO_TOP_FT_AGL;
  }

  return ftAgl;
}

export function inferAuthoritativeTowerHeightFtAgl(opts: {
  contextTowerHeightFt?: number;
  pageTowerHeightFtAgl?: number;
  siteCode?: string;
  siteElevationFtAmsl?: number;
  referenceUrl?: string;
}): number {
  const sanitizeOpts = {
    siteCode: opts.siteCode,
    siteElevationFtAmsl: opts.siteElevationFtAmsl,
    referenceUrl: opts.referenceUrl,
  };

  const fromContext = sanitizeTowerHeightFtAgl(opts.contextTowerHeightFt, sanitizeOpts);
  const fromPage = sanitizeTowerHeightFtAgl(opts.pageTowerHeightFtAgl, sanitizeOpts);
  const fromRef =
    isSutroElevationReferenceUrl(opts.referenceUrl) && (!fromContext || fromContext > SUTRO_TOP_FT_AGL + 120)
      ? SUTRO_TOP_FT_AGL
      : 0;

  if (fromContext > 0) return fromContext;
  if (fromRef > 0) return fromRef;
  if (fromPage > 0) return fromPage;
  return 150;
}
