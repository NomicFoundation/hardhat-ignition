import { Services } from "services/types";
import { ExecutionState } from "types/deployment";
import { ExecutionVertex } from "types/executionGraph";
import {
  VertexVisitResult,
  VertexVisitResultFailure,
  VertexVisitResultSuccess,
  VisitResult,
} from "types/graph";
import { UiService } from "ui/ui-service";
import { union } from "utils/sets";

import { ExecutionGraph } from "../ExecutionGraph";

import {
  initialiseExecutionStateFrom,
  hasUnstarted,
  updateExecutionStateWithNewBatch,
  updateExecutionStateWithBatchResults,
  hasErrors,
} from "./executionState";
import { ExecutionVertexDispatcher, ExecuteBatchResult } from "./types";
import { allDependenciesCompleted } from "./utils";

export async function visitInBatches(
  executionGraph: ExecutionGraph,
  { services }: { services: Services },
  ui: UiService,
  executionVertexDispatcher: ExecutionVertexDispatcher
): Promise<VisitResult> {
  const executionState = initialiseExecutionStateFrom(executionGraph);

  ui.startExecutionPhase(executionGraph);

  let batchCount = 1;
  while (hasUnstarted(executionState)) {
    const batch = calculateNextBatch(executionState, executionGraph);
    ui.setBatch(batchCount, batch);

    updateExecutionStateWithNewBatch(executionState, batch);

    const executeBatchResult = await executeBatch(
      batch,
      executionGraph,
      executionState.resultsAccumulator,
      { services },
      executionVertexDispatcher
    );

    updateExecutionStateWithBatchResults(executionState, executeBatchResult);
    ui.setBatch(batchCount, batch, executeBatchResult);

    if (hasErrors(executionState)) {
      const errors = [...executionState.errored].reduce(
        (acc: { [key: number]: VertexVisitResultFailure }, id) => {
          const result = executionState.resultsAccumulator.get(id);

          if (result === undefined || result._kind === "success") {
            return acc;
          }

          acc[id] = result;

          return acc;
        },
        {}
      );

      ui.failExecutionPhaseWith(errors);

      return {
        _kind: "failure",
        failures: [
          "execution failed",
          Object.values(errors).map((err) => err.failure),
        ],
      };
    }

    batchCount++;
  }

  ui.completeExecutionPhase();
  return { _kind: "success", result: executionState.resultsAccumulator };
}

function calculateNextBatch(
  executionState: ExecutionState,
  executionGraph: ExecutionGraph
): Set<number> {
  const potentials = union(executionState.unstarted, executionState.onHold);

  const batch = [...potentials].filter((vertexId) =>
    allDependenciesCompleted(vertexId, executionGraph, executionState.completed)
  );

  return new Set<number>(batch);
}

async function executeBatch(
  batch: Set<number>,
  executionGraph: ExecutionGraph,
  resultsAccumulator: Map<number, VertexVisitResult>,
  { services }: { services: Services },
  executionVertexDispatcher: ExecutionVertexDispatcher
): Promise<ExecuteBatchResult> {
  const batchVertexes = [...batch]
    .map((vertexId) => executionGraph.vertexes.get(vertexId))
    .filter((v): v is ExecutionVertex => v !== undefined);

  if (batchVertexes.length !== batch.size) {
    throw new Error("Unable to retrieve all vertexes while executing batch");
  }

  const promises = batchVertexes.map(async (vertex) => {
    const result = await executionVertexDispatcher(vertex, resultsAccumulator, {
      services,
    });

    return { vertexId: vertex.id, result };
  });

  const results = await Promise.all(promises);

  const successes = results.filter(
    (
      executionResult
    ): executionResult is {
      vertexId: number;
      result: VertexVisitResultSuccess;
    } => executionResult.result._kind === "success"
  );

  const errored = results.filter(
    (
      executionResult
    ): executionResult is {
      vertexId: number;
      result: VertexVisitResultFailure;
    } => executionResult.result._kind === "failure"
  );

  const updatedResultsAccumulator = [...successes, ...errored].reduce(
    (acc, success) => {
      acc.set(success.vertexId, success.result);
      return acc;
    },
    new Map<number, VertexVisitResult>()
  );

  return {
    completed: new Set<number>(successes.map(({ vertexId }) => vertexId)),
    onhold: new Set<number>(),
    errored: new Set<number>(errored.map(({ vertexId }) => vertexId)),
    resultsAccumulator: updatedResultsAccumulator,
  };
}
