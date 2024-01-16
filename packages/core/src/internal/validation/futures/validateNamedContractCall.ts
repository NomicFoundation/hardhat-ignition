import {
  isAccountRuntimeValue,
  isArtifactType,
  isModuleParameterRuntimeValue,
} from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { DeploymentParameters } from "../../../types/deploy";
import { ContractCallFuture } from "../../../types/module";
import { IgnitionError } from "../../errors";
import { ERRORS } from "../../errors-list";
import { validateArtifactFunction } from "../../execution/abi";
import {
  retrieveNestedRuntimeValues,
  validateAccountRuntimeValue,
} from "../utils";

export async function validateNamedContractCall(
  future: ContractCallFuture<string, string>,
  artifactLoader: ArtifactResolver,
  deploymentParameters: DeploymentParameters,
  accounts: string[]
): Promise<string[]> {
  const errors: IgnitionError[] = [];

  /* stage one */

  const artifact =
    "artifact" in future.contract
      ? future.contract.artifact
      : await artifactLoader.loadArtifact(future.contract.contractName);

  if (!isArtifactType(artifact)) {
    errors.push(
      new IgnitionError(ERRORS.VALIDATION.INVALID_ARTIFACT, {
        contractName: future.contract.contractName,
      })
    );
  } else {
    errors.push(
      ...validateArtifactFunction(
        artifact,
        future.contract.contractName,
        future.functionName,
        future.args,
        false
      )
    );
  }

  /* stage two */

  const runtimeValues = retrieveNestedRuntimeValues(future.args);
  const moduleParams = runtimeValues.filter(isModuleParameterRuntimeValue);
  const accountParams = [
    ...runtimeValues.filter(isAccountRuntimeValue),
    ...(isAccountRuntimeValue(future.from) ? [future.from] : []),
  ];

  errors.push(
    ...accountParams.flatMap((arv) =>
      validateAccountRuntimeValue(arv, accounts)
    )
  );

  const missingParams = moduleParams.filter(
    (param) =>
      deploymentParameters[param.moduleId]?.[param.name] === undefined &&
      param.defaultValue === undefined
  );

  if (missingParams.length > 0) {
    errors.push(
      new IgnitionError(ERRORS.VALIDATION.MISSING_MODULE_PARAMETER, {
        name: missingParams[0].name,
      })
    );
  }

  if (isModuleParameterRuntimeValue(future.value)) {
    const param =
      deploymentParameters[future.value.moduleId]?.[future.value.name] ??
      future.value.defaultValue;
    if (param === undefined) {
      errors.push(
        new IgnitionError(ERRORS.VALIDATION.MISSING_MODULE_PARAMETER, {
          name: future.value.name,
        })
      );
    } else if (typeof param !== "bigint") {
      errors.push(
        new IgnitionError(ERRORS.VALIDATION.INVALID_MODULE_PARAMETER_TYPE, {
          name: future.value.name,
          expectedType: "bigint",
          actualType: typeof param,
        })
      );
    }
  }

  return errors.map((e) => e.message);
}
