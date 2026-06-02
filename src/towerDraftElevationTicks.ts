/** Major elevation tick marks for tower draft rulers (ft AGL). */

export function majorElevationTicksFtAgl(maxFtAgl: number, stepFt = 100): number[] {
  const max = Math.max(0, Math.round(maxFtAgl));
  if (max <= 0) return [0];
  const ticks: number[] = [0];
  for (let ft = stepFt; ft < max; ft += stepFt) {
    ticks.push(ft);
  }
  if (!ticks.includes(max)) ticks.push(max);
  return ticks;
}
