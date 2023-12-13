import { assert } from "chai";

import { useHardhatProject } from "../../helpers/hardhat-projects";

// This test exists to ensure Ignition succeeds in a CI environment.
// It should always pass locally.
describe("CI - basic success case", function () {
  this.timeout(60000);

  useHardhatProject("ci-success");

  it("should succeed in a CI environment", async function () {
    await assert.isFulfilled(
      this.hre.run(
        { scope: "ignition", task: "deploy" },
        {
          modulePath: "./ignition/modules/LockModule.js",
        }
      )
    );
  });
});
