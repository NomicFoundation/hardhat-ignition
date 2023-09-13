import { ArtifactResolver } from "../../types/artifact";
import { DeploymentParameters } from "../../types/deploy";
import { Future, IgnitionModule } from "../../types/module";
import { DeploymentLoader } from "../deployment-loader/types";
import { DeploymentState } from "../execution/types/deployment-state";
import { ExecutionState } from "../execution/types/execution-state";
import { AdjacencyList } from "../utils/adjacency-list";
import { AdjacencyListConverter } from "../utils/adjacency-list-converter";
import { getFuturesFromModule } from "../utils/get-futures-from-module";

import { reconcileCurrentAndPreviousTypeMatch } from "./reconcile-current-and-previous-type-match";
import { reconcileDependencyRules } from "./reconcile-dependency-rules";
import { reconcileFutureSpecificReconciliations } from "./reconcile-future-specific-reconciliations";
import {
  ReconciliationCheck,
  ReconciliationContext,
  ReconciliationFailure,
  ReconciliationFutureResult,
  ReconciliationResult,
} from "./types";

export class Reconciler {
  public static async reconcile(
    module: IgnitionModule,
    deploymentState: DeploymentState,
    deploymentParameters: DeploymentParameters,
    accounts: string[],
    deploymentLoader: DeploymentLoader,
    artifactResolver: ArtifactResolver,
    defaultSender: string
  ): Promise<ReconciliationResult> {
    const reconciliationFailures = await this._reconcileEachFutureInModule(
      module,
      {
        deploymentState,
        deploymentParameters,
        accounts,
        deploymentLoader,
        artifactResolver,
        defaultSender,
      },
      [
        reconcileCurrentAndPreviousTypeMatch,
        reconcileDependencyRules,
        reconcileFutureSpecificReconciliations,
      ]
    );

    // TODO: Reconcile sender of incomplete futures.

    const missingExecutedFutures = this._missingPreviouslyExecutedFutures(
      module,
      deploymentState
    );

    return { reconciliationFailures, missingExecutedFutures };
  }

  private static async _reconcileEachFutureInModule(
    module: IgnitionModule,
    context: ReconciliationContext,
    checks: ReconciliationCheck[]
  ): Promise<ReconciliationFailure[]> {
    // TODO: swap this out for linearization of execution state
    // once execution is fleshed out.
    const futures = this._getFuturesInReverseTopoligicalOrder(module);

    const failures = [];

    for (const future of futures) {
      const exState = context.deploymentState.executionStates[future.id];
      if (exState === undefined) {
        continue;
      }

      const result = await this._check(future, exState, context, checks);
      if (result.success) {
        continue;
      }

      failures.push(result.failure);
    }

    return failures;
  }

  private static _missingPreviouslyExecutedFutures(
    module: IgnitionModule,
    deploymentState: DeploymentState
  ) {
    const moduleFutures = new Set(
      getFuturesFromModule(module).map((f) => f.id)
    );

    const previouslyStarted = Object.values(
      deploymentState.executionStates
    ).map((es) => es.id);

    const missing = previouslyStarted.filter((sf) => !moduleFutures.has(sf));

    return missing;
  }

  private static _getFuturesInReverseTopoligicalOrder(
    module: IgnitionModule
  ): Future[] {
    const futures = getFuturesFromModule(module);

    const adjacencyList =
      AdjacencyListConverter.buildAdjacencyListFromFutures(futures);

    const sortedFutureIds =
      AdjacencyList.topologicalSort(adjacencyList).reverse();

    return sortedFutureIds
      .map((id) => futures.find((f) => f.id === id))
      .filter((x): x is Future => x !== undefined);
  }

  private static async _check(
    future: Future,
    executionState: ExecutionState,
    context: ReconciliationContext,
    checks: ReconciliationCheck[]
  ): Promise<ReconciliationFutureResult> {
    for (const check of checks) {
      const result = await check(future, executionState, context);

      if (result.success) {
        continue;
      }

      return result;
    }

    return { success: true };
  }
}
