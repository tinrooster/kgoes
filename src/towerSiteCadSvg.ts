/** SVG wireframes for mountaintop site plan + tower elevation (CAD-style, not to scale). */
/** Keep in sync with trackIT src/lib/towerSiteCadSvg.ts — run scripts/sync-tower-cad-svg.ps1 after edits. */

export type TowerCadHeightBand = { ftAgl: number; label?: string };

export type TowerCadSector = { azimuthDeg: number; label?: string };

export type TowerType = 'self_support' | 'guyed' | 'monopole';

export type TowerCadSvgContext = {
  siteName: string;
  siteCode: string;
  towerHeightFt: number;
  towerCompany: string;
  accessNotes: string;
  elevationLabel: string;
  towerType?: TowerType;
  heightBandsFt?: TowerCadHeightBand[];
  sectors?: TowerCadSector[];
  showGuyWires?: boolean;
};

export function towerCadContextFrom(opts: {
  code?: string;
  name?: string;
  siteName?: string;
  siteCode?: string;
  towerHeightFt?: number;
  towerCompany?: string;
  accessNotes?: string;
  elevationFt?: number;
  towerType?: TowerType;
  heightBandsFt?: TowerCadHeightBand[];
  sectors?: TowerCadSector[];
  showGuyWires?: boolean;
}): TowerCadSvgContext {
  const towerHeightFt = opts.towerHeightFt ?? 150;
  const towerType = opts.towerType ?? 'self_support';
  const accessNotes = opts.accessNotes?.trim()
    ? opts.accessNotes.trim()
    : 'Gate / access — Mountaintops catalog';
  const showGuyWires =
    opts.showGuyWires ?? (towerType === 'guyed' || (towerType === 'self_support' && towerHeightFt >= 120));
  return {
    siteName: opts.name?.trim() || opts.siteName?.trim() || 'Mountaintop site',
    siteCode: opts.code?.trim() || opts.siteCode?.trim() || 'SITE',
    towerHeightFt,
    towerCompany: opts.towerCompany?.trim() || 'Tower company TBD',
    accessNotes,
    elevationLabel:
      opts.elevationFt != null
        ? `${opts.elevationFt.toLocaleString()} ft AMSL`
        : 'site elevation TBD',
    towerType,
    heightBandsFt: opts.heightBandsFt,
    sectors: opts.sectors,
    showGuyWires,
  };
}

function defaultHeightBands(h: number): TowerCadHeightBand[] {
  return [
    { ftAgl: h, label: `${h}′` },
    { ftAgl: Math.round(h * 0.75), label: `${Math.round(h * 0.75)}′` },
    { ftAgl: Math.round(h * 0.5), label: `${Math.round(h * 0.5)}′` },
    { ftAgl: Math.round(h * 0.25), label: `${Math.round(h * 0.25)}′` },
    { ftAgl: 0, label: 'Base' },
  ];
}

function bandY(ftAgl: number, maxFt: number): number {
  const t = maxFt > 0 ? ftAgl / maxFt : 0;
  return 208 - t * 168;
}

function towerTypeLabel(type: TowerType | undefined): string {
  switch (type) {
    case 'guyed':
      return 'guyed';
    case 'monopole':
      return 'monopole';
    default:
      return 'self-support';
  }
}

const T = 'stroke="#1e293b" stroke-width="1.2" fill="none"';
const B = 'stroke="#94a3b8" stroke-width="0.8" fill="none" stroke-dasharray="4 3"';
const F = 'fill="#f8fafc" stroke="#cbd5e1" stroke-width="0.8"';
const TX = 'fill="#334155" font-size="9" font-family="ui-sans-serif,system-ui"';
const HD = 'fill="#0f172a" font-size="10" font-weight="600" font-family="ui-sans-serif,system-ui"';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function elevationTowerBodySvg(ctx: TowerCadSvgContext, cx: number, baseY: number, topY: number): string {
  const type = ctx.towerType ?? 'self_support';
  if (type === 'monopole') {
    return `<line x1="${cx}" y1="${topY}" x2="${cx}" y2="${baseY}" ${T} stroke-width="2"/>`;
  }
  const legL = cx - 20;
  const legR = cx + 20;
  let body =
    `<line x1="${legL}" y1="${topY}" x2="${legL - 28}" y2="${baseY}" ${T}/>` +
    `<line x1="${legR}" y1="${topY}" x2="${legR + 12}" y2="${baseY}" ${T}/>` +
    `<line x1="${legL}" y1="${topY}" x2="${legR}" y2="${topY}" ${T}/>`;
  if (type === 'self_support') {
    body +=
      `<line x1="${legL - 12}" y1="${topY + 30}" x2="${legR - 12}" y2="${topY + 60}" ${B}/>` +
      `<line x1="${legR - 12}" y1="${topY + 30}" x2="${legL - 12}" y2="${topY + 60}" ${B}/>` +
      `<line x1="${legL - 16}" y1="${topY + 70}" x2="${legR - 16}" y2="${topY + 100}" ${B}/>` +
      `<line x1="${legR - 16}" y1="${topY + 70}" x2="${legL - 16}" y2="${topY + 100}" ${B}/>` +
      `<line x1="${legL - 20}" y1="${topY + 110}" x2="${legR - 20}" y2="${topY + 140}" ${B}/>` +
      `<line x1="${legR - 20}" y1="${topY + 110}" x2="${legL - 20}" y2="${topY + 140}" ${B}/>`;
  }
  return body;
}

export function buildTowerElevationCadSvg(ctx: TowerCadSvgContext): string {
  const h = ctx.towerHeightFt;
  const type = ctx.towerType ?? 'self_support';
  const bands = (ctx.heightBandsFt?.length ? ctx.heightBandsFt : defaultHeightBands(h))
    .slice()
    .sort((a, b) => b.ftAgl - a.ftAgl);
  const maxFt = Math.max(h, ...bands.map((b) => b.ftAgl), 1);
  const bandMarks = bands
    .map((b) => {
      const y = bandY(b.ftAgl, maxFt);
      const label = b.label ?? (b.ftAgl === 0 ? 'Base' : `${b.ftAgl}′`);
      return (
        `<line x1="168" y1="${y}" x2="188" y2="${y}" stroke="#64748b" stroke-width="0.8"/>` +
        `<text x="192" y="${y + 3}" font-size="8" fill="#475569" font-family="ui-monospace,monospace">${escapeXml(label)}</text>`
      );
    })
    .join('');

  const guys = ctx.showGuyWires
    ? `<line x1="72" y1="218" x2="48" y2="218" ${B}/><line x1="152" y1="218" x2="176" y2="218" ${B}/><text x="44" y="214" ${TX} font-size="7">Guys</text>`
    : '';

  const cx = 120;
  const towerBody = elevationTowerBodySvg(ctx, cx, 218, 40);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 240" width="280" height="240" style="max-width:100%;height:auto;display:block">
  <text x="8" y="14" ${HD}>${escapeXml(ctx.siteName)} — tower elevation</text>
  <text x="8" y="26" ${TX}>~${h.toLocaleString()}′ ${towerTypeLabel(type)} · ${escapeXml(ctx.elevationLabel)}</text>
  <line x1="20" y1="218" x2="160" y2="218" ${T} stroke-width="1.5"/>
  <rect x="24" y="188" width="48" height="30" ${F}/>
  <text x="28" y="205" ${TX}>Shelter</text>
  ${towerBody}
  <line x1="118" y1="32" x2="122" y2="40" ${T}/>
  <circle cx="120" cy="28" r="3" fill="#fbbf24" stroke="#b45309" stroke-width="0.6"/>
  <text x="128" y="30" ${TX} font-size="7">Lights</text>
  ${bandMarks}
  ${guys}
  <text x="8" y="234" ${TX} font-size="7">Not to scale — adjust in KGO-ES</text>
</svg>`;
}

function sectorArcsSvg(sectors: TowerCadSector[], cx: number, cy: number, r: number): string {
  return sectors
    .map((s) => {
      const rad = ((90 - s.azimuthDeg) * Math.PI) / 180;
      const x2 = cx + r * Math.cos(rad);
      const y2 = cy - r * Math.sin(rad);
      const label = s.label ?? `${s.azimuthDeg}°`;
      return (
        `<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#94a3b8" stroke-width="0.7" stroke-dasharray="3 2"/>` +
        `<text x="${(x2 + cx) / 2}" y="${(y2 + cy) / 2}" font-size="7" fill="#64748b">${escapeXml(label)}</text>`
      );
    })
    .join('');
}

export function buildTowerSectionCadSvg(ctx: TowerCadSvgContext): string {
  const cx = 140;
  const cy = 130;
  const r = 72;
  const type = ctx.towerType ?? 'self_support';
  const sectors = ctx.sectors?.length ? sectorArcsSvg(ctx.sectors, cx, cy, r - 8) : '';

  let structure = '';
  if (type === 'monopole') {
    structure = `<circle cx="${cx}" cy="${cy}" r="10" ${T} stroke-width="2"/>`;
  } else if (type === 'guyed') {
    structure =
      `<polygon points="${cx},${cy - 18} ${cx - 16},${cy + 14} ${cx + 16},${cy + 14}" ${T}/>` +
      `<circle cx="${cx}" cy="${cy}" r="${r}" ${B}/>`;
  } else {
    structure =
      `<rect x="${cx - 14}" y="${cy - 14}" width="28" height="28" ${T}/>` +
      `<line x1="${cx - 14}" y1="${cy - 14}" x2="${cx + 14}" y2="${cy + 14}" ${B}/>` +
      `<line x1="${cx + 14}" y1="${cy - 14}" x2="${cx - 14}" y2="${cy + 14}" ${B}/>`;
  }

  const bandCount = ctx.heightBandsFt?.length ?? 0;
  const bandNote =
    bandCount > 0
      ? `${bandCount} antenna level${bandCount !== 1 ? 's' : ''} from register`
      : 'Add antenna levels in trackIT for mount heights';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 240" width="280" height="240" style="max-width:100%;height:auto;display:block">
  <text x="8" y="14" ${HD}>${escapeXml(ctx.siteName)} — tower section</text>
  <text x="8" y="26" ${TX}>Looking up · ${towerTypeLabel(type)} · ${escapeXml(ctx.elevationLabel)}</text>
  <circle cx="${cx}" cy="${cy}" r="${r}" ${B}/>
  ${structure}
  ${sectors}
  <text x="8" y="228" ${TX} font-size="7">${escapeXml(bandNote)}</text>
  <text x="8" y="238" ${TX} font-size="7">Not to scale — adjust in KGO-ES</text>
</svg>`;
}

export function buildSitePlanCadSvg(ctx: TowerCadSvgContext): string {
  const D = 'stroke="#64748b" stroke-width="1" fill="none" stroke-dasharray="6 4"';
  const F = 'fill="#f1f5f9" stroke="#94a3b8" stroke-width="0.9"';
  const H = 'fill="url(#hatch)" stroke="#94a3b8" stroke-width="0.8"';
  const T = 'stroke="#1e293b" stroke-width="1.2" fill="none"';
  const TX = 'fill="#334155" font-size="9" font-family="ui-sans-serif,system-ui"';
  const HD = 'fill="#0f172a" font-size="11" font-weight="600" font-family="ui-sans-serif,system-ui"';
  const sectors = ctx.sectors?.length ? sectorArcsSvg(ctx.sectors, 274, 134, 42) : '';
  const type = ctx.towerType ?? 'self_support';
  const towerSymbol =
    type === 'monopole'
      ? `<circle cx="274" cy="134" r="6" ${T}/>`
      : `<rect x="248" y="108" width="52" height="52" ${F}/><line x1="274" y1="108" x2="248" y2="160" ${T} stroke-width="0.8"/><line x1="300" y1="108" x2="274" y2="160" ${T} stroke-width="0.8"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 260" width="360" height="260" style="max-width:100%;height:auto;display:block">
  <defs>
    <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="6" stroke="#cbd5e1" stroke-width="1"/>
    </pattern>
  </defs>
  <text x="10" y="16" ${HD}>${escapeXml(ctx.siteName)} — site plan</text>
  <text x="10" y="28" ${TX}>${escapeXml(ctx.elevationLabel)} · ${escapeXml(ctx.siteCode)}</text>
  <rect x="40" y="44" width="280" height="180" ${D}/>
  <line x1="40" y1="140" x2="28" y2="140" ${T}/>
  <text x="12" y="144" ${TX} font-size="8">Gate</text>
  <rect x="56" y="100" width="72" height="48" ${F}/>
  <text x="62" y="128" ${TX}>Equip. shelter</text>
  <rect x="56" y="168" width="56" height="40" ${H}/>
  <text x="62" y="192" ${TX}>Gen pad</text>
  ${towerSymbol}
  <text x="252" y="148" ${TX} font-size="8">Tower</text>
  ${sectors}
  <line x1="128" y1="124" x2="248" y2="124" ${T} stroke-width="0.9"/>
  <text x="168" y="118" ${TX} font-size="7">Cable tray</text>
  <rect x="8" y="168" width="28" height="36" ${F}/>
  <text x="6" y="212" ${TX} font-size="7" transform="rotate(-90 6 212)">Xfmr</text>
  <text x="10" y="252" ${TX} font-size="7">Not to scale</text>
</svg>`;
}
