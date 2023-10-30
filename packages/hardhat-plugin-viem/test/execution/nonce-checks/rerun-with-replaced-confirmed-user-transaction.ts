/* eslint-disable import/no-unused-modules */
import { buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";
import { parseEther } from "viem";

import {
  TestChainHelper,
  useFileIgnitionProject,
} from "../../use-ignition-project";
import { mineBlock, sleep } from "../helpers";

/**
 * Run an initial deploy, that starts but does not finish several on-chain
 * transactions via Ignition. The user then replaces a transaction by
 * reusing a nonce with a higher gas value. The user submitted transaction
 * confirms between runs. On the rerun we should we should resubmit
 * the original transaction with a new nonce.
 */
describe("execution - rerun with replaced confirmed user transaction", () => {
  useFileIgnitionProject(
    "minimal",
    "rerun-with-replaced-confirmed-user-transaction"
  );

  it.skip("should deploy user interfered transaction on second run", async function () {
    const moduleDefinition = buildModule("FooModule", (m) => {
      const account2 = m.getAccount(2);

      // batch 1
      const foo1 = m.contract("Foo", [], { id: "Foo1", from: account2 });
      const foo2 = m.contract("Foo", [], { id: "Foo2", from: account2 });
      const foo3 = m.contract("Foo", [], { id: "Foo3", from: account2 });

      return {
        foo1,
        foo2,
        foo3,
      };
    });

    // First run fo the deploy
    await this.runControlledDeploy(
      moduleDefinition,
      async (c: TestChainHelper) => {
        // Wait for the submission of foo1 foo2 and foo3 to mempool,
        // then kill the deploy process
        await c.waitForPendingTxs(3);
        c.exitDeploy();
      }
    );

    const FooArtifact = require("../../fixture-projects/minimal/artifacts/contracts/Contracts.sol/Foo.json");

    // Submit a user interfering deploy transaction
    // to the mempool reusing nonce 2
    const [, , signer2] = (await this.hre.network.provider.request({
      method: "eth_accounts",
    })) as string[];
    const client = await this.hre.viem.getWalletClient(
      signer2 as `0x${string}`
    );
    const deployPromise = client.deployContract({
      abi: FooArtifact.abi,
      bytecode: FooArtifact.bytecode,
      args: [],
      account: signer2 as `0x${string}`,
      gasPrice: parseEther("500", "gwei"),
      nonce: 2,
    });

    // mine a block confirming foo1, foo2, and the user provided transaction
    // foo3 is no longer in the mempool
    await sleep(300);
    await mineBlock(this.hre);

    // Rerun the deployment with foo3 replaced, causing it to
    // be resubmitted
    const result = await this.runControlledDeploy(
      moduleDefinition,
      async (c: TestChainHelper) => {
        // this block should confirm foo3
        await c.mineBlock(1);
      }
    );

    assert.isDefined(result);

    assert.equal(await result.foo1.read.x(), Number(1));
    assert.equal(await result.foo2.read.x(), Number(1));
    assert.equal(await result.foo3.read.x(), Number(1));

    // the user deployed contract is working as well
    const userDeployed = await deployPromise;
    assert(userDeployed);
  });
});
