import type {
  ValidationDispatchContext,
  ValidationResultsAccumulator,
  ValidationVertexVisitResult,
} from "../../types/validation";

import { ethers, BigNumber } from "ethers";

import { HardhatContractDeploymentVertex } from "../../types/deploymentGraph";
import { isParameter } from "../../utils/guards";

import { buildValidationError, validateBytesForArtifact } from "./helpers";

export async function validateHardhatContract(
  vertex: HardhatContractDeploymentVertex,
  _resultAccumulator: ValidationResultsAccumulator,
  { services, callPoints }: ValidationDispatchContext
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

  const artifactExists = await services.artifacts.hasArtifact(
    vertex.contractName
  );

  if (!artifactExists) {
    return buildValidationError(
      vertex,
      `Contract with name '${vertex.contractName}' doesn't exist`,
      callPoints
    );
  }

  const artifact = await services.artifacts.getArtifact(vertex.contractName);
  const argsLength = vertex.args.length;

  const iface = new ethers.utils.Interface(artifact.abi);
  const expectedArgsLength = iface.deploy.inputs.length;

  if (argsLength !== expectedArgsLength) {
    return buildValidationError(
      vertex,
      `The constructor of the contract '${vertex.contractName}' expects ${expectedArgsLength} arguments but ${argsLength} were given`,
      callPoints
    );
  }

  return {
    _kind: "success",
    result: undefined,
  };
}
