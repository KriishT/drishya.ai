import { create } from "zustand";
import { DataStructureType, screenStyle } from "@/types";
import { ArrayVisualizationStep, TreeVisualizationStep } from "./api";

interface VisualizerStore {
  // Code editor state
  code: string;
  testCase: string;
  language: string;
  inputType: DataStructureType | null;
  outputType: DataStructureType | null;
  screenStyle: screenStyle;

  // Visualization state
  steps: ArrayVisualizationStep[] | TreeVisualizationStep[];
  currentStepIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  dataStructureType: string | null;
  result: any;
  aiAnalysis: any;

  // Loading/Error state
  isLoading: boolean;
  error: string | null;

  // Actions
  setCode: (code: string) => void;
  setTestCase: (testCase: string) => void;
  setLanguage: (language: string) => void;
  setInputType: (type: DataStructureType | null) => void;
  setOutputType: (type: DataStructureType | null) => void;

  // Visualization actions
  setSteps: (steps: ArrayVisualizationStep[] | TreeVisualizationStep[]) => void;
  setCurrentStepIndex: (index: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setDataStructureType: (type: string) => void;
  setResult: (result: any) => void;
  setAiAnalysis: (analysis: any) => void;
  setSceenStyle: (screenStyle: screenStyle) => void;

  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Computed
  getCurrentStep: () => ArrayVisualizationStep | TreeVisualizationStep | null;
  reset: () => void;
}

export const useVisualizerStore = create<VisualizerStore>((set, get) => ({
  // Initial state
  code: "",
  testCase: "[2, 7, 11, 15], 9",
  language: "javascript",
  inputType: null,
  outputType: null,
  screenStyle: "regular",

  steps: [],
  currentStepIndex: 0,
  isPlaying: false,
  playbackSpeed: 1,
  dataStructureType: null,
  result: null,
  aiAnalysis: null,

  isLoading: false,
  error: null,

  // Basic setters
  setCode: (code) => set({ code }),
  setTestCase: (testCase) => set({ testCase }),
  setLanguage: (language) => set({ language }),
  setInputType: (inputType) => set({ inputType }),
  setOutputType: (outputType) => set({ outputType }),

  // Visualization setters
  setSteps: (steps) => set({ steps, currentStepIndex: 0 }),
  setCurrentStepIndex: (index) => set({ currentStepIndex: index }),

  //to avoid overstepping
  nextStep: () =>
    set((state) => ({
      currentStepIndex: Math.min(
        state.currentStepIndex + 1,
        state.steps.length - 1
      ),
    })),

  //to avoid understepping
  prevStep: () =>
    set((state) => ({
      currentStepIndex: Math.max(state.currentStepIndex - 1, 0),
    })),

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  setDataStructureType: (dataStructureType) => set({ dataStructureType }),
  setResult: (result) => set({ result }),
  setAiAnalysis: (aiAnalysis) => set({ aiAnalysis }),
  setSceenStyle: (screenStyle) => set({ screenStyle }),

  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Computed
  getCurrentStep: () => {
    const { steps, currentStepIndex } = get();
    return steps[currentStepIndex] || null;
  },

  reset: () =>
    set({
      steps: [],
      currentStepIndex: 0,
      isPlaying: false,
      dataStructureType: null,
      result: null,
      aiAnalysis: null,
      error: null,
    }),
}));
