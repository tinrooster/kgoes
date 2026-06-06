/**
 * TiBase — Design system base components for the KGO-ES redesign.
 * Mirrors src/lib/tokens.jsx from the design handoff.
 * Uses --ti-* CSS custom props (set on [data-ti] / <html>).
 */

import { type CSSProperties, type MouseEvent, type ReactNode } from "react";

// ─── Icon set ────────────────────────────────────────────────────────────────
// ~60 stroke icons (24-grid, 1.6px stroke). Path data only; rendered via TiIcon.

const ICONS: Record<string, string> = {
  search:    "M21 21l-4.3-4.3 M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z",
  plus:      "M12 5v14 M5 12h14",
  minus:     "M5 12h14",
  check:     "M5 12l4.5 4.5L19 7",
  x:         "M6 6l12 12 M18 6L6 18",
  chevR:     "M9 6l6 6-6 6",
  chevD:     "M6 9l6 6 6-6",
  chevL:     "M15 6l-6 6 6 6",
  filter:    "M3 5h18 M6 12h12 M10 19h4",
  sort:      "M7 4v16 M3 8l4-4 4 4 M17 20V4 M21 16l-4 4-4-4",
  user:      "M4 21a8 8 0 0 1 16 0 M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
  bell:      "M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8 M10 21a2 2 0 0 0 4 0",
  box:       "M3 7l9-4 9 4-9 4-9-4Z M3 7v10l9 4 9-4V7 M12 11v10",
  cabinet:   "M5 3h14v18H5z M5 12h14 M9 7v2 M9 16v2 M15 7v2 M15 16v2",
  inventory: "M3 5h18 M3 12h18 M3 19h18",
  scan:      "M4 7V5a1 1 0 0 1 1-1h2 M17 4h2a1 1 0 0 1 1 1v2 M20 17v2a1 1 0 0 1-1 1h-2 M7 20H5a1 1 0 0 1-1-1v-2 M7 8h10v8H7z",
  dash:      "M3 12h6 M3 6h18 M3 18h6 M11 6h10 M13 18h8",
  truck:     "M3 6h11v11H3z M14 9h4l3 3v5h-7 M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M18 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  wrench:    "M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4 4 4 0 0 1-3-3Z",
  calendar:  "M5 5h14v14H5z M5 9h14 M9 3v4 M15 3v4",
  clock:     "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M12 7v5l3 2",
  alert:     "M12 2 1 21h22L12 2Z M12 10v5 M12 18v.5",
  download:  "M12 4v12 M6 12l6 6 6-6 M4 20h16",
  upload:    "M12 20V8 M6 12l6-6 6 6 M4 4h16",
  print:     "M7 9V3h10v6 M5 9h14a2 2 0 0 1 2 2v6h-4v4H7v-4H3v-6a2 2 0 0 1 2-2Z",
  settings:  "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.9l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z",
  help:      "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M9.1 9a3 3 0 1 1 5.8 1c0 2-3 2-3 4 M12 17v.5",
  more:      "M5 12.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z M12 12.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z M19 12.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z",
  arrowR:    "M5 12h14 M13 6l6 6-6 6",
  arrowL:    "M19 12H5 M11 6l-6 6 6 6",
  arrowSwap: "M7 7h13 M16 3l4 4-4 4 M17 17H4 M8 13l-4 4 4 4",
  refresh:   "M3 12a9 9 0 0 1 15.5-6.3L21 8 M21 4v4h-4 M21 12a9 9 0 0 1-15.5 6.3L3 16 M3 20v-4h4",
  pin:       "M12 17v5 M12 2a5 5 0 0 0-5 5c0 4 5 10 5 10s5-6 5-10a5 5 0 0 0-5-5Z",
  link:      "M10 14a5 5 0 0 0 7.1 0l3-3a5 5 0 1 0-7.1-7.1L11 5.4 M14 10a5 5 0 0 0-7.1 0l-3 3a5 5 0 1 0 7.1 7.1L13 18.6",
  star:      "M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 18l-5.8 3 1.1-6.5L2.6 9.8l6.5-.9L12 3Z",
  edit:      "M4 20h4l10-10-4-4L4 16v4Z M14 6l4 4",
  trash:     "M3 6h18 M8 6V4h8v2 M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14 M10 11v6 M14 11v6",
  copy:      "M9 9h11v11H9z M5 15H4V4h11v1",
  eye:       "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  eyeOff:    "M17.9 17.9A10 10 0 0 1 2 12s1.4-2.5 3.9-4.6 M9.9 4.2A10 10 0 0 1 22 12s-2.7 5-8 6.5 M14.1 14.1A3 3 0 1 1 9.9 9.9 M3 3l18 18",
  list:      "M8 6h13 M8 12h13 M8 18h13 M4 6h.01 M4 12h.01 M4 18h.01",
  grid:      "M3 3h8v8H3z M13 3h8v8h-8z M3 13h8v8H3z M13 13h8v8h-8z",
  rack:      "M4 4h16v16H4z M4 9h16 M4 14h16 M4 19h16",
  signal:    "M2 20h2 M7 16h2v4H7z M12 12h2v8h-2z M17 8h2v12h-2z",
  flag:      "M5 21V4 M5 4h12l-2 4 2 4H5",
  history:   "M3 12a9 9 0 1 0 3-6.7 M3 4v5h5 M12 7v5l3 2",
  hash:      "M4 9h16 M4 15h16 M10 3l-2 18 M16 3l-2 18",
  folder:    "M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z",
  lock:      "M6 10V7a6 6 0 1 1 12 0v3 M4 10h16v12H4z M12 15v3",
  unlock:    "M6 10V7a6 6 0 0 1 11.5-2 M4 10h16v12H4z M12 15v3",
  layers:    "M12 2l9 4.5-9 4.5-9-4.5L12 2Z M3 13.5l9 4.5 9-4.5 M3 18l9 4.5 9-4.5",
  zoomIn:    "M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z M21 21l-4.3-4.3 M11 8v6 M8 11h6",
  zoomOut:   "M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z M21 21l-4.3-4.3 M8 11h6",
  maximize:  "M15 3h6v6 M9 21H3v-6 M21 3l-7 7 M3 21l7-7",
  sun:       "M12 4v2 M12 18v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M4 12H2 M22 12h-2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4 M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z",
  moon:      "M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5Z",
};

export type TiIconName = keyof typeof ICONS;

interface TiIconProps {
  name: TiIconName | string;
  size?: number;
  stroke?: number;
  color?: string;
  style?: CSSProperties;
}

export function TiIcon({ name, size = 18, stroke = 1.6, color = "currentColor", style }: TiIconProps) {
  const d = ICONS[name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "block", flexShrink: 0, ...style }}
    >
      {d.split(" M").map((seg, i) => (
        <path key={i} d={(i === 0 ? "" : "M") + seg} />
      ))}
    </svg>
  );
}

// ─── TiButton ────────────────────────────────────────────────────────────────

type TiButtonVariant = "default" | "primary" | "accent" | "ghost" | "soft" | "danger" | "outline";
type TiButtonSize = "sm" | "md" | "lg";

interface TiButtonProps {
  variant?: TiButtonVariant;
  size?: TiButtonSize;
  children?: ReactNode;
  icon?: TiIconName | string;
  iconRight?: TiIconName | string;
  fullWidth?: boolean;
  disabled?: boolean;
  title?: string;
  style?: CSSProperties;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit" | "reset";
}

const VARIANT_STYLES: Record<TiButtonVariant, CSSProperties> = {
  default:  { background: "var(--ti-surface)", color: "var(--ti-ink)", border: "1px solid var(--ti-border)" },
  primary:  { background: "var(--ti-ink)", color: "var(--ti-bg)", border: "1px solid var(--ti-ink)" },
  accent:   { background: "var(--ti-accent)", color: "var(--ti-on-accent)", border: "1px solid var(--ti-accent)" },
  ghost:    { background: "transparent", color: "var(--ti-ink)", border: "1px solid transparent" },
  soft:     { background: "var(--ti-accent-soft)", color: "var(--ti-accent-ink)", border: "1px solid transparent" },
  danger:   { background: "var(--ti-danger-soft)", color: "var(--ti-danger)", border: "1px solid color-mix(in oklab, var(--ti-danger) 30%, transparent)" },
  outline:  { background: "transparent", color: "var(--ti-ink)", border: "1px solid var(--ti-border)" },
};

const SIZE_STYLES: Record<TiButtonSize, CSSProperties> = {
  sm: { height: 28, padding: "0 10px", fontSize: 12, fontWeight: 500, borderRadius: 7, gap: 5 },
  md: { height: 36, padding: "0 14px", fontSize: 13.5, fontWeight: 500, borderRadius: 9, gap: 6 },
  lg: { height: 44, padding: "0 18px", fontSize: 14, fontWeight: 600, borderRadius: 11, gap: 7 },
};

export function TiButton({
  variant = "default", size = "md", children, icon, iconRight,
  fullWidth, disabled, title, style, onClick, type = "button",
}: TiButtonProps) {
  const iconSize = size === "sm" ? 13 : size === "lg" ? 16 : 14;
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontFamily: "var(--ti-font-sans)",
        width: fullWidth ? "100%" : undefined,
        boxShadow: "var(--ti-shadow-sm)",
        transition: "background 120ms, border-color 120ms",
        whiteSpace: "nowrap",
        ...VARIANT_STYLES[variant],
        ...SIZE_STYLES[size],
        ...style,
      }}
    >
      {icon && <TiIcon name={icon} size={iconSize} color="currentColor" />}
      {children}
      {iconRight && <TiIcon name={iconRight} size={iconSize} color="currentColor" />}
    </button>
  );
}

// ─── TiIconButton ─────────────────────────────────────────────────────────────

interface TiIconButtonProps {
  icon: TiIconName | string;
  variant?: TiButtonVariant;
  size?: TiButtonSize;
  title?: string;
  disabled?: boolean;
  style?: CSSProperties;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
}

export function TiIconButton({
  icon, variant = "ghost", size = "md", title, disabled, style, onClick,
}: TiIconButtonProps) {
  const dim = size === "sm" ? 28 : size === "lg" ? 40 : 34;
  const iconSize = size === "sm" ? 14 : size === "lg" ? 18 : 16;
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "grid",
        placeItems: "center",
        width: dim,
        height: dim,
        flexShrink: 0,
        borderRadius: 7,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background 120ms",
        ...VARIANT_STYLES[variant],
        padding: 0,
        ...style,
      }}
    >
      <TiIcon name={icon} size={iconSize} color="currentColor" />
    </button>
  );
}

// ─── TiSeg (segmented control) ────────────────────────────────────────────────

interface TiSegOption {
  value: string;
  label: string;
}

interface TiSegProps {
  value: string;
  onChange: (v: string) => void;
  options: TiSegOption[];
  size?: "sm" | "md";
  style?: CSSProperties;
}

export function TiSeg({ value, onChange, options, size = "md", style }: TiSegProps) {
  const h = size === "sm" ? 26 : 32;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        height: h,
        padding: 2,
        background: "var(--ti-surface-2)",
        borderRadius: 8,
        border: "1px solid var(--ti-border)",
        ...style,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              height: h - 6,
              padding: size === "sm" ? "0 8px" : "0 12px",
              borderRadius: 6,
              border: "none",
              background: active ? "var(--ti-surface)" : "transparent",
              color: active ? "var(--ti-ink)" : "var(--ti-muted)",
              fontSize: size === "sm" ? 12 : 13,
              fontWeight: active ? 600 : 500,
              fontFamily: "var(--ti-font-sans)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              boxShadow: active ? "var(--ti-shadow-sm)" : "none",
              transition: "background 100ms, color 100ms",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── TiInput ──────────────────────────────────────────────────────────────────

interface TiInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  icon?: TiIconName | string;
  style?: CSSProperties;
  autoFocus?: boolean;
}

export function TiInput({ value, onChange, placeholder, icon, style, autoFocus }: TiInputProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        height: 34,
        padding: "0 10px",
        background: "var(--ti-surface)",
        border: "1px solid var(--ti-border)",
        borderRadius: 8,
        ...style,
      }}
    >
      {icon && <TiIcon name={icon} size={14} color="var(--ti-muted)" />}
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={{
          flex: 1,
          border: "none",
          background: "transparent",
          outline: "none",
          fontSize: 13,
          color: "var(--ti-ink)",
          fontFamily: "var(--ti-font-sans)",
          minWidth: 0,
        }}
      />
    </div>
  );
}

// ─── TiBadge ──────────────────────────────────────────────────────────────────

type TiBadgeTone = "success" | "warning" | "danger" | "info" | "accent" | "neutral";

interface TiBadgeProps {
  tone?: TiBadgeTone;
  children: ReactNode;
  style?: CSSProperties;
}

export function TiBadge({ tone = "neutral", children, style }: TiBadgeProps) {
  const toneStyles: Record<TiBadgeTone, CSSProperties> = {
    success: { background: "var(--ti-success-soft)", color: "color-mix(in oklab, var(--ti-success) 75%, var(--ti-ink))" },
    warning: { background: "var(--ti-warning-soft)", color: "color-mix(in oklab, var(--ti-warning) 65%, var(--ti-ink))" },
    danger:  { background: "var(--ti-danger-soft)",  color: "var(--ti-danger)" },
    info:    { background: "var(--ti-info-soft)",    color: "color-mix(in oklab, var(--ti-info) 75%, var(--ti-ink))" },
    accent:  { background: "var(--ti-accent-soft)",  color: "var(--ti-accent-ink)" },
    neutral: { background: "var(--ti-surface-2)",    color: "var(--ti-ink-2)" },
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        height: 20,
        padding: "0 7px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.02em",
        fontFamily: "var(--ti-font-sans)",
        ...toneStyles[tone],
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// ─── TiDivider ────────────────────────────────────────────────────────────────

export function TiDivider({ vertical, style }: { vertical?: boolean; style?: CSSProperties }) {
  return (
    <div
      style={{
        flexShrink: 0,
        background: "var(--ti-divider)",
        ...(vertical
          ? { width: 1, height: 20, margin: "0 4px" }
          : { height: 1, margin: "4px 0" }),
        ...style,
      }}
    />
  );
}
