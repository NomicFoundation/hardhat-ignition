import type { GetContractReturnType } from "@nomicfoundation/hardhat-viem/types";

import {
  HardhatArtifactResolver,
  errorDeploymentResultToExceptionMessage,
} from "@nomicfoundation/hardhat-ignition/helpers";
import {
  ContractAtFuture,
  ContractDeploymentFuture,
  ContractFuture,
  DeployConfig,
  DeploymentParameters,
  DeploymentResultType,
  EIP1193Provider,
  Future,
  FutureType,
  IgnitionModule,
  IgnitionModuleResult,
  LibraryDeploymentFuture,
  NamedArtifactContractAtFuture,
  NamedArtifactContractDeploymentFuture,
  NamedArtifactLibraryDeploymentFuture,
  SuccessfulDeploymentResult,
  deploy,
  isContractFuture,
} from "@nomicfoundation/ignition-core";
import { HardhatPluginError } from "hardhat/plugins";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { IgnitionModuleResultsToViemContracts } from "./ignition-module-results-to-viem-contracts";

export class ViemIgnitionHelper {
  public type = "viem";

  private _provider: EIP1193Provider;
  private _deploymentDir: string | undefined;

  constructor(
    private _hre: HardhatRuntimeEnvironment,
    private _config?: Partial<DeployConfig>,
    provider?: EIP1193Provider,
    deploymentDir?: string
  ) {
    this._provider = provider ?? this._hre.network.provider;
    this._deploymentDir = deploymentDir;
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
    {
      parameters = {},
      config: perDeployConfig = {},
    }: {
      parameters?: DeploymentParameters;
      config?: Partial<DeployConfig>;
    } = {
      parameters: {},
      config: {},
    }
  ): Promise<
    IgnitionModuleResultsToViemContracts<ContractNameT, IgnitionModuleResultsT>
  > {
    const accounts = (await this._hre.network.provider.request({
      method: "eth_accounts",
    })) as string[];

    const artifactResolver = new HardhatArtifactResolver(this._hre);

    const resolvedConfig: Partial<DeployConfig> = {
      ...this._config,
      ...perDeployConfig,
    };

    const result = await deploy({
      config: resolvedConfig,
      provider: this._provider,
      deploymentDir: this._deploymentDir,
      artifactResolver,
      ignitionModule,
      deploymentParameters: parameters,
      accounts,
    });

    if (result.type !== DeploymentResultType.SUCCESSFUL_DEPLOYMENT) {
      const message = errorDeploymentResultToExceptionMessage(result);

      throw new HardhatPluginError("hardhat-ignition-viem", message);
    }

    return ViemIgnitionHelper._toViemContracts(
      this._hre,
      ignitionModule,
      result
    );
  }

  private static async _toViemContracts<
    ModuleIdT extends string,
    ContractNameT extends string,
    IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>
  >(
    hre: HardhatRuntimeEnvironment,
    ignitionModule: IgnitionModule<
      ModuleIdT,
      ContractNameT,
      IgnitionModuleResultsT
    >,
    result: SuccessfulDeploymentResult
  ): Promise<
    IgnitionModuleResultsToViemContracts<ContractNameT, IgnitionModuleResultsT>
  > {
    return Object.fromEntries(
      await Promise.all(
        Object.entries(ignitionModule.results).map(
          async ([name, contractFuture]) => [
            name,
            await this._getContract(
              hre,
              contractFuture,
              result.contracts[contractFuture.id]
            ),
          ]
        )
      )
    );
  }

  private static async _getContract(
    hre: HardhatRuntimeEnvironment,
    future: Future,
    deployedContract: { address: string }
  ): Promise<GetContractReturnType> {
    if (!isContractFuture(future)) {
      throw new HardhatPluginError(
        "hardhat-ignition-viem",
        `Expected contract future but got ${future.id} with type ${future.type} instead`
      );
    }

    return this._convertContractFutureToViemContract(
      hre,
      future,
      deployedContract
    );
  }

  private static async _convertContractFutureToViemContract(
    hre: HardhatRuntimeEnvironment,
    future: ContractFuture<string>,
    deployedContract: { address: string }
  ) {
    switch (future.type) {
      case FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT:
      case FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT:
      case FutureType.NAMED_ARTIFACT_CONTRACT_AT:
        return this._convertHardhatContractToViemContract(
          hre,
          future,
          deployedContract
        );
      case FutureType.CONTRACT_DEPLOYMENT:
      case FutureType.LIBRARY_DEPLOYMENT:
      case FutureType.CONTRACT_AT:
        return this._convertArtifactToViemContract(
          hre,
          future,
          deployedContract
        );
    }
  }

  private static _convertHardhatContractToViemContract(
    hre: HardhatRuntimeEnvironment,
    future:
      | NamedArtifactContractDeploymentFuture<string>
      | NamedArtifactLibraryDeploymentFuture<string>
      | NamedArtifactContractAtFuture<string>,
    deployedContract: { address: string }
  ) {
    return hre.viem.getContractAt(
      future.contractName,
      this._ensureAddressFormat(deployedContract.address)
    );
  }

  private static async _convertArtifactToViemContract(
    hre: HardhatRuntimeEnvironment,
    future:
      | ContractDeploymentFuture
      | LibraryDeploymentFuture
      | ContractAtFuture,
    deployedContract: { address: string }
  ) {
    const publicClient = await hre.viem.getPublicClient();
    const [walletClient] = await hre.viem.getWalletClients();

    if (walletClient === undefined) {
      throw new HardhatPluginError(
        "hardhat-ignition-viem",
        "No default wallet client found"
      );
    }

    const viem = await import("viem");
    const contract = viem.getContract({
      address: this._ensureAddressFormat(deployedContract.address),
      abi: future.artifact.abi,
      publicClient,
      walletClient,
    });

    return contract;
  }

  private static _ensureAddressFormat(address: string): `0x${string}` {
    if (!address.startsWith("0x")) {
      return `0x${address}`;
    }

    return `0x${address.slice(2)}`;
  }
}
