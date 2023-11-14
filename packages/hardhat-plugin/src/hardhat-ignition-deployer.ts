import {
  deploy,
  DeployConfig,
  DeploymentParameters,
  DeploymentResultType,
  EIP1193Provider,
  IgnitionModule,
  IgnitionModuleResult,
  SuccessfulDeploymentResult,
} from "@nomicfoundation/ignition-core";
import { HardhatPluginError } from "hardhat/plugins";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { HardhatArtifactResolver } from "./hardhat-artifact-resolver";
import { errorDeploymentResultToExceptionMessage } from "./utils/error-deployment-result-to-exception-message";

export class HardhatIgnitionDeployer {
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
  ): Promise<SuccessfulDeploymentResult> {
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

    return result;
  }
}
