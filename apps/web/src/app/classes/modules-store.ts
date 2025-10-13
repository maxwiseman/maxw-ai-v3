import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useModulesState = create<{
	modulesByClass: Record<string, string>;
	setModulesByClass: (val: Record<string, string>) => void;
}>()(
	persist(
		(set) => ({
			modulesByClass: {},
			setModulesByClass: (val: Record<string, string>) => {
				set((prev) => ({ modulesByClass: { ...prev.modulesByClass, ...val } }));
			},
		}),
		{ name: "module-store" },
	),
);
