import { DeploymentGraphVertex } from "../../types/deploymentGraph";
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
    _kind: "success",
    result: undefined,
  };
}
