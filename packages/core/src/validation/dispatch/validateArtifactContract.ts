import type { ArtifactContractDeploymentVertex } from "../../types/deploymentGraph";
import type {
  ValidationDispatchContext,
  ValidationResultsAccumulator,
  ValidationVertexVisitResult,
} from "../../types/validation";

import { ethers, BigNumber } from "ethers";

import { isArtifact, isParameter } from "../../utils/guards";

import { buildValidationError, validateBytesForArtifact } from "./helpers";

export async function validateArtifactContract(
  vertex: ArtifactContractDeploymentVertex,
  _resultAccumulator: ValidationResultsAccumulator,
  { callPoints, services }: ValidationDispatchContext
): Promise<ValidationVertexVisitResult> {
  if (!BigNumber.isBigNumber(vertex.value) && !isParameter(vertex.value)) {
    return buildValidationError(
      vertex,
      `For contract 'value' must be a BigNumber`,
      callPoints
    );
  }

  if (!ethers.utils.isAddress(vertex.from)) {
    return buildValidationError(
      vertex,
      `For contract 'from' must be a valid address string`,
      callPoints
    );
  }

  const invalidBytes = await validateBytesForArtifact({
    vertex,
    callPoints,
    services,
  });

  if (invalidBytes !== null) {
    return invalidBytes;
  }

  const artifactExists = isArtifact(vertex.artifact);

  if (!artifactExists) {
    return buildValidationError(
      vertex,
      `Artifact with name '${vertex.label}' doesn't exist`,
      callPoints
    );
  }

  const argsLength = vertex.args.length;

  const iface = new ethers.utils.Interface(vertex.artifact.abi);
  const expectedArgsLength = iface.deploy.inputs.length;

  if (argsLength !== expectedArgsLength) {
    return buildValidationError(
      vertex,
      `The constructor of the contract '${vertex.label}' expects ${expectedArgsLength} arguments but ${argsLength} were given`,
      callPoints
    );
  }

  return {
    _kind: "success",
    result: undefined,
  };
}
