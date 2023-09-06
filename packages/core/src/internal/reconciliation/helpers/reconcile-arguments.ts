import { isDeploymentFuture } from "../../../type-guards";
import {
  ArtifactContractDeploymentFuture,
  NamedContractCallFuture,
  NamedContractDeploymentFuture,
  NamedStaticCallFuture,
} from "../../../types/module";
import { resolveArgs } from "../../execution/future-processor/helpers/future-resolvers";
import {
  CallExecutionState,
  DeploymentExecutionState,
  ExecutionSateType,
  StaticCallExecutionState,
} from "../../execution/types/execution-state";
import {
  ReconciliationContext,
  ReconciliationFutureResultFailure,
} from "../types";
import { fail } from "../utils";

export function reconcileArguments(
  future:
    | NamedContractDeploymentFuture<string>
    | ArtifactContractDeploymentFuture
    | NamedStaticCallFuture<string, string>
    | NamedContractCallFuture<string, string>,
  exState:
    | DeploymentExecutionState
    | CallExecutionState
    | StaticCallExecutionState,
  context: ReconciliationContext
): ReconciliationFutureResultFailure | undefined {
  const unresolvedFutureArgs = isDeploymentFuture(future)
    ? future.constructorArgs
    : future.args;

  const futureArgs = resolveArgs(
    unresolvedFutureArgs,
    context.deploymentState,
    context.deploymentParameters,
    context.accounts
  );

  const exStateArgs =
    exState.type === ExecutionSateType.DEPLOYMENT_EXECUTION_STATE
      ? exState.constructorArgs
      : exState.args;

  if (futureArgs.length !== exStateArgs.length) {
    return fail(
      future,
      `The number of arguments changed from ${exStateArgs.length} to ${futureArgs.length}`
    );
  }

  const isEqual = require("lodash/isEqual") as typeof import("lodash/isEqual");
  for (const [i, futureArg] of futureArgs.entries()) {
    const exStateArg = exStateArgs[i];

    if (!isEqual(futureArg, exStateArg)) {
      return fail(future, `Argument at index ${i} has been changed`);
    }
  }
}
