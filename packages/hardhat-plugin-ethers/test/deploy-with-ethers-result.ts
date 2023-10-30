/* eslint-disable import/no-unused-modules */
import { buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";
import { resetHardhatContext } from "hardhat/plugins-testing";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import path from "path";

const fixtureProjectName = "minimal";

declare module "mocha" {
  interface Context {
    hre: HardhatRuntimeEnvironment;
  }
}

describe("deploy with ethers result", () => {
  beforeEach("Load environment", async function () {
    process.chdir(
      path.join(__dirname, "./fixture-projects", fixtureProjectName)
    );

    const hre = require("hardhat");

    await hre.network.provider.send("evm_setAutomine", [true]);
    await hre.run("compile", { quiet: true });

    this.hre = hre;
  });

  afterEach("reset hardhat context", function () {
    resetHardhatContext();
  });

  it("should get return ethers result from deploy", async function () {
    const moduleDefinition = buildModule("FooModule", (m) => {
      const foo = m.contract("Foo");
      const fooAt = m.contractAt("Foo", foo, { id: "FooAt" });

      return { foo, fooAt };
    });

    const result = await this.hre.ignition.deploy(moduleDefinition);

    assert.equal(await result.foo.x(), 1n);
    assert.equal(await result.fooAt.x(), 1n);
  });
});
