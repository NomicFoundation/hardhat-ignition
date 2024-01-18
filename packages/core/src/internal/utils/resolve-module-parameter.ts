import { DeploymentParameters } from "../../types/deploy";
import {
  ModuleParameterRuntimeValue,
  ModuleParameterType,
} from "../../types/module";

import { assertIgnitionInvariant } from "./assertions";

export function resolveModuleParameter<ParamTypeT extends ModuleParameterType>(
  moduleParamRuntimeValue: ModuleParameterRuntimeValue<ParamTypeT>,
  context: { deploymentParameters: DeploymentParameters }
): ParamTypeT {
  if (context.deploymentParameters === undefined) {
    assertIgnitionInvariant(
      moduleParamRuntimeValue.defaultValue !== undefined,
      `No default value provided for module parameter ${moduleParamRuntimeValue.moduleId}/${moduleParamRuntimeValue.name}`
    );

    return moduleParamRuntimeValue.defaultValue;
  }

  const moduleParameters =
    context.deploymentParameters[moduleParamRuntimeValue.moduleId];

  if (moduleParameters === undefined) {
    assertIgnitionInvariant(
      moduleParamRuntimeValue.defaultValue !== undefined,
      `No default value provided for module parameter ${moduleParamRuntimeValue.moduleId}/${moduleParamRuntimeValue.name}`
    );

    return moduleParamRuntimeValue.defaultValue;
  }

  const moduleParamValue = moduleParameters[moduleParamRuntimeValue.name];

  if (moduleParamValue === undefined) {
    assertIgnitionInvariant(
      moduleParamRuntimeValue.defaultValue !== undefined,
      `No default value provided for module parameter ${moduleParamRuntimeValue.moduleId}/${moduleParamRuntimeValue.name}`
    );

    return moduleParamRuntimeValue.defaultValue;
  }

  // I believe this is a safe coercion as the type of the module parameter would already have been validated during validation stage
  return moduleParamValue as ParamTypeT;
}
