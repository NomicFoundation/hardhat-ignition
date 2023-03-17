import type { CallPoints } from "./deploymentGraph";
import type {
  ResultsAccumulator,
  VertexVisitResult,
  VisitResult,
} from "./graph";
import type { Services } from "./services";

export type ValidationVisitResult = VisitResult<undefined>;

export type ValidationVertexVisitResult = VertexVisitResult<undefined>;

export type ValidationResultsAccumulator = ResultsAccumulator<undefined>;

export interface ValidationDispatchContext {
  services: Services;
  callPoints: CallPoints;
}
