import type { Services } from "services/types";
import { InternalParamValue } from "types/deploymentGraph";
import type { CallableFuture } from "types/future";
import { VertexResultEnum, VertexVisitResultFailure } from "types/graph";
import { IgnitionError, InvalidArtifactError } from "utils/errors";
import { isBytesArg } from "utils/guards";
import { resolveProxyValue } from "utils/proxy";

export async function resolveArtifactForCallableFuture(
  givenFuture: CallableFuture,
  { services }: { services: Services }
): Promise<any[] | undefined> {
  const future = resolveProxyValue(givenFuture);

  switch (future.type) {
    case "contract":
      switch (future.subtype) {
        case "artifact":
          return future.artifact.abi;
        case "deployed":
          return future.abi;
        case "hardhat":
          const artifact = await services.artifacts.getArtifact(
            future.contractName
          );
          return artifact.abi;
        default:
          return assertNeverDeploymentFuture(future);
      }
    case "library":
      switch (future.subtype) {
        case "artifact":
          return future.artifact.abi;
        case "hardhat":
          const artifact = await services.artifacts.getArtifact(
            future.libraryName
          );
          return artifact.abi;
        default:
          return assertNeverDeploymentFuture(future);
      }
    case "virtual":
      throw new IgnitionError(`Cannot call virtual future`);
    case "call":
      throw new IgnitionError(`Cannot call call future`);
    case "await":
      throw new IgnitionError(`Cannot call await future`);
    case "send":
      throw new IgnitionError(`Cannot call send future`);
    default:
      return assertNeverDeploymentFuture(future);
  }
}

export async function validateBytesForArtifact(
  args: InternalParamValue[],
  services: Services
): Promise<VertexVisitResultFailure | null> {
  const bytesArgs = args.filter(isBytesArg);

  const bytesExists = await Promise.all(
    bytesArgs.map((v) => services.artifacts.hasArtifact(v.label))
  );

  const bytesDoesNotExistIndex = bytesExists.findIndex((v) => !v);

  if (bytesDoesNotExistIndex === -1) {
    return null;
  }

  return {
    _kind: VertexResultEnum.FAILURE,
    failure: new InvalidArtifactError(bytesArgs[bytesDoesNotExistIndex].label),
  };
}

function assertNeverDeploymentFuture(f: never): undefined {
  throw new IgnitionError(
    `Unexpected deployment future type/subtype ${JSON.stringify(f)}`
  );
}
