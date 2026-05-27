import { useState } from "react";
import {
  KGO_ES_ABOUT_BLURB,
  KGO_ES_ATTRIBUTION,
  KGO_ES_FORK_CREDIT,
  KGO_ES_ISSUES_URL,
  KGO_ES_NAME,
  KGO_ES_REPO_URL,
  KGO_ES_SUPPORT_EMAIL,
  KGO_ES_TRACKIT_REPO_URL,
  KGO_ES_UPSTREAM_AUTHOR,
  KGO_ES_UPSTREAM_DEVICES_URL,
  KGO_ES_UPSTREAM_DOCS_URL,
  KGO_ES_UPSTREAM_NAME,
  KGO_ES_UPSTREAM_REPO_URL,
} from "../branding";
import { getAppVersionLabel } from "../buildVersion";
import { DEVICE_TEMPLATES } from "../deviceLibrary";

const PRIMARY_LINKS = [
  { label: "KGO-ES on GitHub", href: KGO_ES_REPO_URL },
  { label: "Report a bug", href: KGO_ES_ISSUES_URL },
  { label: "Support", href: `mailto:${KGO_ES_SUPPORT_EMAIL}` },
  { label: "trackIT", href: KGO_ES_TRACKIT_REPO_URL },
] as const;

const UPSTREAM_LINKS = [
  { label: `${KGO_ES_UPSTREAM_NAME} source`, href: KGO_ES_UPSTREAM_REPO_URL },
  { label: "Upstream docs", href: KGO_ES_UPSTREAM_DOCS_URL },
  { label: "Device database", href: KGO_ES_UPSTREAM_DEVICES_URL },
] as const;

export default function AboutDialog({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const versionLabel = getAppVersionLabel();

  const copyDebugInfo = async () => {
    const info = [
      `${KGO_ES_NAME} ${versionLabel}`,
      `UA: ${navigator.userAgent}`,
      `Viewport: ${window.innerWidth}\u00d7${window.innerHeight}`,
      `Date: ${new Date().toISOString().split("T")[0]}`,
    ].join("\n");
    await navigator.clipboard.writeText(info);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[var(--color-border)] rounded-lg shadow-2xl w-[420px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
          <span className="text-sm font-semibold text-[var(--color-text-heading)]">
            About {KGO_ES_NAME}
          </span>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-lg leading-none cursor-pointer"
          >
            &times;
          </button>
        </div>

        <div className="px-5 py-5 flex flex-col items-center text-center gap-4">
          <img src="/favicon.svg" alt="" className="w-12 h-12" />
          <div>
            <div className="text-base font-semibold text-[var(--color-text-heading)]">
              {KGO_ES_NAME}
            </div>
            <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {versionLabel}
            </div>
          </div>

          <p className="text-xs text-[var(--color-text)] leading-relaxed max-w-[320px]">
            {KGO_ES_ABOUT_BLURB}
          </p>

          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed max-w-[340px]">
            {KGO_ES_FORK_CREDIT}{" "}
            <a
              href={KGO_ES_UPSTREAM_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              github.com/{KGO_ES_UPSTREAM_AUTHOR}/EasySchematic
            </a>
          </p>

          <div className="flex flex-col gap-1 text-xs text-[var(--color-text)]">
            <span>{Math.floor(DEVICE_TEMPLATES.length / 10) * 10}+ bundled device templates</span>
            <span>Community device library via {KGO_ES_UPSTREAM_NAME}</span>
            <span>68 signal types</span>
          </div>

          <div className="w-full h-px bg-[var(--color-border)]" />

          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs">
            {PRIMARY_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
            Upstream ({KGO_ES_UPSTREAM_NAME})
          </div>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs">
            {UPSTREAM_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="w-full h-px bg-[var(--color-border)]" />

          <div className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
            <div>AGPL-3.0 &middot; {KGO_ES_NAME} (trackIT / KGO fork)</div>
            <div className="mt-1">{KGO_ES_ATTRIBUTION}</div>
            <div className="mt-1">
              &copy; 2025&ndash;2026{" "}
              <a
                href={KGO_ES_UPSTREAM_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {KGO_ES_UPSTREAM_NAME}
              </a>
            </div>
            <div className="mt-0.5">Built with React, React Flow, and Zustand</div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--color-border)]">
          <button
            onClick={copyDebugInfo}
            className="px-3 py-1.5 text-xs rounded border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer text-[var(--color-text)]"
          >
            {copied ? "Copied!" : "Copy Debug Info"}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
