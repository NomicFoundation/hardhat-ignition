import { ExecutionGraph } from "execution/ExecutionGraph";
import { ExecutionState } from "types/deployment";
import { difference, union } from "utils/sets";

import { ExecuteBatchResult } from "./types";

export function initialiseExecutionStateFrom(
  executionGraph: ExecutionGraph
): ExecutionState {
  const unstarted = new Set<number>(executionGraph.vertexes.keys());

  const executionState: ExecutionState = {
    unstarted,
    onHold: new Set<number>(),
    completed: new Set<number>(),
    errored: new Set<number>(),
    batch: new Set<number>(),

    resultsAccumulator: [...unstarted].reduce<Map<number, any>>((acc, id) => {
      acc.set(id, null);

      return acc;
    }, new Map<number, any>()),
  };

  return executionState;
}

export function hasUnstarted(executionState: ExecutionState): boolean {
  return executionState.unstarted.size > 0;
}

export function hasErrors(executionState: ExecutionState): boolean {
  return executionState.errored.size > 0;
}

export function updateExecutionStateWithNewBatch(
  executionState: ExecutionState,
  batch: Set<number>
) {
  executionState.unstarted = difference(executionState.unstarted, batch);
  executionState.onHold = difference(executionState.onHold, batch);

  executionState.batch = union(executionState.batch, batch);
}

export function updateExecutionStateWithBatchResults(
  executionState: ExecutionState,
  {
    errored,
    completed,
    onhold,
    resultsAccumulator: batchResultsAcc,
  }: ExecuteBatchResult
) {
  transferFromBatchToCompleted(executionState, completed);
  transferFromBatchToOnHold(executionState, onhold);
  transferFromBatchToErrored(executionState, errored);

  mergeBatchResultsInResultsAccumulator(executionState, batchResultsAcc);
}

export function mergeBatchResultsInResultsAccumulator(
  executionState: ExecutionState,
  batchResultsAcc: Map<number, any>
) {
  batchResultsAcc.forEach((result, vertexId) => {
    executionState.resultsAccumulator.set(vertexId, result);
  });
}

export function transferFromBatchToCompleted(
  executionState: ExecutionState,
  completed: Set<number>
) {
  executionState.batch = difference(executionState.batch, completed);

  executionState.completed = union(executionState.completed, completed);
}

export function transferFromBatchToOnHold(
  executionState: ExecutionState,
  onHold: Set<number>
) {
  executionState.batch = difference(executionState.batch, onHold);

  executionState.onHold = union(executionState.onHold, onHold);
}

export function transferFromBatchToErrored(
  executionState: ExecutionState,
  errored: Set<number>
) {
  executionState.batch = difference(executionState.batch, errored);

  executionState.errored = union(executionState.errored, errored);
}
