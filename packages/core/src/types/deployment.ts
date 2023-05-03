import type { ExecutionState } from "../internal/types/deployment";
import type { ExecutionVertexVisitResult } from "../internal/types/executionGraph";
import type {
  IGraph,
  VertexDescriptor,
  VertexVisitResultFailure,
} from "../internal/types/graph";
import type { ExecutionVertex } from "../soon-to-be-removed";
import type { Artifact } from "./hardhat";
import type { ModuleDict } from "./module";

export interface IDeployment {
  state: {
    details: {
      chainId: number;
      accounts: string[];
      artifacts: Artifact[];
    };
    transform: {
      executionGraph: IGraph<ExecutionVertex>;
      moduleOutputs: ModuleDict;
    };
    execution: ExecutionState;
  };
  services: unknown; // todo: can we get rid of this???
  failUnexpected: (errors: Error[]) => Promise<void>;
  failValidation: (errors: Error[]) => Promise<void>;
  hasErrors: () => boolean;
  hasHolds: () => boolean;
  hasUnstarted: () => boolean;
  readExecutionErrors: () => { [key: number]: VertexVisitResultFailure };
  readExecutionHolds: () => VertexDescriptor[];
  startValidation: () => Promise<void>;
  startExecutionPhase: (executionGraphHash: string) => Promise<void>;
  updateExecutionWithNewBatch: (batch: number[]) => Promise<void>;
  updateVertexResult: (
    vertexId: number,
    result: ExecutionVertexVisitResult
  ) => Promise<void>;
}
