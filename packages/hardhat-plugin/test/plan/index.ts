/* eslint-disable import/no-unused-modules */
import { assert } from "chai";
import fs from "fs-extra";
import path from "path";

import { useEnvironment } from "../useEnvironment";

describe("plan", () => {
  useEnvironment("minimal");

  it("should create a plan", async function () {
    const planPath = path.resolve("../minimal/cache/plan");
    fs.emptyDirSync(planPath);

    await this.hre.run("compile", { quiet: true });
    await this.hre.run("plan", {
      quiet: true,
      userModulesPaths: ["MyRecipe.js"],
    });

    const files = await fs.readdir(planPath);

    assert(files.includes("index.html"));
  });
});
