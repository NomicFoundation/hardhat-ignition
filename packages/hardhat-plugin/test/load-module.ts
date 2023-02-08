/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { loadModule } from "../src/load-module";

import { useEnvironment } from "./useEnvironment";

describe("loadModule", function () {
  useEnvironment("user-modules");

  it("should return a user module from a given path", () => {
    const module = loadModule("ignition", "TestModule.js");

    assert.isDefined(module);
  });

  it("should return modules for names with file extension", () => {
    const module = loadModule("ignition", "TestModule.js");

    assert.isDefined(module);
    assert.equal(module.name, "testing123");
  });

  it("should throw if given a file that does not exist", () => {
    assert.throws(() => loadModule("ignition", "Fake.js"));
  });

  it("should throw if given a user module directory that does not exist", async () => {
    assert.throws(
      () => loadModule("/fake", "AFile.js"),
      `Directory /fake not found.`
    );
  });
});
