/* eslint-disable import/no-unused-modules */
import { buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";
import { parseEther } from "viem";

import {
  TestChainHelper,
  useFileIgnitionProject,
} from "../../use-ignition-project";

/**
 * On running a deploy, if a transaction is pending and the user
 * sends a new transaction outside Ignition on the same account
 * we should error and halt immediately
 */
describe("execution - error on user transaction sent", () => {
  useFileIgnitionProject("minimal", "error-on-user-transaction-sent");

  it.skip("should error on the drop being detected", async function () {
    const moduleDefinition = buildModule("FooModule", (m) => {
      const account2 = m.getAccount(2);

      // batch 1
      const foo1 = m.contract("Foo", [], { id: "Foo1", from: account2 });

      // batch 2
      const foo2 = m.contract("Foo", [], {
        id: "Foo2",
        from: account2,
        after: [foo1],
      });

      return {
        foo1,
        foo2,
      };
    });

    // The deploy should exception when the additional user interfering
    // transaction is detected
    await assert.isRejected(
      this.runControlledDeploy(moduleDefinition, async (c: TestChainHelper) => {
        // wait for foo1 to be submitted
        await c.waitForPendingTxs(1);

        const FooArtifact = require("../../fixture-projects/minimal/artifacts/contracts/Contracts.sol/Foo.json");

        // Submit user interference transaction to mempool (note a fresh
        // nonce is used, so no replacement)
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
        });

        // Process block 1 with foo1
        await c.mineBlock(2);
      }),
      "A transaction has been submitted on the account 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc outside of the deployment"
    );
  });
});
