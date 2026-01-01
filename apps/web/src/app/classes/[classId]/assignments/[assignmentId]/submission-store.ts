import { create } from "zustand";

type SubmissionMode = "inline" | "floating";
type SubmissionType = "text_entry" | "file_upload" | undefined;

interface SubmissionStore {
  // Mode
  mode: SubmissionMode;
  setMode: (mode: SubmissionMode) => void;

  // Submission type
  submissionType: SubmissionType;
  setSubmissionType: (type: SubmissionType) => void;

  // Text entry state
  textContent: string;
  setTextContent: (content: string) => void;

  // File upload state
  uploadedFiles: File[];
  isDragging: boolean;
  addFiles: (files: File[]) => void;
  removeFile: (index: number) => void;
  setIsDragging: (isDragging: boolean) => void;

  // Floating panel state
  panelHeight: number;
  isMaximized: boolean;
  setPanelHeight: (height: number) => void;
  setIsMaximized: (isMaximized: boolean) => void;

  // Reset function
  reset: () => void;
}

const DEFAULT_HEIGHT = 400;

export const useSubmissionStore = create<SubmissionStore>((set) => ({
  // Mode
  mode: "inline",
  setMode: (mode) => set({ mode }),

  // Submission type
  submissionType: undefined,
  setSubmissionType: (submissionType) => set({ submissionType }),

  // Text entry
  textContent: "",
  setTextContent: (textContent) => set({ textContent }),

  // File upload
  uploadedFiles: [],
  isDragging: false,
  addFiles: (files) =>
    set((state) => ({
      uploadedFiles: [...state.uploadedFiles, ...files],
    })),
  removeFile: (index) =>
    set((state) => ({
      uploadedFiles: state.uploadedFiles.filter((_, i) => i !== index),
    })),
  setIsDragging: (isDragging) => set({ isDragging }),

  // Floating panel
  panelHeight: DEFAULT_HEIGHT,
  isMaximized: false,
  setPanelHeight: (panelHeight) => set({ panelHeight }),
  setIsMaximized: (isMaximized) => set({ isMaximized }),

  // Reset
  reset: () =>
    set({
      submissionType: undefined,
      textContent: "",
      uploadedFiles: [],
      isDragging: false,
      panelHeight: DEFAULT_HEIGHT,
      isMaximized: false,
    }),
}));
