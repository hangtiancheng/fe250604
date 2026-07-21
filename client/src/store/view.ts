import { create } from "zustand";

export type View = "login" | "register" | "home";

export interface IViewState {
  view: View;
  setView: (view: View) => void;
}

const useViewStore = create<IViewState>((set) => ({
  view: sessionStorage.getItem("token") ? "home" : "login",
  setView: (view: View) => set({ view }),
}));

export default useViewStore;
