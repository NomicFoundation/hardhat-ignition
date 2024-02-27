import { assert } from "chai";

import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project";

describe("chainId reconciliation", function () {
  this.timeout(60000);

  useEphemeralIgnitionProject("default-with-new-chain-id");

  it("should halt when running a deployment on a different chain", async function () {
    this.hre.network.name = "something-else";

    await assert.isRejected(
      this.hre.run(
        { scope: "ignition", task: "deploy" },
        {
          modulePath: "./ignition/modules/LockModule.js",
        }
      ),
      /The deployment's chain cannot be changed between runs. The deployment was previously run against the chain 123, but the current network is the chain 31337./
    );
  });
});
