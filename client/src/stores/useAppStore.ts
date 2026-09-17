import { create } from "zustand";
import { Garage, User } from "../lib/api";
import { Page } from "../types/app";

type AppState = {
  user: User | null;
  garages: Garage[];
  selectedGarageId: string;
  page: Page;
  error: string;
  refreshKey: number;
  setUser: (user: User | null) => void;
  setGarages: (garages: Garage[]) => void;
  setSelectedGarageId: (garageId: string) => void;
  setPage: (page: Page) => void;
  setError: (error: string) => void;
  refresh: () => void;
  resetSession: () => void;
};

const initialState = {
  user: null,
  garages: [],
  selectedGarageId: "",
  page: "overview" as Page,
  error: "",
  refreshKey: 0,
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,
  setUser: (user) => set({ user }),
  setGarages: (garages) =>
    set((state) => ({
      garages,
      selectedGarageId: state.selectedGarageId || garages[0]?.id || "",
    })),
  setSelectedGarageId: (selectedGarageId) => set({ selectedGarageId }),
  setPage: (page) => set({ page }),
  setError: (error) => set({ error }),
  refresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
  resetSession: () => set(initialState),
}));
