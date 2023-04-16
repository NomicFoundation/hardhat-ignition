import type {
  ModuleInfoData,
  NetworkInfoData,
  ContractInfoData,
} from "../types/info";
import type { Module, ModuleDict } from "../types/module";
import type { IgnitionPlan } from "../types/plan";
import type {
  ContractInfo,
  SerializedDeploymentResult,
} from "../types/serialization";
import type { ICommandJournal } from "./types/journal";

import setupDebug from "debug";

import { IgnitionError } from "../errors";
import { Ignition, IgnitionDeployOptions } from "../types/ignition";
import { ProcessStepResult } from "../types/process";
import { Providers } from "../types/providers";

import { Deployment } from "./deployment/Deployment";
import { execute } from "./execution/execute";
import { loadJournalInto } from "./execution/loadJournalInto";
import { hashExecutionGraph } from "./execution/utils";
import { NoopCommandJournal } from "./journal/NoopCommandJournal";
import { generateDeploymentGraphFrom } from "./process/generateDeploymentGraphFrom";
import { transformDeploymentGraphToExecutionGraph } from "./process/transformDeploymentGraphToExecutionGraph";
import { createServices } from "./services/createServices";
import {
  DeployStateExecutionCommand,
  DeploymentResult,
  DeploymentResultState,
  UpdateUiAction,
} from "./types/deployment";
import {
  ExecutionResultsAccumulator,
  ExecutionVisitResult,
  IExecutionGraph,
} from "./types/executionGraph";
import { VertexResultEnum, VisitResultState } from "./types/graph";
import { Services } from "./types/services";
import { networkNameByChainId } from "./utils/networkNames";
import {
  isFailure,
  processStepFailed,
  processStepSucceeded,
} from "./utils/process-results";
import { resolveProxyValue } from "./utils/proxy";
import { validateDeploymentGraph } from "./validation/validateDeploymentGraph";

const log = setupDebug("ignition:main");

/**
 * The setup options for the Ignition.
 *
 * @internal
 */
export interface IgnitionCreationArgs {
  /**
   * The adapters that allows Ignition to communicate with external systems
   * like the target blockchain or local filesystem.
   */
  providers: Providers;

  /**
   * An optional UI update function that will be invoked with the current
   * Ignition state on each major state change.
   */
  uiRenderer?: UpdateUiAction;

  /**
   * An optional journal that will be used to store a record of the current
   * run and to access the history of previous runs.
   */
  journal?: ICommandJournal;
}

/**
 * The setup options for Ignition
 *
 * @internal
 */
export interface IgnitionConstructorArgs {
  /**
   * An adapter that allows Ignition to communicate with external services
   * like the target blockchain or local filesystem.
   */
  services: Services;

  /**
   * A UI update function that will be invoked with the current
   * Ignition state on each major state change.
   */
  uiRenderer: UpdateUiAction;

  /**
   * A journal that will be used to store a record of the current
   * run and to access the history of previous runs.
   */
  journal: ICommandJournal;
}

/**
 * The entry point for deploying using _Ignition_.
 *
 * @internal
 */
export class IgnitionImplementation implements Ignition {
  private _services: Services;
  private _uiRenderer: UpdateUiAction;
  private _journal: ICommandJournal;

  /**
   * A factory function to create a new Ignition instance based on the
   * given providers.
   *
   * @param options - The setup options for Ignition.
   * @returns The setup Ignition instance
   */
  public static create({
    providers,
    uiRenderer = () => {},
    journal = new NoopCommandJournal(),
  }: IgnitionCreationArgs) {
    return new IgnitionImplementation({
      services: createServices(providers),
      uiRenderer: uiRenderer as UpdateUiAction,
      journal: journal as ICommandJournal,
    });
  }

  /**
   * Creates a new Ignition instance that will manage and orchestrate a
   * deployment.
   *
   * @param options - The service-based setup options for Ignition.
   *
   * @internal
   */
  protected constructor({
    services,
    uiRenderer,
    journal,
  }: IgnitionConstructorArgs) {
    this._services = services;
    this._uiRenderer = uiRenderer;
    this._journal = journal;
  }

  /**
   * Run a deployment based on a given Ignition module on-chain,
   * leveraging any configured journal to record.
   *
   * @param ignitionModule - An Ignition module
   * @param options - Configuration options
   * @returns A struct indicating whether the deployment was
   * a success, failure or hold. A successful result will
   * include the addresses of the deployed contracts.
   *
   * @internal
   */
  public async deploy<T extends ModuleDict>(
    ignitionModule: Module<T>,
    options: IgnitionDeployOptions
  ): Promise<DeploymentResult<T>> {
    log(`Start deploy`);

    const deployment = new Deployment(
      ignitionModule.name,
      this._services,
      this._journal,
      this._uiRenderer
    );

    try {
      const [chainId, accounts, artifacts] = await Promise.all([
        this._services.network.getChainId(),
        this._services.accounts.getAccounts(),
        this._services.artifacts.getAllArtifacts(),
      ]);

      await deployment.setDeploymentDetails({
        accounts,
        chainId,
        artifacts,
        networkName: networkNameByChainId[chainId] ?? "unknown",
        force: options.force,
      });

      const constructExecutionGraphResult =
        await this._constructExecutionGraphFrom(deployment, ignitionModule);

      if (isFailure(constructExecutionGraphResult)) {
        log("Failed to construct execution graph");

        return {
          _kind: DeploymentResultState.FAILURE,
          failures: [
            constructExecutionGraphResult.message,
            constructExecutionGraphResult.failures,
          ],
        };
      }

      const { executionGraph, moduleOutputs } =
        constructExecutionGraphResult.result;

      log("Execution graph constructed");
      await deployment.transformComplete(executionGraph);

      // rebuild previous execution state based on journal
      log("Load journal entries for network");
      await loadJournalInto(deployment, this._journal);

      // check that safe to run based on changes
      log("Reconciling previous runs with current module");
      const moduleChangeResult = this._checkSafeDeployment(deployment);

      if (isFailure(moduleChangeResult)) {
        log("Failed to reconcile");
        await deployment.failReconciliation();

        return {
          _kind: DeploymentResultState.FAILURE,
          failures: [moduleChangeResult.message, moduleChangeResult.failures],
        };
      }

      log("Execute based on execution graph");
      const executionResult = await execute(deployment, {
        maxRetries: options.maxRetries,
        gasPriceIncrementPerRetry: options.gasPriceIncrementPerRetry,
        pollingInterval: options.pollingInterval,
        eventDuration: options.eventDuration,
      });

      return this._buildOutputFrom(executionResult, moduleOutputs);
    } catch (err) {
      if (!(err instanceof Error)) {
        const unexpectedError = new IgnitionError("Unexpected error");

        await deployment.failUnexpected([unexpectedError]);
        return {
          _kind: DeploymentResultState.FAILURE,
          failures: ["Unexpected error", [unexpectedError]],
        };
      }

      await deployment.failUnexpected([err]);
      return {
        _kind: DeploymentResultState.FAILURE,
        failures: ["Unexpected error", [err]],
      };
    }
  }

  /**
   * Construct a plan (or dry run) describing how a deployment will be executed
   * for the given module.
   *
   * @param deploymentModule - The Ignition module to be deployed
   * @returns The deployment details as a plan
   *
   * @internal
   */
  public async plan<T extends ModuleDict>(
    deploymentModule: Module<T>
  ): Promise<IgnitionPlan> {
    log(`Start plan`);

    const [chainId, accounts, artifacts] = await Promise.all([
      this._services.network.getChainId(),
      this._services.accounts.getAccounts(),
      this._services.artifacts.getAllArtifacts(),
    ]);

    const constructionResult = generateDeploymentGraphFrom(deploymentModule, {
      chainId,
      accounts,
      artifacts,
    });

    if (isFailure(constructionResult)) {
      throw new IgnitionError(constructionResult.message);
    }

    const { graph: deploymentGraph, callPoints } = constructionResult.result;

    const validationResult = await validateDeploymentGraph(
      deploymentGraph,
      callPoints,
      this._services
    );

    if (isFailure(validationResult)) {
      throw new IgnitionError(validationResult.message);
    }

    const transformResult = await transformDeploymentGraphToExecutionGraph(
      deploymentGraph,
      this._services
    );

    if (isFailure(transformResult)) {
      throw new IgnitionError(transformResult.message);
    }

    const { executionGraph } = transformResult.result;

    return {
      deploymentGraph,
      executionGraph,
      networkName: networkNameByChainId[chainId] ?? "unknown",
    };
  }

  public async info(moduleName: string): Promise<ModuleInfoData[]> {
    log(`Start info`);

    const journalData: {
      [networkTag: string]: Array<
        DeployStateExecutionCommand & { chainId: number }
      >;
    } = {};
    for await (const command of this._journal.readAll()) {
      const network = networkNameByChainId[command.chainId] ?? "unknown";
      const networkTag = `${network}:${command.chainId}`;

      if (journalData[networkTag] === undefined) {
        journalData[networkTag] = [];
      }

      journalData[networkTag].push(command);
    }

    const deployments: Deployment[] = [];
    for (const [networkTag, commands] of Object.entries(journalData)) {
      const deployment = new Deployment(
        moduleName,
        this._services,
        this._journal
      );

      const [networkName, chainId] = networkTag.split(":");
      await deployment.setDeploymentDetails({
        networkName,
        chainId: +chainId,
      });

      await deployment.load(commands);

      deployments.push(deployment);
    }

    const moduleInfoData: { [moduleName: string]: ModuleInfoData } = {};
    for (const deployment of deployments) {
      const {
        networkName,
        chainId,
        moduleName: deploymentName,
      } = deployment.state.details;

      const contracts: ContractInfoData[] = [];
      for (const vertex of Object.values(deployment.state.execution.vertexes)) {
        if (
          vertex.status === "COMPLETED" &&
          "bytecode" in vertex.result.result &&
          "value" in vertex.result.result
        ) {
          contracts.push({
            contractName: vertex.result.result.name,
            status: "deployed",
            address: vertex.result.result.address,
          });
        }
      }

      if (contracts.length > 0) {
        const networkInfo: NetworkInfoData = {
          networkName,
          chainId,
          contracts,
        };
        moduleInfoData[deploymentName] ??= {
          moduleName: deploymentName,
          networks: [],
        };
        moduleInfoData[deploymentName].networks.push(networkInfo);
      }
    }

    return Object.values(moduleInfoData);
  }

  private async _constructExecutionGraphFrom<T extends ModuleDict>(
    deployment: Deployment,
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
      await deployment.failUnexpected(
        deploymentGraphConstructionResult.failures
      );

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

  private _buildOutputFrom<T extends ModuleDict>(
    executionResult: ExecutionVisitResult,
    moduleOutputs: T
  ): DeploymentResult<T> {
    if (executionResult._kind === VisitResultState.FAILURE) {
      return {
        _kind: DeploymentResultState.FAILURE,
        failures: executionResult.failures,
      };
    }

    if (executionResult._kind === VisitResultState.HOLD) {
      return {
        _kind: DeploymentResultState.HOLD,
        holds: executionResult.holds,
      };
    }

    const serializedDeploymentResult = this._serialize(
      moduleOutputs,
      executionResult.result
    );

    return {
      _kind: DeploymentResultState.SUCCESS,
      result: serializedDeploymentResult,
    };
  }

  private _serialize<T extends ModuleDict>(
    moduleOutputs: T,
    result: ExecutionResultsAccumulator
  ): SerializedDeploymentResult<T> {
    const entries = Object.entries(moduleOutputs);

    const serializedResult: { [k: string]: ContractInfo } = {};
    for (const [key, value] of entries) {
      const future = resolveProxyValue(value);

      const executionResultValue = result.get(future.vertexId);

      if (
        executionResultValue === undefined ||
        executionResultValue === null ||
        executionResultValue._kind === VertexResultEnum.FAILURE ||
        executionResultValue._kind === VertexResultEnum.HOLD ||
        future.type !== "contract"
      ) {
        continue;
      }

      serializedResult[key] = executionResultValue.result as ContractInfo;
    }

    return serializedResult as SerializedDeploymentResult<T>;
  }

  private _checkSafeDeployment(
    deployment: Deployment
  ): ProcessStepResult<boolean> {
    if (deployment.state.details.force) {
      return processStepSucceeded(true);
    }

    if (deployment.state.transform.executionGraph === null) {
      return processStepFailed("Module reconciliation failed", [
        new IgnitionError(
          "Execution graph must be set to check safe deployment"
        ),
      ]);
    }

    const previousExecutionGraphHash =
      deployment.state.execution.executionGraphHash;

    if (previousExecutionGraphHash === "") {
      return processStepSucceeded(true);
    }

    const currentExecutionGraphHash = hashExecutionGraph(
      deployment.state.transform.executionGraph
    );

    if (previousExecutionGraphHash === currentExecutionGraphHash) {
      return processStepSucceeded(true);
    }

    return processStepFailed("Module reconciliation failed", [
      new IgnitionError(
        "The module has been modified since the last run. You can ignore the previous runs with the '--force' flag."
      ),
    ]);
  }
}
