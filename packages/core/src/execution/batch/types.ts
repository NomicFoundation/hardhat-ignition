import { Services } from "services/types";
import { ExecutionVertex } from "types/executionGraph";
import { VertexVisitResult } from "types/graph";

export interface ExecutionState {
  unstarted: Set<number>;
  onHold: Set<number>;
  completed: Set<number>;
  errored: Set<number>;

  batch: Set<number>;

  resultsAccumulator: Map<number, any>;
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

export type ExecutionVertexDispatcher = (
  vertex: ExecutionVertex,
  resultAccumulator: Map<number, any>,
  context: { services: Services }
) => Promise<VertexVisitResult>;

export interface ExecuteBatchResult {
  completed: Set<number>;
  onhold: Set<number>;
  errored: Set<number>;
  resultsAccumulator: Map<number, any>;
}
