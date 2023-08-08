import setupDebug from "debug";
import { Deployer } from "./internal/deployer";
import { EphemeralDeploymentLoader } from "./internal/deployment-loader/ephemeral-deployment-loader";
import { FileDeploymentLoader } from "./internal/deployment-loader/file-deployment-loader";
import { ChainDispatcherImpl } from "./internal/execution/chain-dispatcher";
import { buildAdaptersFrom } from "./internal/utils/build-adapters-from";
import { ArtifactResolver } from "./types/artifact";
import {
  DeployConfig,
  DeploymentParameters,
  DeploymentResult,
} from "./types/deployer";
import { IgnitionModuleResult } from "./types/module";
import { IgnitionModuleDefinition } from "./types/module-builder";
import { EIP1193Provider } from "./types/provider";

const debug = setupDebug("ignition-core:deploy");

/**
 * Deploy an IgnitionModule to the chain
 *
 * @beta
 */
export async function deploy({
  config = {},
  artifactResolver,
  provider,
  deploymentDir,
  moduleDefinition,
  deploymentParameters,
  accounts,
  verbose,
}: {
  config?: Partial<DeployConfig>;
  artifactResolver: ArtifactResolver;
  provider: EIP1193Provider;
  deploymentDir?: string;
  moduleDefinition: IgnitionModuleDefinition<
    string,
    string,
    IgnitionModuleResult<string>
  >;
  deploymentParameters: DeploymentParameters;
  accounts: string[];
  verbose: boolean;
}): Promise<DeploymentResult> {
  debug(`Starting deployment for ${moduleDefinition?.id}`);

  const deploymentLoader =
    deploymentDir === undefined
      ? new EphemeralDeploymentLoader(artifactResolver, verbose)
      : new FileDeploymentLoader(deploymentDir, verbose);

  const chainDispatcher = new ChainDispatcherImpl(buildAdaptersFrom(provider));

  const deployer = new Deployer({
    config,
    artifactResolver,
    deploymentLoader,
    chainDispatcher,
  });

  return deployer.deploy(moduleDefinition, deploymentParameters, accounts);
}
