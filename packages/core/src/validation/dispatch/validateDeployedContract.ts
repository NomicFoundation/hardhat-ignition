import type { DeployedContractDeploymentVertex } from "../../types/deploymentGraph";
import type {
  ValidationDispatchContext,
  ValidationResultsAccumulator,
  ValidationVertexVisitResult,
} from "../../types/validation";

import { isAddress } from "@ethersproject/address";

import { buildValidationError } from "./helpers";

export async function validateDeployedContract(
  vertex: DeployedContractDeploymentVertex,
  _resultAccumulator: ValidationResultsAccumulator,
  { callPoints }: ValidationDispatchContext
): Promise<ValidationVertexVisitResult> {
  if (typeof vertex.address === "string" && !isAddress(vertex.address)) {
    return buildValidationError(
      vertex,
      `The existing contract ${vertex.label} has an invalid address ${vertex.address}`,
      callPoints
    );
  }

  return {
    _kind: "success",
    result: undefined,
  };
}
