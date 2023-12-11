import "@nomicfoundation/hardhat-verify";
import { Etherscan } from "@nomicfoundation/hardhat-verify/etherscan";
import {
  DeploymentParameters,
  IgnitionError,
  StatusResult,
} from "@nomicfoundation/ignition-core";
import { readdirSync } from "fs-extra";
import { extendConfig, extendEnvironment, scope } from "hardhat/config";
import {
  HardhatPluginError,
  NomicLabsHardhatPluginError,
} from "hardhat/plugins";
import path from "path";

import "./type-extensions";
import { calculateDeploymentStatusDisplay } from "./ui/helpers/calculate-deployment-status-display";
import { getApiKeyAndUrls } from "./utils/getApiKeyAndUrls";
import { resolveDeploymentId } from "./utils/resolve-deployment-id";
import { shouldBeHardhatPluginError } from "./utils/shouldBeHardhatPluginError";
import { verifyEtherscanContract } from "./utils/verifyEtherscanContract";

/* ignition config defaults */
const IGNITION_DIR = "ignition";

const ignitionScope = scope(
  "ignition",
  "Deploy your smart contracts using Hardhat Ignition"
);

extendConfig((config, userConfig) => {
  /* setup path configs */
  const userPathsConfig = userConfig.paths ?? {};

  config.paths = {
    ...config.paths,
    ignition: path.resolve(
      config.paths.root,
      userPathsConfig.ignition ?? IGNITION_DIR
    ),
  };

  /* setup core configs */
  const userIgnitionConfig = userConfig.ignition ?? {};

  config.ignition = userIgnitionConfig;
});

/**
 * Add an `ignition` stub to throw
 */
extendEnvironment((hre) => {
  if ((hre as any).ignition === undefined) {
    (hre as any).ignition = {
      type: "stub",
      deploy: () => {
        throw new HardhatPluginError(
          "hardhat-ignition",
          "Please install either `@nomicfoundation/hardhat-ignition-viem` or `@nomicfoundation/hardhat-ignition-ethers` to use Ignition in your Hardhat tests"
        );
      },
    };
  }
});

ignitionScope
  .task("deploy")
  .addPositionalParam("modulePath", "The path to the module file to deploy")
  .addOptionalParam(
    "parameters",
    "A relative path to a JSON file to use for the module parameters"
  )
  .addOptionalParam("deploymentId", "Set the id of the deployment")
  .addOptionalParam(
    "defaultSender",
    "Set the default sender for the deployment"
  )
  .addFlag("verify", "Verify the deployment on Etherscan")
  .setDescription("Deploy a module to the specified network")
  .setAction(
    async (
      {
        modulePath,
        parameters: parametersInput,
        deploymentId: givenDeploymentId,
        defaultSender,
        verify,
      }: {
        modulePath: string;
        parameters?: string;
        deploymentId: string | undefined;
        defaultSender: string | undefined;
        verify: boolean;
      },
      hre
    ) => {
      const { default: chalk } = await import("chalk");
      const { default: Prompt } = await import("prompts");
      const { deploy } = await import("@nomicfoundation/ignition-core");

      const { HardhatArtifactResolver } = await import(
        "./hardhat-artifact-resolver"
      );
      const { loadModule } = await import("./utils/load-module");
      const { PrettyEventHandler } = await import("./ui/pretty-event-handler");

      if (verify) {
        if (
          hre.config.etherscan === undefined ||
          hre.config.etherscan.apiKey === undefined ||
          hre.config.etherscan.apiKey === ""
        ) {
          throw new NomicLabsHardhatPluginError(
            "@nomicfoundation/hardhat-ignition",
            "No etherscan API key configured"
          );
        }
      }

      const chainId = Number(
        await hre.network.provider.request({
          method: "eth_chainId",
        })
      );

      if (chainId !== 31337) {
        const prompt = await Prompt({
          type: "confirm",
          name: "networkConfirmation",
          message: `Confirm deploy to network ${hre.network.name} (${chainId})?`,
          initial: false,
        });

        if (prompt.networkConfirmation !== true) {
          console.log("Deploy cancelled");
          return;
        }
      }

      await hre.run("compile", { quiet: true });

      const userModule = loadModule(hre.config.paths.ignition, modulePath);

      if (userModule === undefined) {
        console.warn("No Ignition modules found");
        process.exit(0);
      }

      let parameters: DeploymentParameters | undefined;
      if (parametersInput === undefined) {
        parameters = resolveParametersFromModuleName(
          userModule.id,
          hre.config.paths.ignition
        );
      } else if (parametersInput.endsWith(".json")) {
        parameters = resolveParametersFromFileName(parametersInput);
      } else {
        parameters = resolveParametersString(parametersInput);
      }

      const accounts = (await hre.network.provider.request({
        method: "eth_accounts",
      })) as string[];

      const deploymentId = resolveDeploymentId(givenDeploymentId, chainId);

      const deploymentDir =
        hre.network.name === "hardhat"
          ? undefined
          : path.join(hre.config.paths.ignition, "deployments", deploymentId);

      const artifactResolver = new HardhatArtifactResolver(hre);

      const executionEventListener = new PrettyEventHandler();

      try {
        const result = await deploy({
          config: hre.config.ignition,
          provider: hre.network.provider,
          executionEventListener,
          artifactResolver,
          deploymentDir,
          ignitionModule: userModule,
          deploymentParameters: parameters ?? {},
          accounts,
          defaultSender,
        });

        if (result.type === "SUCCESSFUL_DEPLOYMENT" && verify) {
          console.log("");
          console.log(chalk.bold("Verifying deployed contracts"));
          console.log("");

          await hre.run(
            { scope: "ignition", task: "verify" },
            { deploymentId }
          );
        }
      } catch (e) {
        if (e instanceof IgnitionError && shouldBeHardhatPluginError(e)) {
          throw new NomicLabsHardhatPluginError(
            "hardhat-ignition",
            e.message,
            e
          );
        }

        throw e;
      }
    }
  );

ignitionScope
  .task("visualize")
  .addFlag("noOpen", "Disables opening report in browser")
  .addPositionalParam("modulePath", "The path to the module file to visualize")
  .setDescription("Visualize a module as an HTML report")
  .setAction(
    async (
      { noOpen = false, modulePath }: { noOpen: boolean; modulePath: string },
      hre
    ) => {
      const { IgnitionModuleSerializer, batches } = await import(
        "@nomicfoundation/ignition-core"
      );

      const { loadModule } = await import("./utils/load-module");
      const { open } = await import("./utils/open");

      const { writeVisualization } = await import(
        "./visualization/write-visualization"
      );

      await hre.run("compile", { quiet: true });

      const userModule = loadModule(hre.config.paths.ignition, modulePath);

      if (userModule === undefined) {
        console.warn("No Ignition modules found");
        process.exit(0);
      }

      try {
        const serializedIgnitionModule =
          IgnitionModuleSerializer.serialize(userModule);

        const batchInfo = batches(userModule);

        await writeVisualization(
          { module: serializedIgnitionModule, batches: batchInfo },
          {
            cacheDir: hre.config.paths.cache,
          }
        );
      } catch (e) {
        if (e instanceof IgnitionError && shouldBeHardhatPluginError(e)) {
          throw new NomicLabsHardhatPluginError(
            "hardhat-ignition",
            e.message,
            e
          );
        }

        throw e;
      }

      if (!noOpen) {
        const indexFile = path.join(
          hre.config.paths.cache,
          "visualization",
          "index.html"
        );

        console.log(`Deployment visualization written to ${indexFile}`);

        open(indexFile);
      }
    }
  );

ignitionScope
  .task("status")
  .addPositionalParam("deploymentId", "The id of the deployment to show")
  .setDescription("Show the current status of a deployment")
  .setAction(async ({ deploymentId }: { deploymentId: string }, hre) => {
    const { status } = await import("@nomicfoundation/ignition-core");

    const deploymentDir = path.join(
      hre.config.paths.ignition,
      "deployments",
      deploymentId
    );

    let statusResult: StatusResult;
    try {
      statusResult = await status(deploymentDir);
    } catch (e) {
      if (e instanceof IgnitionError && shouldBeHardhatPluginError(e)) {
        throw new NomicLabsHardhatPluginError("hardhat-ignition", e.message, e);
      }

      throw e;
    }

    console.log(calculateDeploymentStatusDisplay(deploymentId, statusResult));
  });

ignitionScope
  .task("wipe")
  .addPositionalParam(
    "deploymentId",
    "The id of the deployment with the future to wipe"
  )
  .addPositionalParam("futureId", "The id of the future to wipe")
  .setDescription("Reset a deployment's future to allow rerunning")
  .setAction(
    async (
      { deploymentId, futureId }: { deploymentId: string; futureId: string },
      hre
    ) => {
      const { wipe } = await import("@nomicfoundation/ignition-core");

      const { HardhatArtifactResolver } = await import(
        "./hardhat-artifact-resolver"
      );

      const deploymentDir = path.join(
        hre.config.paths.ignition,
        "deployments",
        deploymentId
      );

      try {
        await wipe(deploymentDir, new HardhatArtifactResolver(hre), futureId);
      } catch (e) {
        if (e instanceof IgnitionError && shouldBeHardhatPluginError(e)) {
          throw new NomicLabsHardhatPluginError(
            "hardhat-ignition",
            e.message,
            e
          );
        }

        throw e;
      }

      console.log(`${futureId} state has been cleared`);
    }
  );

ignitionScope
  .task("verify")
  .addPositionalParam("deploymentId", "The id of the deployment to verify")
  .setDescription(
    "Verify contracts from a deployment against the configured block explorers"
  )
  .setAction(async ({ deploymentId }: { deploymentId: string }, hre) => {
    const { getVerificationInformation } = await import(
      "@nomicfoundation/ignition-core"
    );

    const deploymentDir = path.join(
      hre.config.paths.ignition,
      "deployments",
      deploymentId
    );

    if (
      hre.config.etherscan === undefined ||
      hre.config.etherscan.apiKey === undefined ||
      hre.config.etherscan.apiKey === ""
    ) {
      throw new NomicLabsHardhatPluginError(
        "@nomicfoundation/hardhat-ignition",
        "No etherscan API key configured"
      );
    }

    try {
      for await (const [
        chainConfig,
        contractInfo,
      ] of getVerificationInformation(
        deploymentDir,
        hre.config.etherscan.customChains
      )) {
        const apiKeyAndUrls = getApiKeyAndUrls(
          hre.config.etherscan.apiKey,
          chainConfig
        );

        const instance = new Etherscan(...apiKeyAndUrls);

        console.log(
          `Verifying contract "${contractInfo.name}" for network ${chainConfig.network}...`
        );

        const result = await verifyEtherscanContract(instance, contractInfo);

        if (result.type === "success") {
          console.log(
            `Successfully verified contract "${contractInfo.name}" for network ${chainConfig.network}:\n  - ${result.contractURL}`
          );
          console.log("");
        } else {
          if (/already verified/gi.test(result.reason.message)) {
            const contractURL = instance.getContractUrl(contractInfo.address);
            console.log(
              `Contract ${contractInfo.name} already verified on network ${chainConfig.network}:\n  - ${contractURL}`
            );
            console.log("");
            continue;
          } else {
            throw new NomicLabsHardhatPluginError(
              "hardhat-ignition",
              result.reason.message
            );
          }
        }
      }
    } catch (e) {
      if (e instanceof IgnitionError && shouldBeHardhatPluginError(e)) {
        throw new NomicLabsHardhatPluginError("hardhat-ignition", e.message, e);
      }

      throw e;
    }
  });

function resolveParametersFromModuleName(
  moduleName: string,
  ignitionPath: string
): DeploymentParameters | undefined {
  const files = readdirSync(ignitionPath);
  const configFilename = `${moduleName}.config.json`;

  return files.includes(configFilename)
    ? resolveConfigPath(path.resolve(ignitionPath, configFilename))
    : undefined;
}

function resolveParametersFromFileName(fileName: string): DeploymentParameters {
  const filepath = path.resolve(process.cwd(), fileName);

  return resolveConfigPath(filepath);
}

function resolveConfigPath(filepath: string): DeploymentParameters {
  try {
    return require(filepath);
  } catch {
    console.warn(`Could not parse parameters from ${filepath}`);
    process.exit(0);
  }
}

function resolveParametersString(paramString: string): DeploymentParameters {
  try {
    return JSON.parse(paramString);
  } catch {
    console.warn(`Could not parse JSON parameters`);
    process.exit(0);
  }
}
