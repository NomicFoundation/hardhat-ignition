/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project";

// This test exists to ensure Ignition succeeds in a CI environment.
// This is a test that the UI runs even in constrained terminal environments.
// It should always pass locally.
describe("Running deployment in CI environment", function () {
  this.timeout(60000);

  useEphemeralIgnitionProject("minimal");

  it("should succeed with UI in a CI environment", async function () {
    await assert.isFulfilled(
      this.hre.run(
        { scope: "ignition", task: "deploy" },
        {
          modulePath: "./ignition/modules/MyModule.js",
        }
      )
    );
  });
});
