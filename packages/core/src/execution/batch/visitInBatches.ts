import { Services } from "services/types";
import { ExecutionVertex } from "types/executionGraph";
import { VisitResult } from "types/graph";
import { union } from "utils/sets";

import { ExecutionGraph } from "../ExecutionGraph";

import {
  initialiseExecutionStateFrom,
  hasUnstarted,
  updateExecutionStateWithNewBatch,
  updateExecutionStateWithBatchResults,
  hasErrors,
} from "./executionState";
import {
  ExecutionVertexDispatcher,
  ExecutionState,
  ExecuteBatchResult,
} from "./types";
import { allDependenciesCompleted } from "./utils";

export async function visitInBatches(
  executionGraph: ExecutionGraph,
  { services }: { services: Services },
  executionVertexDispatcher: ExecutionVertexDispatcher
): Promise<VisitResult> {
  const executionState = initialiseExecutionStateFrom(executionGraph);

  while (hasUnstarted(executionState)) {
    const batch = calculateNextBatch(executionState, executionGraph);

    updateExecutionStateWithNewBatch(executionState, batch);

    const executeBatchResult = await executeBatch(
      batch,
      executionGraph,
      executionState.resultsAccumulator,
      { services },
      executionVertexDispatcher
    );

    updateExecutionStateWithBatchResults(executionState, executeBatchResult);

    if (hasErrors(executionState)) {
      return { _kind: "failure", failures: ["execution failed", []] };
    }
  }

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
  resultsAccumulator: Map<number, any>,
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
      result: { _kind: "success"; result: any };
    } => executionResult.result._kind === "success"
  );

  return {
    completed: new Set<number>(successes.map(({ vertexId }) => vertexId)),
    onhold: new Set<number>(),
    errored: new Set<number>(
      results
        .filter(({ result }) => result._kind === "failure")
        .map(({ vertexId }) => vertexId)
    ),

    resultsAccumulator: successes.reduce((acc, success) => {
      acc.set(success.vertexId, success.result.result);
      return acc;
    }, new Map<number, any>()),
  };
}
