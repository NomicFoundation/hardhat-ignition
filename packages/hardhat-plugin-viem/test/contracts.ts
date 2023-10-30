/* eslint-disable import/no-unused-modules */
import { buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";
import { parseEther } from "viem";

import { useEphemeralIgnitionProject } from "./use-ignition-project";

describe("contract deploys", () => {
  useEphemeralIgnitionProject("minimal");

  it("should be able to deploy a contract", async function () {
    const moduleDefinition = buildModule("FooModule", (m) => {
      const foo = m.contract("Foo");

      return { foo };
    });

    const result = await this.deploy(moduleDefinition);

    assert.equal(await result.foo.read.x(), Number(1));
  });

  it("should be able to deploy a contract with arguments", async function () {
    const moduleDefinition = buildModule("GreeterModule", (m) => {
      const greeter = m.contract("Greeter", ["Hello World"]);

      return { greeter };
    });

    const result = await this.deploy(moduleDefinition);

    const greeting = await result.greeter.read.getGreeting();
    assert.equal(greeting, "Hello World");
  });

  it("should be able to deploy contracts with dependencies", async function () {
    const moduleDefinition = buildModule("DependentModule", (m) => {
      const bar = m.contract("Bar");
      const usesContract = m.contract("UsesContract", [bar]);

      return { bar, usesContract };
    });

    const result = await this.deploy(moduleDefinition);

    assert.isDefined(result.bar);
    assert.isDefined(result.usesContract);

    const usedAddress =
      (await result.usesContract.read.contractAddress()) as string;

    assert.equal(usedAddress.toLowerCase(), result.bar.address.toLowerCase());
  });

  it("should be able to deploy contracts without dependencies", async function () {
    const moduleDefinition = buildModule("WithoutDepModule", (m) => {
      const foo = m.contract("Foo");
      const bar = m.contract("Bar");

      return { foo, bar };
    });

    const result = await this.deploy(moduleDefinition);

    const x = await result.foo.read.x();
    const isBar = await result.bar.read.isBar();

    assert.equal(x, Number(1));
    assert.equal(isBar, true);
  });

  it("should be able to use an artifact to deploy a contract", async function () {
    await this.hre.run("compile", { quiet: true });

    const artifact = await this.hre.artifacts.readArtifact("Greeter");

    const moduleDefinition = buildModule("ArtifactModule", (m) => {
      const greeter = m.contract("Greeter", artifact, ["Hello World"]);

      return { greeter };
    });

    const result = await this.deploy(moduleDefinition);

    const greeting = await result.greeter.read.getGreeting();
    assert.equal(greeting, "Hello World");
  });

  describe("with endowment", () => {
    it("should be able to deploy a contract with an endowment", async function () {
      const moduleDefinition = buildModule("EndowmentModule", (m) => {
        const passingValue = m.contract("PassingValue", [], {
          value: BigInt(parseEther("1").toString()),
        });

        return { passingValue };
      });

      const result = await this.deploy(moduleDefinition);

      assert.isDefined(result.passingValue);

      const actualInstanceBalance = await (
        await this.hre.viem.getPublicClient()
      ).getBalance({ address: result.passingValue.address });

      assert.equal(
        actualInstanceBalance.toString(),
        parseEther("1").toString()
      );
    });

    it("should be able to deploy a contract with an endowment via a parameter", async function () {
      const submoduleDefinition = buildModule("submodule", (m) => {
        const endowment = m.getParameter(
          "endowment",
          BigInt(parseEther("2").toString())
        );

        const passingValue = m.contract("PassingValue", [], {
          value: endowment,
        });

        return { passingValue };
      });

      const moduleDefinition = buildModule("Module", (m) => {
        const { passingValue } = m.useModule(submoduleDefinition);

        return { passingValue };
      });

      const result = await this.deploy(moduleDefinition);

      assert.isDefined(result.passingValue);

      const actualInstanceBalance = await (
        await this.hre.viem.getPublicClient()
      ).getBalance({ address: result.passingValue.address });

      assert.equal(
        actualInstanceBalance.toString(),
        parseEther("2").toString()
      );
    });

    it("should be able to deploy a contract with an endowment via a static call", async function () {
      const submoduleDefinition = buildModule("submodule", (m) => {
        const valueContract = m.contract("StaticCallValue");

        const valueResult = m.staticCall(valueContract, "getValue");

        const passingValue = m.contract("PassingValue", [], {
          value: valueResult,
        });

        return { passingValue };
      });

      const moduleDefinition = buildModule("Module", (m) => {
        const { passingValue } = m.useModule(submoduleDefinition);

        return { passingValue };
      });

      const result = await this.deploy(moduleDefinition);

      assert.isDefined(result.passingValue);

      const actualInstanceBalance = await (
        await this.hre.viem.getPublicClient()
      ).getBalance({ address: result.passingValue.address });

      assert.equal(actualInstanceBalance.toString(), "42");
    });

    it("should be able to deploy a contract with an endowment via an event argument", async function () {
      const submoduleDefinition = buildModule("submodule", (m) => {
        const valueContract = m.contract("EventArgValue");

        const valueResult = m.readEventArgument(
          valueContract,
          "EventValue",
          "value"
        );

        const passingValue = m.contract("PassingValue", [], {
          value: valueResult,
        });

        return { passingValue };
      });

      const moduleDefinition = buildModule("Module", (m) => {
        const { passingValue } = m.useModule(submoduleDefinition);

        return { passingValue };
      });

      const result = await this.deploy(moduleDefinition);

      assert.isDefined(result.passingValue);

      const actualInstanceBalance = await (
        await this.hre.viem.getPublicClient()
      ).getBalance({ address: result.passingValue.address });

      assert.equal(actualInstanceBalance.toString(), "42");
    });
  });
});
