/** Tab/menu label for print-sheet pages (migrates legacy "Sheet N" names in UI). */
export function printPageTabLabel(label: string): string {
  return /^Sheet(\s|$)/i.test(label) ? label.replace(/^Sheet/i, "Print View") : label;
}
