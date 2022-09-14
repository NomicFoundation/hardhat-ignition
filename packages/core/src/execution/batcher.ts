import { getDependenciesFor } from "graph/adjacencyList";
import { Services } from "services/types";
import { ExecutionVertex } from "types/executionGraph";
import { VertexVisitResult, VisitResult } from "types/graph";

import { ExecutionGraph } from "./ExecutionGraph";

interface ExecutionState {
  unstarted: Set<number>;
  onHold: Set<number>;
  completed: Set<number>;
  errored: Set<number>;

  batch: Set<number>;

  context: Map<number, any>;
}

export type BatcherResult =
  | {
      _kind: "success";
      context: Map<number, any>;
    }
  | {
      _kind: "failure";
      errors: any[];
    };

type ExecutionVertexDispatcher = (
  vertex: ExecutionVertex,
  resultAccumulator: Map<number, any>,
  context: { services: Services }
) => Promise<VertexVisitResult>;

export async function batcher(
  executionGraph: ExecutionGraph,
  { services }: { services: Services },
  executionVertexDispatcher: ExecutionVertexDispatcher
): Promise<VisitResult> {
  const executionState = initialiseExecutionStateFrom(executionGraph);

  while (hasUnstarted(executionState)) {
    const batch = buildBatch(executionState, executionGraph);

    transferToBatch(executionState, batch);

    const {
      errored,
      completed,
      onhold,
      resultsAccumulator: batchResultsAcc,
    } = await executeBatch(
      batch,
      executionGraph,
      executionState.context,
      { services },
      executionVertexDispatcher
    );

    transferToCompleted(executionState, completed);
    transferToOnHold(executionState, onhold);
    transferToErrored(executionState, errored);

    batchResultsAcc.forEach((result, vertexId) => {
      executionState.context.set(vertexId, result);
    });

    if (hasErrors(executionState)) {
      return { _kind: "failure", failures: ["execution failed", []] };
    }
  }

  return { _kind: "success", result: executionState.context };
}

function buildBatch(
  executionState: ExecutionState,
  executionGraph: ExecutionGraph
): Set<number> {
  const potentials = union(executionState.unstarted, executionState.onHold);

  const batch = [...potentials].filter((vertexId) =>
    allDependenciesCompleted(vertexId, executionGraph, executionState.completed)
  );

  return new Set<number>(batch);
}

function allDependenciesCompleted(
  vertexId: number,
  executionGraph: ExecutionGraph,
  completed: Set<number>
) {
  const depenencies = getDependenciesFor(
    executionGraph.adjacencyList,
    vertexId
  );

  return depenencies.every((vid) => completed.has(vid));
}

async function executeBatch(
  batch: Set<number>,
  executionGraph: ExecutionGraph,
  resultsAccumulator: Map<number, any>,
  { services }: { services: Services },
  executionVertexDispatcher: ExecutionVertexDispatcher
): Promise<{
  completed: Set<number>;
  onhold: Set<number>;
  errored: Set<number>;
  resultsAccumulator: Map<number, any>;
}> {
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

function initialiseExecutionStateFrom(
  executionGraph: ExecutionGraph
): ExecutionState {
  const unstarted = new Set<number>(executionGraph.vertexes.keys());

  const executionState: ExecutionState = {
    unstarted,
    onHold: new Set<number>(),
    completed: new Set<number>(),
    errored: new Set<number>(),
    batch: new Set<number>(),

    context: [...unstarted].reduce<Map<number, any>>((acc, id) => {
      acc.set(id, null);

      return acc;
    }, new Map<number, any>()),
  };

  return executionState;
}

function hasUnstarted(executionState: ExecutionState): boolean {
  return executionState.unstarted.size > 0;
}

function hasErrors(executionState: ExecutionState): boolean {
  return executionState.errored.size > 0;
}

function transferToBatch(executionState: ExecutionState, batch: Set<number>) {
  executionState.unstarted = difference(executionState.unstarted, batch);
  executionState.onHold = difference(executionState.onHold, batch);

  executionState.batch = union(executionState.batch, batch);
}

function transferToCompleted(
  executionState: ExecutionState,
  completed: Set<number>
) {
  executionState.batch = difference(executionState.batch, completed);

  executionState.completed = union(executionState.completed, completed);
}

function transferToOnHold(executionState: ExecutionState, onHold: Set<number>) {
  executionState.batch = difference(executionState.batch, onHold);

  executionState.onHold = union(executionState.onHold, onHold);
}

function transferToErrored(
  executionState: ExecutionState,
  errored: Set<number>
) {
  executionState.batch = difference(executionState.batch, errored);

  executionState.errored = union(executionState.errored, errored);
}

function union(setA: Set<number>, setB: Set<number>) {
  const _union = new Set(setA);
  for (const elem of setB) {
    _union.add(elem);
  }
  return _union;
}

function difference(setA: Set<number>, setB: Set<number>) {
  const _difference = new Set(setA);

  for (const elem of setB) {
    _difference.delete(elem);
  }

  return _difference;
}
