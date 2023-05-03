import type {
  DeployPhase,
  DeployState,
  ExecutionState,
  DeployStateCommand,
  VertexExecutionState,
} from "../types/deployment";

import { ExecutionGraph } from "../execution/ExecutionGraph";

import { deployExecutionStateReducer } from "./deployExecutionStateReducer";

export function initializeExecutionState(): ExecutionState {
  return {
    run: 0,
    vertexes: {},
    batch: null,
    previousBatches: [],
    executionGraphHash: "",
  };
}

export function deployStateReducer(
  state: DeployState,
  action: DeployStateCommand
): DeployState {
  switch (action.type) {
    case "EXECUTION::START":
      if (state.transform.executionGraph === null) {
        return state;
      }

      const executionStateForRun = deployExecutionStateReducer(
        initialiseExecutionStateFrom(
          state.transform.executionGraph,
          action.executionGraphHash,
          state.execution,
          state.details.force
        ),
        action
      );

      return {
        ...state,
        phase: resolvePhaseFrom(executionStateForRun),
        execution: executionStateForRun,
      };
    case "EXECUTION::SET_BATCH":
      return {
        ...state,
        execution: deployExecutionStateReducer(state.execution, action),
      };
    case "EXECUTION::SET_VERTEX_RESULT":
      const updatedExecution = deployExecutionStateReducer(
        state.execution,
        action
      );

      return {
        ...state,
        phase: resolvePhaseFrom(updatedExecution),
        execution: updatedExecution,
      };
  }
}

function initialiseExecutionStateFrom(
  executionGraph: ExecutionGraph,
  executionGraphHash: string,
  previousExecutionState: ExecutionState,
  force: boolean
): ExecutionState {
  const vertexes = Array.from(executionGraph.vertexes.keys()).reduce<{
    [key: number]: VertexExecutionState;
  }>((acc, id) => {
    if (!force && previousExecutionState.vertexes[id]?.status === "COMPLETED") {
      return { ...acc, [id]: previousExecutionState.vertexes[id] };
    }

    return { ...acc, [id]: { status: "UNSTARTED", result: undefined } };
  }, {});

  const executionState: ExecutionState = {
    ...previousExecutionState,
    run: previousExecutionState.run + 1,
    vertexes,
    batch: null,
    previousBatches: [],
    executionGraphHash,
  };

  return executionState;
}

function resolvePhaseFrom(executionState: ExecutionState): DeployPhase {
  if (
    Object.values(executionState.vertexes).some((v) => v.status === "FAILED")
  ) {
    return "failed";
  }

  if (Object.values(executionState.vertexes).some((v) => v.status === "HOLD")) {
    return "hold";
  }

  if (
    Object.values(executionState.vertexes).every(
      (v) => v.status !== "UNSTARTED"
    )
  ) {
    return "complete";
  }

  return "execution";
}
