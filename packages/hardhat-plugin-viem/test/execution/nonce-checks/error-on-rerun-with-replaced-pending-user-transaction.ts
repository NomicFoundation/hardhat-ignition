/* eslint-disable import/no-unused-modules */
import { buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";
import { parseEther } from "viem";

import {
  TestChainHelper,
  useFileIgnitionProject,
} from "../../use-ignition-project";

/**
 * Run an initial deploy, that starts but does not finish several on-chain
 * transactions via Ignition. The user then replaces a transaction by
 * reusing a nonce with a higher gas value. On the rerun we should
 * error that there is a pending non-ignition transaction.
 */
describe("execution - error on rerun with replaced pending user transaction", () => {
  useFileIgnitionProject(
    "minimal",
    "error-on-rerun-with-replaced-pending-user-transaction"
  );

  it.skip("should error on the second run", async function () {
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

    // Start the deployment, but exit before processing a block,
    // so transactions are in memory pool but not confirmed
    await this.runControlledDeploy(
      moduleDefinition,
      async (c: TestChainHelper) => {
        // Wait for the submission of foo1 foo2 and foo3 to mempool
        await c.waitForPendingTxs(3);

        // Then kill before any blocks
        c.exitDeploy();
      }
    );

    const FooArtifact = require("../../fixture-projects/minimal/artifacts/contracts/Contracts.sol/Foo.json");

    // Send user interefering deploy transaction, between runs
    // so it is in mempool, overriding the existing nonce 2
    // transaction
    const [, , signer2] = (await this.hre.network.provider.request({
      method: "eth_accounts",
    })) as string[];
    const client = await this.hre.viem.getWalletClient(
      signer2 as `0x${string}`
    );
    void client.deployContract({
      abi: FooArtifact.abi,
      bytecode: FooArtifact.bytecode,
      args: [],
      account: signer2 as `0x${string}`,
      gasPrice: parseEther("500", "gwei"),
      nonce: 2,
    });

    // On the second run, we should detect the user interference
    // and error
    await assert.isRejected(
      this.deploy(moduleDefinition),
      "Pending transaction from user"
    );
  });
});
