import {
  DeploymentStrategyType,
  buildModule,
} from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { mineBlock } from "../test-helpers/mine-block";
import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project";
import { waitForPendingTxs } from "../test-helpers/wait-for-pending-txs";

const strategies = ["basic", "create2"];

describe("strategies", function () {
  strategies.forEach((strategy) => {
    describe(strategy, function () {
      useEphemeralIgnitionProject("minimal");

      it("should deploy a contract", async function () {
        const moduleDefinition = buildModule("FooModule", (m) => {
          const foo = m.contract("Foo");

          return { foo };
        });

        const deployPromise = this.hre.ignition.deploy(moduleDefinition, {
          strategy: strategyNameToType(strategy),
        });

        await waitForPendingTxs(this.hre, 1, deployPromise);
        await mineBlock(this.hre);

        const result = await deployPromise;

        assert.isDefined(result.foo.address);

        assert.equal(await result.foo.read.x(), Number(1));
      });

      it("should deploy multiple contracts", async function () {
        const moduleDefinition = buildModule("FooModule", (m) => {
          const foo = m.contract("Foo");
          const bar = m.contract("Bar");

          return { foo, bar };
        });

        const deployPromise = this.hre.ignition.deploy(moduleDefinition, {
          strategy: strategyNameToType(strategy),
        });

        await waitForPendingTxs(this.hre, 2, deployPromise);
        await mineBlock(this.hre);

        const result = await deployPromise;

        assert.isDefined(result.foo.address);
        assert.isDefined(result.bar.address);

        assert.equal(await result.foo.read.x(), Number(1));
        assert.equal(await result.bar.read.isBar(), true);
      });

      it("should call a contract function", async function () {
        const moduleDefinition = buildModule("FooModule", (m) => {
          const foo = m.contract("Foo");
          m.call(foo, "inc");

          return { foo };
        });

        const deployPromise = this.hre.ignition.deploy(moduleDefinition, {
          strategy: strategyNameToType(strategy),
        });

        await waitForPendingTxs(this.hre, 1, deployPromise);
        await mineBlock(this.hre);
        await waitForPendingTxs(this.hre, 1, deployPromise);
        await mineBlock(this.hre);

        const result = await deployPromise;

        assert.isDefined(result.foo.address);

        assert.equal(await result.foo.read.x(), Number(2));
      });

      it("should read an event emitted from a constructor", async function () {
        const moduleDefinition = buildModule("FooModule", (m) => {
          const foo = m.contract("EventArgValue");

          const arg = m.readEventArgument(foo, "EventValue", "value");

          m.call(foo, "validateEmitted", [arg]);

          return { foo };
        });

        const deployPromise = this.hre.ignition.deploy(moduleDefinition, {
          strategy: strategyNameToType(strategy),
        });

        await waitForPendingTxs(this.hre, 1, deployPromise);
        await mineBlock(this.hre);
        await waitForPendingTxs(this.hre, 1, deployPromise);
        await mineBlock(this.hre);

        const result = await deployPromise;

        assert.isDefined(result.foo.address);

        assert.equal(await result.foo.read.argWasValidated(), true);
      });

      it("should read an event emitted from a function", async function () {
        const moduleDefinition = buildModule("FooModule", (m) => {
          const foo = m.contract("SendDataEmitter");

          const eventCall = m.call(foo, "emitEvent");

          const arg = m.readEventArgument(eventCall, "SendDataEvent", "arg", {
            emitter: foo,
          });

          m.call(foo, "validateEmitted", [arg]);

          return { foo };
        });

        const deployPromise = this.hre.ignition.deploy(moduleDefinition, {
          strategy: strategyNameToType(strategy),
        });

        await waitForPendingTxs(this.hre, 1, deployPromise);
        await mineBlock(this.hre);
        await waitForPendingTxs(this.hre, 1, deployPromise);
        await mineBlock(this.hre);
        await waitForPendingTxs(this.hre, 1, deployPromise);
        await mineBlock(this.hre);

        const result = await deployPromise;

        assert.isDefined(result.foo.address);

        assert.equal(await result.foo.read.wasEmitted(), true);
      });
    });
  });
});

function strategyNameToType(strategyName: string): DeploymentStrategyType {
  switch (strategyName) {
    case "basic":
      return DeploymentStrategyType.BASIC;
    case "create2":
      return DeploymentStrategyType.CREATE2;
    default:
      throw new Error(`Unknown strategy name: ${strategyName}`);
  }
}
