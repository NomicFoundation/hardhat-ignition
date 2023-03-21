import { DeploymentGraphVertex } from "../../internal/types/deploymentGraph";
import { VertexResultEnum } from "../../internal/types/graph";
import {
  ValidationDispatchContext,
  ValidationResultsAccumulator,
  ValidationVertexVisitResult,
} from "../../types/validation";

export async function validateVirtual(
  _deploymentVertex: DeploymentGraphVertex,
  _resultAccumulator: ValidationResultsAccumulator,
  _context: ValidationDispatchContext
): Promise<ValidationVertexVisitResult> {
  return {
    _kind: VertexResultEnum.SUCCESS,
    result: undefined,
  };
}
