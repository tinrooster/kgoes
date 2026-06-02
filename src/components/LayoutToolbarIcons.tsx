/** Untitled UI–style layout icons (MIT @untitledui/icons paths). */

import type { ReactNode } from "react";

interface LayoutIconProps {
  size?: number;
  className?: string;
}

function LayoutIcon({
  path,
  size = 16,
  className,
}: LayoutIconProps & { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
}

const PATHS = {
  alignHorizontalCentre:
    "M12 3v18m10-9h-6.5m0 0 4 4m-4-4 4-4M2 12h6.5m0 0-4 4m4-4-4-4",
  alignVerticalCenter:
    "M3 12h18M12 2v6.5m0 0 4-4m-4 4-4-4M12 22v-6.5m0 0 4 4m-4-4-4 4",
  alignTop: "M3 3h18M12 21v-14m0 0 7 7m-7-7 7-7",
  alignBottom: "M3 21h18M12 3v14m0 0 7-7m-7 7-7-7",
  distributeSpacingHorizontal:
    "M21 21V3M3 21V3m6 5v8c0 .932 0 1.398.152 1.765a2 2 0 0 0 1.083 1.083C10.602 19 11.068 19 12 19c.932 0 1.398 0 1.765-.152a2 2 0 0 0 1.083-1.083C15 17.398 15 16.932 15 16V8c0-.932 0-1.398-.152-1.765a2 2 0 0 0-1.083-1.083C13.398 5 12.932 5 12 5c-.932 0-1.398 0-1.765.152a2 2 0 0 0-1.083 1.083C9 6.602 9 7.068 9 8Z",
  distributeSpacingVertical:
    "M21 3H3m18 18H3m2-9c0-.932 0-1.398.152-1.765a2 2 0 0 1 1.083-1.083C6.602 9 7.068 9 8 9h8c.932 0 1.398 0 1.765.152a2 2 0 0 1 1.083 1.083C19 10.602 19 11.068 19 12c0 .932 0 1.398-.152 1.765a2 2 0 0 1-1.083 1.083C17.398 15 16.932 15 16 15H8c-.932 0-1.398 0-1.765-.152a2 2 0 0 1-1.083-1.083C5 13.398 5 12.932 5 12Z",
} as const;

export function IconAlignHorizontalCentre(props: LayoutIconProps) {
  return <LayoutIcon path={PATHS.alignHorizontalCentre} {...props} />;
}

export function IconAlignVerticalCenter(props: LayoutIconProps) {
  return <LayoutIcon path={PATHS.alignVerticalCenter} {...props} />;
}

export function IconAlignTop(props: LayoutIconProps) {
  return <LayoutIcon path={PATHS.alignTop} {...props} />;
}

export function IconAlignBottom(props: LayoutIconProps) {
  return <LayoutIcon path={PATHS.alignBottom} {...props} />;
}

export function IconDistributeSpacingHorizontal(props: LayoutIconProps) {
  return <LayoutIcon path={PATHS.distributeSpacingHorizontal} {...props} />;
}

export function IconDistributeSpacingVertical(props: LayoutIconProps) {
  return <LayoutIcon path={PATHS.distributeSpacingVertical} {...props} />;
}

interface LayoutToolbarButtonProps {
  title: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}

export function LayoutToolbarButton({
  title,
  disabled,
  onClick,
  children,
}: LayoutToolbarButtonProps) {
  return (
    <button
      type="button"
      className="p-1.5 rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] disabled:opacity-40 disabled:pointer-events-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700"
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      {children}
    </button>
  );
}
