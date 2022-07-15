import {
  Future,
  DeploymentPlan,
  Ignition,
  UserModule,
  IgnitionDeployOptions,
  SerializedModuleResult,
  Providers,
  ParamValue,
} from "@nomicfoundation/ignition-core";
import { ethers } from "ethers";
import fsExtra from "fs-extra";
import { HardhatConfig, HardhatRuntimeEnvironment } from "hardhat/types";
import path from "path";

import { getAllUserModulesPaths } from "./user-modules";

type HardhatEthers = HardhatRuntimeEnvironment["ethers"];
type HardhatPaths = HardhatConfig["paths"];

export class IgnitionWrapper {
  private _ignition: Ignition;
  private _cachedChainId: number | undefined;

  constructor(
    private _providers: Providers,
    private _ethers: HardhatEthers,
    private _isHardhatNetwork: boolean,
    private _paths: HardhatPaths,
    private _deployOptions: IgnitionDeployOptions
  ) {
    this._ignition = new Ignition(_providers, {
      load: (moduleId) => this._getModuleResult(moduleId),
      save: (moduleId, moduleResult) =>
        this._saveModuleResult(moduleId, moduleResult),
    });
  }

  public async deploy<T>(
    userModuleOrName: UserModule<T> | string,
    deployParams: { parameters: { [key: string]: ParamValue } } | undefined
  ): Promise<Resolved<T>> {
    const [, resolvedOutputs] = await this.deployMany(
      [userModuleOrName],
      deployParams
    );

    return resolvedOutputs[0];
  }

  /**
   * Deploys all the given modules. Returns the deployment result, and an
   * array with the resolved outputs that corresponds to each module in
   * the input.
   */
  public async deployMany(
    userModulesOrNames: Array<UserModule<any> | string>,
    deployParams: { parameters: { [key: string]: ParamValue } } | undefined
  ) {
    if (deployParams !== undefined) {
      await this._providers.config.setParams(deployParams.parameters);
    }

    const userModules: Array<UserModule<any>> = [];

    for (const userModuleOrName of userModulesOrNames) {
      const userModule: UserModule<any> =
        typeof userModuleOrName === "string"
          ? await this._getModule(userModuleOrName)
          : userModuleOrName;

      userModules.push(userModule);
    }

    const [deploymentResult, moduleOutputs] = await this._ignition.deploy(
      userModules,
      this._deployOptions
    );

    if (deploymentResult._kind === "hold") {
      const [moduleId, holdReason] = deploymentResult.holds;
      throw new Error(`Execution held for module '${moduleId}': ${holdReason}`);
    }

    if (deploymentResult._kind === "failure") {
      const [moduleId, failures] = deploymentResult.failures;

      let failuresMessage = "";
      for (const failure of failures) {
        failuresMessage += `  - ${failure.message}\n`;
      }

      throw new Error(
        `Execution failed for module '${moduleId}':\n\n${failuresMessage}`
      );
    }

    const resolvedOutputPerModule: Record<string, any> = {};
    for (const [moduleId, moduleOutput] of Object.entries(moduleOutputs)) {
      const resolvedOutput: any = {};
      for (const [key, value] of Object.entries<any>(moduleOutput)) {
        const serializedFutureResult =
          deploymentResult.result[value.moduleId][value.id];

        if (
          serializedFutureResult._kind === "string" ||
          serializedFutureResult._kind === "number"
        ) {
          resolvedOutput[key] = serializedFutureResult;
        } else if (serializedFutureResult._kind === "tx") {
          resolvedOutput[key] = serializedFutureResult.value.hash;
        } else {
          const { abi, address } = serializedFutureResult.value;
          resolvedOutput[key] = await this._ethers.getContractAt(abi, address);
        }
      }
      resolvedOutputPerModule[moduleId] = resolvedOutput;
    }

    const resolvedOutputs = userModules.map(
      (x) => resolvedOutputPerModule[x.id]
    );

    return [deploymentResult, resolvedOutputs] as const;
  }

  public async buildPlan(
    userModulesOrNames: Array<UserModule<any> | string>
  ): Promise<DeploymentPlan> {
    const userModules: Array<UserModule<any>> = [];
    for (const userModuleOrName of userModulesOrNames) {
      const userModule: UserModule<any> =
        typeof userModuleOrName === "string"
          ? await this._getModule(userModuleOrName)
          : userModuleOrName;

      userModules.push(userModule);
    }

    const plan = await this._ignition.buildPlan(userModules);

    return plan;
  }

  private async _getModule<T>(moduleId: string): Promise<UserModule<T>> {
    const userModulesPaths = getAllUserModulesPaths(this._paths.ignition);

    for (const userModulePath of userModulesPaths) {
      const resolveUserModulePath = path.resolve(
        this._paths.ignition,
        userModulePath
      );

      const fileExists = await fsExtra.pathExists(resolveUserModulePath);
      if (!fileExists) {
        throw new Error(`Module ${resolveUserModulePath} doesn't exist`);
      }

      const userModule = require(resolveUserModulePath);
      const userModuleContent = userModule.default ?? userModule;

      if (userModuleContent.id === moduleId) {
        return userModuleContent;
      }
    }

    throw new Error(`No module found with id ${moduleId}`);
  }

  private async _getModuleResult(
    moduleId: string
  ): Promise<SerializedModuleResult | undefined> {
    if (this._isHardhatNetwork) {
      return;
    }

    const chainId = await this._getChainId();

    const moduleResultPath = path.join(
      this._paths.deployments,
      String(chainId),
      `${moduleId}.json`
    );

    if (!(await fsExtra.pathExists(moduleResultPath))) {
      return;
    }

    const serializedModuleResult = await fsExtra.readJson(moduleResultPath);

    return serializedModuleResult;
  }

  private async _saveModuleResult(
    moduleId: string,
    serializedModuleResult: SerializedModuleResult
  ): Promise<void> {
    if (this._isHardhatNetwork) {
      return;
    }

    const chainId = await this._getChainId();

    const deploymentsDirectory = path.join(
      this._paths.deployments,
      String(chainId)
    );

    fsExtra.ensureDirSync(deploymentsDirectory);

    const moduleResultPath = path.join(
      deploymentsDirectory,
      `${moduleId}.json`
    );

    await fsExtra.writeJson(moduleResultPath, serializedModuleResult, {
      spaces: 2,
    });
  }

  private async _getChainId(): Promise<number> {
    if (this._cachedChainId === undefined) {
      const { chainId } = await this._ethers.provider.getNetwork();
      this._cachedChainId = chainId;
    }

    return this._cachedChainId;
  }
}

type Resolved<T> = T extends string
  ? T
  : T extends Future<any, infer O>
  ? O extends string
    ? string
    : ethers.Contract
  : {
      [K in keyof T]: T[K] extends Future<any, infer O>
        ? O extends string
          ? string
          : ethers.Contract
        : T[K];
    };
