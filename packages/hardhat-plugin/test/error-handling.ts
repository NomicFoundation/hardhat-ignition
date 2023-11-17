/* eslint-disable import/no-unused-modules */
import { buildModule } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "./use-ignition-project";

describe("module error handling", () => {
  useEphemeralIgnitionProject("minimal");

  it("should error on passing async callback", async function () {
    assert.throws(
      () => buildModule("AsyncModule", (async () => {}) as any),
      /The callback passed to 'buildModule' for AsyncModule returns a Promise; async callbacks are not allowed in 'buildModule'./
    );
  });

  it("should error on module throwing an exception", async function () {
    assert.throws(
      () =>
        buildModule("AsyncModule", () => {
          throw new Error("User thrown error");
        }),
      /User thrown error/
    );
  });

  it("should error on attempting to use a nonexistent IgnitionHelper", function () {
    assert.throws(
      () => (this.hre as any).ignition.deploy(),
      /Please install either `@nomicfoundation\/hardhat-ignition-viem` or `@nomicfoundation\/hardhat-ignition-ethers` to use Ignition in your Hardhat tests/
    );
  });
});
