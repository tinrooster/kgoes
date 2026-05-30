import { create } from "zustand";

export type DeviceAdminTab = "manage" | "agent";

interface UiChromeState {
  deviceAdminOpen: boolean;
  deviceAdminTab: DeviceAdminTab;
  deviceAdminFocusId: string | null;
  openDeviceAdmin: (opts?: { tab?: DeviceAdminTab; focusId?: string | null }) => void;
  setDeviceAdminTab: (tab: DeviceAdminTab) => void;
  closeDeviceAdmin: () => void;
}

export const useUiChromeStore = create<UiChromeState>((set, get) => ({
  deviceAdminOpen: false,
  deviceAdminTab: "manage",
  deviceAdminFocusId: null,
  openDeviceAdmin: (opts) =>
    set({
      deviceAdminOpen: true,
      deviceAdminTab: opts?.tab ?? get().deviceAdminTab,
      deviceAdminFocusId: opts?.focusId !== undefined ? opts.focusId : get().deviceAdminFocusId,
    }),
  setDeviceAdminTab: (tab) => set({ deviceAdminTab: tab }),
  closeDeviceAdmin: () =>
    set({
      deviceAdminOpen: false,
      deviceAdminFocusId: null,
    }),
}));
