/**
 * Map pointer events to SVG-local coordinates (handles viewBox scaling).
 */
export function pointerToSvgCoords(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const rect = svg.getBoundingClientRect();
  const viewBox = svg.viewBox.baseVal;
  const hasViewBox = viewBox.width > 0 && viewBox.height > 0;

  if (!hasViewBox) {
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  const scaleX = viewBox.width / rect.width;
  const scaleY = viewBox.height / rect.height;
  return {
    x: viewBox.x + (clientX - rect.left) * scaleX,
    y: viewBox.y + (clientY - rect.top) * scaleY,
  };
}

/** Screen pixels for HTML tooltip overlay above an SVG point. */
export function svgPointToScreen(
  svg: SVGSVGElement,
  svgX: number,
  svgY: number,
): { x: number; y: number } {
  const rect = svg.getBoundingClientRect();
  const viewBox = svg.viewBox.baseVal;
  const hasViewBox = viewBox.width > 0 && viewBox.height > 0;

  if (!hasViewBox) {
    return { x: rect.left + svgX, y: rect.top + svgY };
  }

  const scaleX = rect.width / viewBox.width;
  const scaleY = rect.height / viewBox.height;
  return {
    x: rect.left + (svgX - viewBox.x) * scaleX,
    y: rect.top + (svgY - viewBox.y) * scaleY,
  };
}
