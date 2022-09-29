import { VertexVisitResult } from "./graph";
import {
  SerializedDeploymentResult,
  SerializedRecipeResult,
} from "./serialization";

export interface IgnitionRecipesResults {
  load: (recipeId: string) => Promise<SerializedRecipeResult | undefined>;
  save: (
    recipeId: string,
    recipeResult: SerializedRecipeResult
  ) => Promise<void>;
}

export type DeploymentResult =
  | { _kind: "failure"; failures: [string, Error[]] }
  | { _kind: "hold"; holds: [string, string[]] }
  | { _kind: "success"; result: SerializedDeploymentResult };

export type DeployPhase =
  | "uninitialized"
  | "validating"
  | "execution"
  | "complete"
  | "failed"
  | "validation-failed";

export interface ValidationState {
  errors: Error[];
}

export interface ExecutionState {
  unstarted: Set<number>;
  onHold: Set<number>;
  completed: Set<number>;
  errored: Set<number>;

  batch: Set<number>;

  resultsAccumulator: Map<number, VertexVisitResult>;
}

export interface DeployState {
  phase: DeployPhase;
  details: {
    recipeName: string;
    chainId: number;
  };
  validation: ValidationState;
  execution: ExecutionState;
}
