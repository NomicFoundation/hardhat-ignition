import type {
  ExecutionState,
  DeployStateExecutionCommand,
  VertexExecutionState,
  VertexExecutionStatusUnstarted,
  VertexExecutionStatusFailed,
  VertexExecutionStatusCompleted,
} from "types/deployment";

import { assertNeverMessageType } from "./utils";

export function deployExecutionStateReducer(
  state: ExecutionState,
  action: DeployStateExecutionCommand
): ExecutionState {
  switch (action.type) {
    case "EXECUTION::START":
      // initialisation is done at the deployStateReducer level
      return state;
    case "EXECUTION::SET_BATCH":
      return updateExecutionStateWithNewBatch(state, action.batch);
    case "EXECUTION::SET_VERTEX_RESULT":
      const updatedVertexes = {
        ...state.vertexes,
        [action.vertexId]:
          action.result._kind === "success"
            ? {
                status: "COMPLETED" as VertexExecutionStatusCompleted,
                result: action.result,
              }
            : {
                status: "FAILED" as VertexExecutionStatusFailed,
                result: action.result,
              },
      };

      if (
        state.batch !== null &&
        [...state.batch].every(
          (id) =>
            updatedVertexes[id]?.status === "COMPLETED" ||
            updatedVertexes[id]?.status === "FAILED"
        )
      ) {
        return {
          ...state,
          batch: null,
          previousBatches: [state.batch, ...state.previousBatches],
          vertexes: updatedVertexes,
        };
      }

      return {
        ...state,
        vertexes: updatedVertexes,
      };
    default:
      assertNeverMessageType(action);
      return state;
  }
}

function updateExecutionStateWithNewBatch(
  state: ExecutionState,
  batch: number[]
): ExecutionState {
  const uniqueBatch = new Set<number>(batch);

  const updatedVertexes = [...uniqueBatch].reduce(
    (vertexes, id): { [key: number]: VertexExecutionState } => ({
      ...vertexes,
      [id]: {
        status: "RUNNING" as VertexExecutionStatusUnstarted,
        result: null,
      },
    }),
    state.vertexes
  );

  return {
    ...state,
    batch: uniqueBatch,
    vertexes: updatedVertexes,
  };
}
