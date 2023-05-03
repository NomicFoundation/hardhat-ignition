import type { IDeployment } from "../types/deployment";
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
import { Ignition, IgnitionExecuteOptions } from "../types/ignition";
import { Providers } from "../types/providers";

import { execute } from "./execution/execute";
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
} from "./types/executionGraph";
import { VertexResultEnum, VisitResultState } from "./types/graph";
import { Services } from "./types/services";
import { networkNameByChainId } from "./utils/networkNames";
import { isFailure } from "./utils/process-results";
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
}

/**
 * The entry point for deploying using _Ignition_.
 *
 * @internal
 */
export class IgnitionImplementation implements Ignition {
  private _services: Services;
  private _uiRenderer: UpdateUiAction;

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
  }: IgnitionCreationArgs) {
    return new IgnitionImplementation({
      services: createServices(providers),
      uiRenderer: uiRenderer as UpdateUiAction,
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
  protected constructor({ services, uiRenderer }: IgnitionConstructorArgs) {
    this._services = services;
    this._uiRenderer = uiRenderer;
  }

  public async execute(
    deployment: IDeployment,
    options: IgnitionExecuteOptions
  ): Promise<DeploymentResult> {
    log(`Start deploy`);

    try {
      log("Execute based on execution graph");
      const executionResult = await execute(deployment, {
        maxRetries: options.maxRetries,
        gasPriceIncrementPerRetry: options.gasPriceIncrementPerRetry,
        pollingInterval: options.pollingInterval,
        eventDuration: options.eventDuration,
      });

      return this._buildOutputFrom(
        executionResult,
        deployment.state.transform.moduleOutputs
      );
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

  /**
   * Retrieve information about the given deployed module
   *
   * @param moduleName - The name of the Ignition module to retrieve data about
   * @returns The addresses of the deployed contracts across any relevant networks
   *
   * @internal
   */
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
}
