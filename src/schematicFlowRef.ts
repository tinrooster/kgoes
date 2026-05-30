import type { ReactFlowInstance } from "@xyflow/react";

/** Live React Flow API from SchematicCanvas — not in Zustand (avoids render loops). */
export const schematicFlowRef: { current: ReactFlowInstance | null } = { current: null };
