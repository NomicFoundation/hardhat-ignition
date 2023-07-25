import { ethers } from "ethers";

import { IgnitionValidationError } from "../../../../errors";
import {
  isArtifactType,
  isModuleParameterRuntimeValue,
} from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import {
  ModuleParameters,
  NamedContractDeploymentFuture,
} from "../../../types/module";
import { retrieveNestedRuntimeValues } from "../../utils/retrieve-nested-runtime-values";

export async function validateNamedContractDeployment(
  future: NamedContractDeploymentFuture<string>,
  artifactLoader: ArtifactResolver,
  moduleParameters: ModuleParameters
) {
  const moduleParams = retrieveNestedRuntimeValues(future.constructorArgs);

  const missingParams = moduleParams.filter(
    (param) =>
      moduleParameters[param.name] === undefined &&
      param.defaultValue === undefined
  );

  if (missingParams.length > 0) {
    throw new IgnitionValidationError(
      `Module parameter '${missingParams[0].name}' requires a value but was given none`
    );
  }

  if (isModuleParameterRuntimeValue(future.value)) {
    const param =
      moduleParameters[future.value.name] ?? future.value.defaultValue;
    if (param === undefined) {
      throw new IgnitionValidationError(
        `Module parameter '${future.value.name}' requires a value but was given none`
      );
    } else if (typeof param !== "bigint") {
      throw new IgnitionValidationError(
        `Module parameter '${
          future.value.name
        }' must be of type 'bigint' but is '${typeof param}'`
      );
    }
  }

  const artifact = await artifactLoader.loadArtifact(future.contractName);

  if (!isArtifactType(artifact)) {
    throw new IgnitionValidationError(
      `Artifact for contract '${future.contractName}' is invalid`
    );
  }

  const argsLength = future.constructorArgs.length;

  const iface = new ethers.utils.Interface(artifact.abi);
  const expectedArgsLength = iface.deploy.inputs.length;

  if (argsLength !== expectedArgsLength) {
    throw new IgnitionValidationError(
      `The constructor of the contract '${future.contractName}' expects ${expectedArgsLength} arguments but ${argsLength} were given`
    );
  }
}
