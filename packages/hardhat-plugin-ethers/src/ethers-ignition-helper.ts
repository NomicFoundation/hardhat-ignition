import { HardhatIgnitionDeployer } from "@nomicfoundation/hardhat-ignition/helpers";
import {
  DeployConfig,
  DeploymentParameters,
  EIP1193Provider,
  Future,
  IgnitionModule,
  IgnitionModuleResult,
  NamedArtifactContractAtFuture,
  NamedArtifactContractDeploymentFuture,
  SuccessfulDeploymentResult,
  isContractFuture,
} from "@nomicfoundation/ignition-core";
import { Contract } from "ethers";
import { HardhatPluginError } from "hardhat/plugins";
import { HardhatRuntimeEnvironment } from "hardhat/types";

export type IgnitionModuleResultsTToEthersContracts<
  ContractNameT extends string,
  IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>
> = {
  [contract in keyof IgnitionModuleResultsT]: IgnitionModuleResultsT[contract] extends
    | NamedArtifactContractDeploymentFuture<ContractNameT>
    | NamedArtifactContractAtFuture<ContractNameT>
    ? TypeChainEthersContractByName<ContractNameT>
    : Contract;
};

// TODO: Make this work to have support for TypeChain
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type TypeChainEthersContractByName<ContractNameT> = Contract;

export class EthersIgnitionHelper {
  public type = "ethers";

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
    IgnitionModuleResultsTToEthersContracts<
      ContractNameT,
      IgnitionModuleResultsT
    >
  > {
    const successfulDeploymentResult =
      await this._hardhatIgnitionDeployer.deploy(ignitionModule, options);

    return this._toEthersContracts(ignitionModule, successfulDeploymentResult);
  }

  private async _toEthersContracts<
    ModuleIdT extends string,
    ContractNameT extends string,
    IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>
  >(
    ignitionModule: IgnitionModule<
      ModuleIdT,
      ContractNameT,
      IgnitionModuleResultsT
    >,
    result: SuccessfulDeploymentResult
  ): Promise<
    IgnitionModuleResultsTToEthersContracts<
      ContractNameT,
      IgnitionModuleResultsT
    >
  > {
    return Object.fromEntries(
      await Promise.all(
        Object.entries(ignitionModule.results).map(
          async ([name, contractFuture]) => [
            name,
            await this._getContract(
              contractFuture,
              result.contracts[contractFuture.id]
            ),
          ]
        )
      )
    );
  }

  private async _getContract(
    future: Future,
    deployedContract: { address: string }
  ): Promise<Contract> {
    if (!isContractFuture(future)) {
      throw new HardhatPluginError(
        "hardhat-ignition",
        `Expected contract future but got ${future.id} with type ${future.type} instead`
      );
    }

    if ("artifact" in future) {
      return this._hre.ethers.getContractAt(
        future.artifact.abi,
        deployedContract.address
      );
    }

    return this._hre.ethers.getContractAt(
      future.contractName,
      deployedContract.address
    );
  }
}
