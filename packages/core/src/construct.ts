import type { IExecutionGraph } from "./soon-to-be-removed";
import type { IDeployment } from "./types/deployment";
import type { Module, ModuleDict } from "./types/module";
import type { ProcessStepResult } from "./types/process";

import setupDebug from "debug";

import { generateDeploymentGraphFrom } from "./internal/process/generateDeploymentGraphFrom";
import { transformDeploymentGraphToExecutionGraph } from "./internal/process/transformDeploymentGraphToExecutionGraph";
import {
  isFailure,
  processStepSucceeded,
} from "./internal/utils/process-results";
import { validateDeploymentGraph } from "./internal/validation/validateDeploymentGraph";

const log = setupDebug("ignition:construct");

export async function construct<T extends ModuleDict>(
  deployment: IDeployment,
  ignitionModule: Module<T>
): Promise<
  ProcessStepResult<{ executionGraph: IExecutionGraph; moduleOutputs: T }>
> {
  log("Generate deployment graph from module");
  const deploymentGraphConstructionResult = generateDeploymentGraphFrom(
    ignitionModule,
    {
      chainId: deployment.state.details.chainId,
      accounts: deployment.state.details.accounts,
      artifacts: deployment.state.details.artifacts,
    }
  );

  if (isFailure(deploymentGraphConstructionResult)) {
    await deployment.failUnexpected(deploymentGraphConstructionResult.failures);

    return deploymentGraphConstructionResult;
  }

  const {
    graph: deploymentGraph,
    callPoints,
    moduleOutputs,
  } = deploymentGraphConstructionResult.result;

  await deployment.startValidation();
  const validationResult = await validateDeploymentGraph(
    deploymentGraph,
    callPoints,
    deployment.services
  );

  if (isFailure(validationResult)) {
    await deployment.failValidation(validationResult.failures);

    return validationResult;
  }

  log("Transform deployment graph to execution graph");
  const transformResult = await transformDeploymentGraphToExecutionGraph(
    deploymentGraph,
    deployment.services
  );

  if (isFailure(transformResult)) {
    await deployment.failUnexpected(transformResult.failures);

    return transformResult;
  }

  return processStepSucceeded({
    executionGraph: transformResult.result.executionGraph,
    moduleOutputs,
  });
}
