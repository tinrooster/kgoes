import { useSchematicStore } from "../store";
import type { DeviceData } from "../types";
import RackRenderer from "./RackRenderer";
import RackSidebar from "./RackSidebar";
import RackViewToolbar from "./RackViewToolbar";
import FacePlateEditor from "./FacePlateEditor";

export default function RackPage() {
  const activePage = useSchematicStore((s) => s.activePage);
  const pages = useSchematicStore((s) => s.pages);
  const nodes = useSchematicStore((s) => s.nodes);
  const facePlateEditNodeId = useSchematicStore((s) => s.facePlateEditNodeId);
  const setFacePlateEditNodeId = useSchematicStore((s) => s.setFacePlateEditNodeId);
  const patchDeviceData = useSchematicStore((s) => s.patchDeviceData);

  const page = pages.find((p) => p.id === activePage);
  if (!page || page.type !== "rack-elevation") return null;

  const facePlateNode = facePlateEditNodeId
    ? nodes.find((n) => n.id === facePlateEditNodeId && n.type === "device")
    : null;
  const facePlateData = facePlateNode?.data as DeviceData | undefined;

  return (
    <div className="flex flex-1 flex-col overflow-hidden min-h-0">
      <RackViewToolbar />
      <div className="flex flex-1 overflow-hidden min-h-0">
        <RackSidebar page={page} />
        <RackRenderer page={page} />
      </div>
      {facePlateData && facePlateEditNodeId && (
        <FacePlateEditor
          nodeId={facePlateEditNodeId}
          deviceData={facePlateData}
          onSave={(layout) => {
            patchDeviceData(facePlateEditNodeId, { facePlateLayout: layout });
            setFacePlateEditNodeId(null);
          }}
          onClose={() => setFacePlateEditNodeId(null)}
        />
      )}
    </div>
  );
}
