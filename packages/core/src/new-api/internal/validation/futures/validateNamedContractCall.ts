import { Interface, FunctionFragment } from "ethers";

import { IgnitionValidationError } from "../../../../errors";
import {
  isAccountRuntimeValue,
  isArtifactType,
  isModuleParameterRuntimeValue,
} from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { DeploymentParameters } from "../../../types/deployer";
import { NamedContractCallFuture } from "../../../types/module";
import { validateArtifactFunctionName } from "../../new-execution/abi";
import {
  retrieveNestedRuntimeValues,
  validateAccountRuntimeValue,
} from "../utils";

export async function validateNamedContractCall(
  future: NamedContractCallFuture<string, string>,
  artifactLoader: ArtifactResolver,
  deploymentParameters: DeploymentParameters,
  accounts: string[]
) {
  const runtimeValues = retrieveNestedRuntimeValues(future.args);
  const moduleParams = runtimeValues.filter(isModuleParameterRuntimeValue);
  const accountParams = [
    ...runtimeValues.filter(isAccountRuntimeValue),
    ...(isAccountRuntimeValue(future.from) ? [future.from] : []),
  ];

  accountParams.forEach((arv) => validateAccountRuntimeValue(arv, accounts));

  const missingParams = moduleParams.filter(
    (param) =>
      deploymentParameters[param.moduleId]?.[param.name] === undefined &&
      param.defaultValue === undefined
  );

  if (missingParams.length > 0) {
    throw new IgnitionValidationError(
      `Module parameter '${missingParams[0].name}' requires a value but was given none`
    );
  }

  if (isModuleParameterRuntimeValue(future.value)) {
    const param =
      deploymentParameters[future.value.moduleId]?.[future.value.name] ??
      future.value.defaultValue;
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

  const artifact =
    "artifact" in future.contract
      ? future.contract.artifact
      : await artifactLoader.loadArtifact(future.contract.contractName);

  if (!isArtifactType(artifact)) {
    throw new IgnitionValidationError(
      `Artifact for contract '${future.contract.contractName}' is invalid`
    );
  }

  validateArtifactFunctionName(artifact, future.functionName);

  const argsLength = future.args.length;

  const iface = new Interface(artifact.abi);

  const funcs: FunctionFragment[] = [];
  iface.forEachFunction((func) => {
    if (func.name === future.functionName) {
      funcs.push(func);
    }
  });

  const matchingFunctionFragments = funcs.filter(
    (f) => f.inputs.length === argsLength
  );

  if (matchingFunctionFragments.length === 0) {
    if (funcs.length === 1) {
      throw new IgnitionValidationError(
        `Function ${future.functionName} in contract ${future.contract.contractName} expects ${funcs[0].inputs.length} arguments but ${argsLength} were given`
      );
    } else {
      throw new IgnitionValidationError(
        `Function ${future.functionName} in contract ${future.contract.contractName} is overloaded, but no overload expects ${argsLength} arguments`
      );
    }
  }
}
