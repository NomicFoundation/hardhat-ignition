import { assert } from "chai";

import { ModuleConstructor } from "../../src";
import { defineModule } from "../../src/new-api/define-module";
import { validate } from "../../src/new-api/internal/validation/validate";

describe("Validation", () => {
  const moduleConstructor = new ModuleConstructor();

  it("should throw when given an unknown future type", async () => {
    const moduleDefinition = defineModule("Test", () => ({}));
    const module = moduleConstructor.construct(moduleDefinition);
    module.futures.add({ type: "fake" } as any);

    await assert.isRejected(validate(module, {} as any), /Unknown future type/);
  });
});
