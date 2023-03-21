import { CallPoints } from "../internal/types/deploymentGraph";
import {
  ResultsAccumulator,
  VertexVisitResult,
  VisitResult,
} from "../internal/types/graph";

import { Services } from "./services";

export type ValidationVisitResult = VisitResult<undefined>;

export type ValidationVertexVisitResult = VertexVisitResult<undefined>;

export type ValidationResultsAccumulator = ResultsAccumulator<undefined>;

export interface ValidationDispatchContext {
  services: Services;
  callPoints: CallPoints;
}
