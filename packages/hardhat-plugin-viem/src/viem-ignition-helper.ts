import type { GetContractReturnType } from "@nomicfoundation/hardhat-viem/types";

import { HardhatIgnitionDeployer } from "@nomicfoundation/hardhat-ignition/helpers";
import {
  DeployConfig,
  DeploymentParameters,
  EIP1193Provider,
  Future,
  IgnitionModule,
  IgnitionModuleResult,
  isContractFuture,
  NamedArtifactContractAtFuture,
  NamedArtifactContractDeploymentFuture,
  SuccessfulDeploymentResult,
} from "@nomicfoundation/ignition-core";
import { HardhatPluginError } from "hardhat/plugins";
import { HardhatRuntimeEnvironment } from "hardhat/types";

export type IgnitionModuleResultsTToViemContracts<
  ContractNameT extends string,
  IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>
> = {
  [contract in keyof IgnitionModuleResultsT]: IgnitionModuleResultsT[contract] extends
    | NamedArtifactContractDeploymentFuture<ContractNameT>
    | NamedArtifactContractAtFuture<ContractNameT>
    ? TypeChainViemContractByName<ContractNameT>
    : GetContractReturnType;
};

// TODO: Make this work to have support for TypeChain
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type TypeChainViemContractByName<ContractNameT> = GetContractReturnType;

export class ViemIgnitionHelper {
  public type = "viem";

  private _hardhatIgnitionDeployer: HardhatIgnitionDeployer;

  constructor(
    private _hre: HardhatRuntimeEnvironment,
    private _config?: Partial<DeployConfig>,
    provider?: EIP1193Provider,
    deploymentDir?: string
  ) {
    this._hardhatIgnitionDeployer = new HardhatIgnitionDeployer(
      this._hre,
      this._config,
      provider ?? this._hre.network.provider,
      deploymentDir
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
    options?: {
      parameters?: DeploymentParameters;
      config?: Partial<DeployConfig>;
    }
  ): Promise<
    IgnitionModuleResultsTToViemContracts<ContractNameT, IgnitionModuleResultsT>
  > {
    const successfulDeploymentResult =
      await this._hardhatIgnitionDeployer.deploy(ignitionModule, options);

    return ViemIgnitionHelper._toViemContracts(
      this._hre,
      ignitionModule,
      successfulDeploymentResult
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
    IgnitionModuleResultsTToViemContracts<ContractNameT, IgnitionModuleResultsT>
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

    return hre.viem.getContractAt(
      future.contractName,
      this._ensureAddressFormat(deployedContract.address)
    );
  }

  private static _ensureAddressFormat(address: string): `0x${string}` {
    if (!address.startsWith("0x")) {
      return `0x${address}`;
    }

    return `0x${address.slice(2)}`;
  }
}
