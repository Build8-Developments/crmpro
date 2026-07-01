import { create } from "zustand";

interface StageRef {
  pipelineId: string;
  stageId: string;
}

interface PipelineUiState {
  selectedPipelineId: string | null;
  createPipelineOpen: boolean;
  editPipelineId: string | null;
  createStagePipelineId: string | null;
  editStage: StageRef | null;
  deletePipelineId: string | null;
  deleteStage: StageRef | null;
  setSelectedPipelineId: (id: string | null) => void;
  openCreatePipeline: () => void;
  closeCreatePipeline: () => void;
  openEditPipeline: (pipelineId: string) => void;
  closeEditPipeline: () => void;
  openCreateStage: (pipelineId: string) => void;
  closeCreateStage: () => void;
  openEditStage: (pipelineId: string, stageId: string) => void;
  closeEditStage: () => void;
  openDeletePipeline: (pipelineId: string) => void;
  closeDeletePipeline: () => void;
  openDeleteStage: (pipelineId: string, stageId: string) => void;
  closeDeleteStage: () => void;
}

export const usePipelineUiStore = create<PipelineUiState>((set) => ({
  selectedPipelineId: null,
  createPipelineOpen: false,
  editPipelineId: null,
  createStagePipelineId: null,
  editStage: null,
  deletePipelineId: null,
  deleteStage: null,
  setSelectedPipelineId: (id) => set({ selectedPipelineId: id }),
  openCreatePipeline: () => set({ createPipelineOpen: true }),
  closeCreatePipeline: () => set({ createPipelineOpen: false }),
  openEditPipeline: (pipelineId) => set({ editPipelineId: pipelineId }),
  closeEditPipeline: () => set({ editPipelineId: null }),
  openCreateStage: (pipelineId) => set({ createStagePipelineId: pipelineId }),
  closeCreateStage: () => set({ createStagePipelineId: null }),
  openEditStage: (pipelineId, stageId) =>
    set({ editStage: { pipelineId, stageId } }),
  closeEditStage: () => set({ editStage: null }),
  openDeletePipeline: (pipelineId) => set({ deletePipelineId: pipelineId }),
  closeDeletePipeline: () => set({ deletePipelineId: null }),
  openDeleteStage: (pipelineId, stageId) =>
    set({ deleteStage: { pipelineId, stageId } }),
  closeDeleteStage: () => set({ deleteStage: null }),
}));
