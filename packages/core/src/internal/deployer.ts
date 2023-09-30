import type { IgnitionModule, IgnitionModuleResult } from "../types/module";

import { isContractFuture } from "../type-guards";
import { ArtifactResolver } from "../types/artifact";
import {
  DeployConfig,
  DeploymentParameters,
  DeploymentResult,
  DeploymentResultType,
  ExecutionErrorDeploymentResult,
  PreviousRunErrorDeploymentResult,
  ReconciliationErrorDeploymentResult,
} from "../types/deploy";
import {
  ExecutionEventListener,
  ExecutionEventType,
} from "../types/execution-events";

import { Batcher } from "./batcher";
import { DeploymentLoader } from "./deployment-loader/types";
import {
  initializeDeploymentState,
  loadDeploymentState,
} from "./execution/deployment-state-helpers";
import { ExecutionEngine } from "./execution/execution-engine";
import { JsonRpcClient } from "./execution/jsonrpc-client";
import { DeploymentState } from "./execution/types/deployment-state";
import {
  ContractAtExecutionState,
  DeploymentExecutionState,
  ExecutionSateType,
  ExecutionState,
  ExecutionStatus,
} from "./execution/types/execution-state";
import { ExecutionStrategy } from "./execution/types/execution-strategy";
import { Reconciler } from "./reconciliation/reconciler";
import { assertIgnitionInvariant } from "./utils/assertions";
import { getFuturesFromModule } from "./utils/get-futures-from-module";
import { findDeployedContracts } from "./views/find-deployed-contracts";
import { findStatus } from "./views/find-status";

/**
 * Run an Igntition deployment.
 *
 * @beta
 */
export class Deployer {
  constructor(
    private readonly _config: DeployConfig,
    private readonly _executionStrategy: ExecutionStrategy,
    private readonly _jsonRpcClient: JsonRpcClient,
    private readonly _artifactResolver: ArtifactResolver,
    private readonly _deploymentLoader: DeploymentLoader,
    private readonly _executionEventListener?: ExecutionEventListener
  ) {
    assertIgnitionInvariant(
      this._config.requiredConfirmations >= 1,
      `Configured value 'requiredConfirmations' cannot be less than 1. Value given: '${this._config.requiredConfirmations}'`
    );
  }

  public async deploy<
    ModuleIdT extends string,
    ContractNameT extends string,
    IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>
  >(
    ignitionModule: IgnitionModule<
      ModuleIdT,
      ContractNameT,
      IgnitionModuleResultsT
    >,
    deploymentParameters: DeploymentParameters,
    accounts: string[],
    defaultSender: string
  ): Promise<DeploymentResult> {
    let deploymentState = await this._getOrInitializeDeploymentState(
      ignitionModule.id
    );

    const contracts =
      getFuturesFromModule(ignitionModule).filter(isContractFuture);

    const contractStates = contracts
      .map((contract) => deploymentState?.executionStates[contract.id])
      .filter((v): v is ExecutionState => v !== undefined);

    // realistically this should be impossible to fail.
    // just need it here for the type inference
    assertIgnitionInvariant(
      contractStates.every(
        (
          exState
        ): exState is DeploymentExecutionState | ContractAtExecutionState =>
          exState.type === ExecutionSateType.DEPLOYMENT_EXECUTION_STATE ||
          exState.type === ExecutionSateType.CONTRACT_AT_EXECUTION_STATE
      ),
      "Invalid state map"
    );

    const reconciliationResult = await Reconciler.reconcile(
      ignitionModule,
      deploymentState,
      deploymentParameters,
      accounts,
      this._deploymentLoader,
      this._artifactResolver,
      defaultSender
    );

    if (reconciliationResult.reconciliationFailures.length > 0) {
      const errors: ReconciliationErrorDeploymentResult["errors"] = {};

      for (const {
        futureId,
        failure,
      } of reconciliationResult.reconciliationFailures) {
        if (errors[futureId] === undefined) {
          errors[futureId] = [];
        }

        errors[futureId].push(failure);
      }

      const reconciliationErrorResult: ReconciliationErrorDeploymentResult = {
        type: DeploymentResultType.RECONCILIATION_ERROR,
        errors,
      };

      this._emitDeploymentCompleteEvent(reconciliationErrorResult);

      return reconciliationErrorResult;
    }

    const previousRunErrors =
      Reconciler.checkForPreviousRunErrors(deploymentState);

    if (previousRunErrors.length > 0) {
      const errors: PreviousRunErrorDeploymentResult["errors"] = {};

      for (const { futureId, failure } of previousRunErrors) {
        if (errors[futureId] === undefined) {
          errors[futureId] = [];
        }

        errors[futureId].push(failure);
      }

      const previousRunErrorResult: PreviousRunErrorDeploymentResult = {
        type: DeploymentResultType.PREVIOUS_RUN_ERROR,
        errors,
      };

      this._emitDeploymentCompleteEvent(previousRunErrorResult);

      return previousRunErrorResult;
    }

    if (reconciliationResult.missingExecutedFutures.length > 0) {
      this._emitReconciliationWarningsEvent(
        reconciliationResult.missingExecutedFutures
      );
    }

    const batches = Batcher.batch(ignitionModule, deploymentState);

    this._emitDeploymentBatchEvent(batches);

    const executionEngine = new ExecutionEngine(
      this._deploymentLoader,
      this._artifactResolver,
      this._executionStrategy,
      this._jsonRpcClient,
      this._executionEventListener,
      this._config.requiredConfirmations,
      this._config.timeBeforeBumpingFees,
      this._config.maxFeeBumps,
      this._config.blockPollingInterval
    );

    deploymentState = await executionEngine.executeModule(
      deploymentState,
      ignitionModule,
      batches,
      accounts,
      deploymentParameters,
      defaultSender
    );

    const result = await this._getDeploymentResult(
      deploymentState,
      ignitionModule
    );

    this._emitDeploymentCompleteEvent(result);

    return result;
  }

  private async _getDeploymentResult<
    ModuleIdT extends string,
    ContractNameT extends string,
    IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>
  >(
    deploymentState: DeploymentState,
    _module: IgnitionModule<ModuleIdT, ContractNameT, IgnitionModuleResultsT>
  ): Promise<DeploymentResult> {
    if (!this._isSuccessful(deploymentState)) {
      return this._getExecutionErrorResult(deploymentState);
    }

    const deployedContracts = findDeployedContracts(deploymentState);

    return {
      type: DeploymentResultType.SUCCESSFUL_DEPLOYMENT,
      contracts: deployedContracts,
    };
  }

  private async _getOrInitializeDeploymentState(
    moduleId: string
  ): Promise<DeploymentState> {
    const chainId = await this._jsonRpcClient.getChainId();
    const deploymentState = await loadDeploymentState(this._deploymentLoader);

    if (deploymentState === undefined) {
      this._emitDeploymentStartEvent(moduleId);

      return initializeDeploymentState(chainId, this._deploymentLoader);
    }

    assertIgnitionInvariant(
      deploymentState.chainId === chainId,
      `Trying to continue deployment in a different chain. Previous chain id: ${deploymentState.chainId}. Current chain id: ${chainId}`
    );

    return deploymentState;
  }

  private _emitDeploymentStartEvent(moduleId: string): void {
    if (this._executionEventListener === undefined) {
      return;
    }

    this._executionEventListener.deploymentStart({
      type: ExecutionEventType.DEPLOYMENT_START,
      moduleName: moduleId,
    });
  }

  private _emitReconciliationWarningsEvent(warnings: string[]): void {
    if (this._executionEventListener === undefined) {
      return;
    }

    this._executionEventListener.reconciliationWarnings({
      type: ExecutionEventType.RECONCILIATION_WARNINGS,
      warnings,
    });
  }

  private _emitDeploymentBatchEvent(batches: string[][]): void {
    if (this._executionEventListener === undefined) {
      return;
    }

    this._executionEventListener.batchInitialize({
      type: ExecutionEventType.BATCH_INITIALIZE,
      batches,
    });
  }

  private _emitDeploymentCompleteEvent(result: DeploymentResult): void {
    if (this._executionEventListener === undefined) {
      return;
    }

    this._executionEventListener.deploymentComplete({
      type: ExecutionEventType.DEPLOYMENT_COMPLETE,
      result,
    });
  }

  private _isSuccessful(deploymentState: DeploymentState): boolean {
    return Object.values(deploymentState.executionStates).every(
      (ex) => ex.status === ExecutionStatus.SUCCESS
    );
  }

  private _getExecutionErrorResult(
    deploymentState: DeploymentState
  ): ExecutionErrorDeploymentResult {
    const status = findStatus(deploymentState);

    return {
      type: DeploymentResultType.EXECUTION_ERROR,
      ...status,
    };
  }
}
