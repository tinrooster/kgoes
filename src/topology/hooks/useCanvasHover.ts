import { useCallback, useState } from "react";

export interface HoverContext {
  activePortId: string | null;
  activePathId: string | null;
}

export function useCanvasHover() {
  const [hover, setHover] = useState<HoverContext>({
    activePortId: null,
    activePathId: null,
  });

  const setHoveredPort = useCallback((portId: string | null, pathId: string | null) => {
    setHover({ activePortId: portId, activePathId: pathId });
  }, []);

  const clearHover = useCallback(() => {
    setHover({ activePortId: null, activePathId: null });
  }, []);

  return { hover, setHoveredPort, clearHover };
}
