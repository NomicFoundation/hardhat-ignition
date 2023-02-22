import {
  Ignition,
  IgnitionDeployOptions,
  Providers,
  Module,
  ModuleDict,
  ModuleParams,
  createServices,
  ICommandJournal,
  IgnitionError,
} from "@ignored/ignition-core";
import type { Contract } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { CommandJournal } from "./CommandJournal";
import { initializeRenderState, renderToCli } from "./ui/renderToCli";

type HardhatEthers = HardhatRuntimeEnvironment["ethers"];

type DeployResult<T extends ModuleDict> = {
  [K in keyof T]: Contract;
};

export class IgnitionWrapper {
  constructor(
    private _providers: Providers,
    private _ethers: HardhatEthers,
    private _deployOptions: Omit<
      IgnitionDeployOptions,
      keyof { force?: boolean }
    >
  ) {}

  public async deploy<T extends ModuleDict>(
    ignitionModule: Module<T>,
    deployParams?: {
      parameters?: ModuleParams;
      journalPath?: string | undefined;
      ui?: boolean;
      journal?: ICommandJournal;
      force?: boolean;
    }
  ): Promise<DeployResult<T>> {
    const showUi = deployParams?.ui ?? false;
    const force = deployParams?.force ?? false;

    const services = createServices(this._providers);
    const chainId = await services.network.getChainId();

    const ignition = new Ignition({
      services,
      uiRenderer: showUi
        ? renderToCli(initializeRenderState(), deployParams?.parameters)
        : undefined,
      journal: deployParams?.journal
        ? deployParams?.journal
        : deployParams?.journalPath !== undefined
        ? new CommandJournal(chainId, deployParams?.journalPath)
        : undefined,
    });

    if (deployParams?.parameters !== undefined) {
      await this._providers.config.setParams(deployParams.parameters);
    }

    const deploymentResult = await ignition.deploy(ignitionModule, {
      ...this._deployOptions,
      force,
    });

    if (deploymentResult._kind === "hold") {
      const heldVertexes = deploymentResult.holds;

      let heldMessage = "";
      for (const vertex of heldVertexes) {
        heldMessage += `  - ${vertex.label}\n`;
      }

      throw new IgnitionError(
        `Execution held for module '${ignitionModule.name}':\n\n${heldMessage}`
      );
    }

    if (deploymentResult._kind === "failure") {
      const [moduleId, failures] = deploymentResult.failures;

      let failuresMessage = "";
      for (const failure of failures) {
        failuresMessage += `  - ${failure.message}\n`;
      }

      throw new IgnitionError(
        `Execution failed for module '${moduleId}':\n\n${failuresMessage}`
      );
    }

    const resolvedOutput: { [k: string]: Contract } = {};
    for (const [key, contractInfo] of Object.entries(deploymentResult.result)) {
      const { abi, address } = contractInfo;

      const contract: any = await this._ethers.getContractAt(abi, address);
      contract.abi = abi;

      resolvedOutput[key] = contract as Contract;
    }

    return resolvedOutput as DeployResult<T>;
  }

  public async plan<T extends ModuleDict>(ignitionModule: Module<T>) {
    const ignition = new Ignition({
      services: createServices(this._providers),
    });

    return ignition.plan(ignitionModule);
  }
}
