import { ExecutionGraph } from "execution/ExecutionGraph";
import type {
  DeployPhase,
  DeployState,
  ExecutionState,
  DeployStateCommand,
  VertexExecutionState,
} from "types/deployment";

import { deployExecutionStateReducer } from "./deployExecutionStateReducer";
import { assertNeverMessageType } from "./utils";

export function initializeDeployState(moduleName: string): DeployState {
  return {
    phase: "uninitialized",
    details: {
      moduleName,
      chainId: 0,
      networkName: "",
    },
    validation: {
      errors: [],
    },
    transform: {
      executionGraph: null,
    },
    execution: {
      vertexes: {},
      batch: null,
      previousBatches: [],
    },
  };
}

export function deployStateReducer(
  state: DeployState,
  action: DeployStateCommand
): DeployState {
  switch (action.type) {
    case "SET_CHAIN_ID":
      return {
        ...state,
        details: {
          ...state.details,
          chainId: action.chainId,
        },
      };
    case "SET_NETWORK_NAME":
      return {
        ...state,
        details: {
          ...state.details,
          networkName: action.networkName,
        },
      };
    case "START_VALIDATION":
      return {
        ...state,
        phase: "validating",
      };
    case "VALIDATION_FAIL":
      return {
        ...state,
        phase: "validation-failed",
        validation: {
          ...state.validation,
          errors: action.errors,
        },
      };
    case "TRANSFORM_COMPLETE":
      return {
        ...state,
        transform: { executionGraph: action.executionGraph },
      };
    case "EXECUTION::START":
      if (state.transform.executionGraph === null) {
        return state;
      }

      return {
        ...state,
        phase: "execution",
        execution: deployExecutionStateReducer(
          initialiseExecutionStateFrom(state.transform.executionGraph),
          action
        ),
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
    default:
      assertNeverMessageType(action);
      return state;
  }
}

function initialiseExecutionStateFrom(
  executionGraph: ExecutionGraph
): ExecutionState {
  const vertexes = Array.from(executionGraph.vertexes.keys()).reduce<{
    [key: number]: VertexExecutionState;
  }>(
    (acc, id) => ({ ...acc, [id]: { status: "UNSTARTED", result: null } }),
    {}
  );

  const executionState: ExecutionState = {
    vertexes,
    batch: null,
    previousBatches: [],
  };

  return executionState;
}

function resolvePhaseFrom(executionState: ExecutionState): DeployPhase {
  if (
    Object.values(executionState.vertexes).some((v) => v.status === "FAILED")
  ) {
    return "failed";
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
