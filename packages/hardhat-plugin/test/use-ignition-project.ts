import { DeployConfig } from "@nomicfoundation/ignition-core";
import { ensureDirSync, removeSync } from "fs-extra";
import { resetHardhatContext } from "hardhat/plugins-testing";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import path from "path";

declare module "mocha" {
  interface Context {
    hre: HardhatRuntimeEnvironment;
    deploymentDir: string | undefined;
    config: Partial<DeployConfig>;
  }
}

const defaultTestConfig: DeployConfig = {
  maxFeeBumps: 5,
  timeBeforeBumpingFees: 3 * 60 * 1000,
  blockPollingInterval: 200,
  requiredConfirmations: 1,
};

export function useEphemeralIgnitionProject(fixtureProjectName: string) {
  beforeEach("Load environment", async function () {
    process.chdir(
      path.join(__dirname, "./fixture-projects", fixtureProjectName)
    );

    const hre = require("hardhat");

    await hre.network.provider.send("evm_setAutomine", [true]);
    await hre.run("compile", { quiet: true });

    this.hre = hre;
    this.deploymentDir = undefined;

    await hre.run("compile", { quiet: true });

    // this.deploy = this.hre.ignition.deploy.bind(this.hre.ignition);
  });

  afterEach("reset hardhat context", function () {
    resetHardhatContext();
  });
}

export function useFileIgnitionProject(
  fixtureProjectName: string,
  deploymentId: string,
  config?: Partial<DeployConfig>
) {
  beforeEach("Load environment", async function () {
    process.chdir(
      path.join(__dirname, "./fixture-projects", fixtureProjectName)
    );

    const hre = require("hardhat");

    const deploymentDir = path.join(
      path.resolve(__dirname, "./fixture-projects/minimal/"),
      "deployments",
      deploymentId
    );

    this.hre = hre;
    this.deploymentDir = deploymentDir;

    await hre.run("compile", { quiet: true });

    const testConfig: Partial<DeployConfig> = {
      ...defaultTestConfig,
      ...config,
    };

    this.config = testConfig;

    ensureDirSync(deploymentDir);
  });

  afterEach("reset hardhat context", function () {
    resetHardhatContext();

    if (this.deploymentDir === undefined) {
      throw new Error(
        "Deployment dir not set during cleanup of file based project"
      );
    }

    removeSync(this.deploymentDir);
  });
}
