import type { ArtifactLibraryDeploymentVertex } from "../../types/deploymentGraph";
import type {
  ValidationDispatchContext,
  ValidationResultsAccumulator,
  ValidationVertexVisitResult,
} from "../../types/validation";

import { ethers } from "ethers";

import { isArtifact } from "../../utils/guards";

import { buildValidationError, validateBytesForArtifact } from "./helpers";

export async function validateArtifactLibrary(
  vertex: ArtifactLibraryDeploymentVertex,
  _resultAccumulator: ValidationResultsAccumulator,
  context: ValidationDispatchContext
): Promise<ValidationVertexVisitResult> {
  if (!ethers.utils.isAddress(vertex.from)) {
    return buildValidationError(
      vertex,
      `For library 'from' must be a valid address string`,
      context.callPoints
    );
  }

  const invalidBytes = await validateBytesForArtifact({
    vertex,
    callPoints: context.callPoints,
    services: context.services,
  });

  if (invalidBytes !== null) {
    return invalidBytes;
  }

  const artifactExists = isArtifact(vertex.artifact);

  if (!artifactExists) {
    return buildValidationError(
      vertex,
      `Artifact not provided for library '${vertex.label}'`,
      context.callPoints
    );
  }

  const argsLength = vertex.args.length;

  const iface = new ethers.utils.Interface(vertex.artifact.abi);
  const expectedArgsLength = iface.deploy.inputs.length;

  if (argsLength !== expectedArgsLength) {
    return buildValidationError(
      vertex,
      `The constructor of the library '${vertex.label}' expects ${expectedArgsLength} arguments but ${argsLength} were given`,
      context.callPoints
    );
  }

  return {
    _kind: "success",
    result: undefined,
  };
}
