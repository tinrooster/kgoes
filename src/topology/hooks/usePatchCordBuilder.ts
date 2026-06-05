import { useCallback, useRef, useState } from "react";

export interface DragPatchGesture {
  sourcePortId: string;
  sourceX: number;
  sourceY: number;
  currentX: number;
  currentY: number;
  hoveredPortId: string | null;
}

export function usePatchCordBuilder(
  onCompletePatch: (srcId: string, destId: string) => void,
) {
  const [activeGesture, setActiveGesture] = useState<DragPatchGesture | null>(null);
  const [selectedSourcePortId, setSelectedSourcePortId] = useState<string | null>(null);
  const gestureRef = useRef<DragPatchGesture | null>(null);

  const startPatchDrag = useCallback((portId: string, x: number, y: number) => {
    const gesture: DragPatchGesture = {
      sourcePortId: portId,
      sourceX: x,
      sourceY: y,
      currentX: x,
      currentY: y,
      hoveredPortId: null,
    };
    gestureRef.current = gesture;
    setActiveGesture(gesture);
    setSelectedSourcePortId(portId);
  }, []);

  const updatePatchDrag = useCallback((x: number, y: number, hoveredPortId?: string | null) => {
    setActiveGesture((prev) => {
      if (!prev) return null;
      const next = {
        ...prev,
        currentX: x,
        currentY: y,
        hoveredPortId: hoveredPortId !== undefined ? hoveredPortId : prev.hoveredPortId,
      };
      gestureRef.current = next;
      return next;
    });
  }, []);

  const setHoveredPort = useCallback((portId: string | null) => {
    setActiveGesture((prev) => {
      if (!prev) return null;
      const next = { ...prev, hoveredPortId: portId };
      gestureRef.current = next;
      return next;
    });
  }, []);

  const completePatchDrag = useCallback(
    (destPortId: string | null) => {
      const gesture = gestureRef.current;
      if (gesture && destPortId && gesture.sourcePortId !== destPortId) {
        onCompletePatch(gesture.sourcePortId, destPortId);
      }
      gestureRef.current = null;
      setActiveGesture(null);
      setSelectedSourcePortId(null);
    },
    [onCompletePatch],
  );

  const selectSourcePort = useCallback((portId: string | null) => {
    setSelectedSourcePortId(portId);
    gestureRef.current = null;
    setActiveGesture(null);
  }, []);

  const cancelPatchDrag = useCallback(() => {
    gestureRef.current = null;
    setActiveGesture(null);
    setSelectedSourcePortId(null);
  }, []);

  return {
    activeGesture,
    selectedSourcePortId,
    startPatchDrag,
    updatePatchDrag,
    setHoveredPort,
    completePatchDrag,
    selectSourcePort,
    cancelPatchDrag,
  };
}
