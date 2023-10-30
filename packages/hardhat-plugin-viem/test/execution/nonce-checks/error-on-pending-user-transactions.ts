/* eslint-disable import/no-unused-modules */
import { buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { waitForPendingTxs } from "../../helpers";
import {
  TestChainHelper,
  useFileIgnitionProject,
} from "../../use-ignition-project";
import { mineBlock } from "../helpers";

/**
 * For all accounts that will be used during the deployment we check
 * to see if there are pending transactions (not from previous runs)
 * and error if there are any.
 */
describe("execution - error on pending user transactions", () => {
  useFileIgnitionProject(
    "minimal",
    "error-on-rerun-with-replaced-pending-user-transaction"
  );

  it.skip("should error if a transaction is in flight for an account used in the deploy", async function () {
    // Setup a module with a contract deploy on accounts[2]
    const moduleDefinition = buildModule("FooModule", (m) => {
      const account2 = m.getAccount(2);

      const foo = m.contract("Foo", [], { from: account2 });

      return {
        foo,
      };
    });

    const FooArtifact = require("../../fixture-projects/minimal/artifacts/contracts/Contracts.sol/Foo.json");

    // Before deploy, put a valid transaction into the mempool for accounts[2]
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
    });
    await waitForPendingTxs(this.hre, 1, deployPromise);

    // Deploying the module that uses accounts[2] throws with a warning
    await assert.isRejected(
      this.runControlledDeploy(
        moduleDefinition,
        async (_c: TestChainHelper) => {}
      ),
      "Pending transactions for account: 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc, please wait for transactions to complete before running a deploy"
    );

    // Now mine the user interference transaction
    await mineBlock(this.hre);

    // The users interfering transaction completes normally
    const outsideFoo = await deployPromise;
    assert(outsideFoo);
  });
});
