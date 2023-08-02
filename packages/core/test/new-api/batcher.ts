/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "../../src/new-api/build-module";
import { Batcher } from "../../src/new-api/internal/batcher";
import { ModuleConstructor } from "../../src/new-api/internal/module-builder";
import {
  DeploymentExecutionState,
  ExecutionStateMap,
  ExecutionStatus,
} from "../../src/new-api/internal/types/execution-state";
import {
  FutureType,
  IgnitionModuleResult,
} from "../../src/new-api/types/module";
import { IgnitionModuleDefinition } from "../../src/new-api/types/module-builder";

import { initOnchainState } from "./helpers";

describe("batcher", () => {
  const exampleDeploymentState: DeploymentExecutionState = {
    id: "Example",
    futureType: FutureType.NAMED_CONTRACT_DEPLOYMENT,
    strategy: "basic",
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(),
    history: [],
    onchain: initOnchainState,
    artifactFutureId: "./artifact.json",
    contractName: "Contract1",
    value: BigInt("0"),
    constructorArgs: [],
    libraries: {},
    from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  };

  it("should batch a contract deploy module", () => {
    const moduleDefinition = buildModule("Module1", (m) => {
      const contract1 = m.contract("Contract1");

      return { contract1 };
    });

    assertBatching({ moduleDefinition }, [["Module1:Contract1"]]);
  });

  it("should batch through dependencies", () => {
    const moduleDefinition = buildModule("Module1", (m) => {
      const contract1 = m.contract("Contract1");
      const contract2 = m.contract("Contract2");

      const contract3 = m.contract("Contract3", [contract1, contract2]);

      const contract4 = m.contract("Contract4", [], {
        after: [contract3],
      });

      const contract5 = m.contract("Contract5", [], {
        after: [contract3],
      });

      return { contract1, contract2, contract3, contract4, contract5 };
    });

    assertBatching({ moduleDefinition }, [
      ["Module1:Contract1", "Module1:Contract2"],
      ["Module1:Contract3"],
      ["Module1:Contract4", "Module1:Contract5"],
    ]);
  });

  it("should batch submodules such that everything in a submodule is executed if just one future in the submodule is depended on", () => {
    const submoduleLeft = buildModule("SubmoduleLeft", (m) => {
      const contract1 = m.contract("Contract1");
      m.call(contract1, "configure");

      return { contract1 };
    });

    const submoduleRight = buildModule("SubmoduleRight", (m) => {
      const contract2 = m.contract("Contract2");
      m.call(contract2, "configure");

      return { contract2 };
    });

    const submoduleMiddle = buildModule("SubmoduleMiddle", (m) => {
      const { contract1 } = m.useModule(submoduleLeft);
      const { contract2 } = m.useModule(submoduleRight);

      const contract3 = m.contract("Contract3", [contract1, contract2]);
      m.call(contract3, "configure");

      return { contract3 };
    });

    const moduleDefinition = buildModule("Module", (m) => {
      const { contract3 } = m.useModule(submoduleMiddle);

      const contract4 = m.contract("Contract4", [contract3]);
      m.call(contract4, "configure");

      return { contract4 };
    });

    assertBatching({ moduleDefinition }, [
      ["SubmoduleLeft:Contract1", "SubmoduleRight:Contract2"],
      [
        "SubmoduleLeft:Contract1#configure",
        "SubmoduleRight:Contract2#configure",
      ],
      ["SubmoduleMiddle:Contract3"],
      ["SubmoduleMiddle:Contract3#configure"],
      ["Module:Contract4"],
      ["Module:Contract4#configure"],
    ]);
  });

  it("should deploy submodules even when no direct connection", () => {
    const submoduleLeft = buildModule("Left", (m) => {
      const contract1 = m.contract("Contract1");

      return { contract1 };
    });

    const submoduleRight = buildModule("Right", (m) => {
      const contract2 = m.contract("Contract2");

      return { contract2 };
    });

    const submoduleMiddle = buildModule("Middle", (m) => {
      m.useModule(submoduleLeft);
      m.useModule(submoduleRight);

      const contract3 = m.contract("Contract3", []);

      return { contract3 };
    });

    const moduleDefinition = buildModule("Module", (m) => {
      const { contract3 } = m.useModule(submoduleMiddle);

      const contract4 = m.contract("Contract4", [contract3]);

      return { contract4 };
    });

    assertBatching({ moduleDefinition }, [
      ["Left:Contract1", "Middle:Contract3", "Right:Contract2"],
      ["Module:Contract4"],
    ]);
  });

  it("should bypass intermediary successful nodes", () => {
    const moduleDefinition = buildModule("Module1", (m) => {
      const contract1 = m.contract("Contract1");
      const contract2 = m.contract("Contract2", [contract1]);

      const contract3 = m.contract("Contract3", [contract2]);

      return { contract1, contract2, contract3 };
    });

    assertBatching(
      {
        moduleDefinition,
        executionStates: {
          "Module1:Contract2": {
            ...exampleDeploymentState,
            id: "Module1:Contract2",
            status: ExecutionStatus.SUCCESS,
          },
        },
      },
      [["Module1:Contract1"], ["Module1:Contract3"]]
    );
  });
});

function assertBatching(
  {
    moduleDefinition,
    executionStates = {},
  }: {
    moduleDefinition: IgnitionModuleDefinition<
      string,
      string,
      IgnitionModuleResult<string>
    >;
    executionStates?: ExecutionStateMap;
  },
  expectedBatches: string[][]
) {
  const constructor = new ModuleConstructor();
  const module = constructor.construct(moduleDefinition);

  assert.isDefined(module);

  const actualBatches = Batcher.batch(module, executionStates);

  assert.deepStrictEqual(actualBatches, expectedBatches);
}
