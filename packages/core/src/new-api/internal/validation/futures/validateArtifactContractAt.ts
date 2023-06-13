import { IgnitionValidationError } from "../../../../errors";
import { isArtifactType } from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { ArtifactContractAtFuture } from "../../../types/module";

export async function validateArtifactContractAt(
  future: ArtifactContractAtFuture,
  artifactLoader: ArtifactResolver
) {
  const artifact = await artifactLoader.load(future.contractName);

  if (!isArtifactType(artifact)) {
    throw new IgnitionValidationError(
      `Artifact for contract '${future.contractName}' is invalid`
    );
  }
}
