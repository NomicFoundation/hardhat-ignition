/* eslint-disable import/no-unused-modules */
import { assert } from "chai";
import { ensureDir, copyFile, pathExists } from "fs-extra";
import path from "path";

import { useFileIgnitionProject } from "../test-helpers/use-ignition-project";

describe("reset flag", function () {
  useFileIgnitionProject("reset-flag", "customResetId");

  it("should reset a deployment", async function () {
    this.hre.network.name = "something-else";

    const deploymentDir = path.join(
      path.resolve(__dirname, `../fixture-projects/reset-flag/ignition`),
      "deployments",
      "customResetId"
    );

    await ensureDir(deploymentDir);

    await copyFile(
      path.resolve(__dirname, "../fixture-projects/reset-flag/journal.jsonl"),
      path.join(deploymentDir, "journal.jsonl")
    );

    await assert.isFulfilled(
      this.hre.run(
        { scope: "ignition", task: "deploy" },
        {
          modulePath: "./ignition/modules/LockModule.js",
          deploymentId: "customResetId",
          reset: true,
        }
      )
    );

    await assert.isFulfilled(
      pathExists(path.join(deploymentDir, "deployed_addresses.json"))
    );
  });
});
