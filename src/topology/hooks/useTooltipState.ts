import { useCallback, useState } from "react";
import type { PortDetails } from "../domain/types";

export interface TooltipState {
  port: PortDetails | null;
  screenX: number;
  screenY: number;
}

export function useTooltipState() {
  const [tooltip, setTooltip] = useState<TooltipState>({
    port: null,
    screenX: 0,
    screenY: 0,
  });

  const showTooltip = useCallback((port: PortDetails | null, screenX: number, screenY: number) => {
    setTooltip({ port, screenX, screenY });
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltip({ port: null, screenX: 0, screenY: 0 });
  }, []);

  return { tooltip, showTooltip, hideTooltip };
}
