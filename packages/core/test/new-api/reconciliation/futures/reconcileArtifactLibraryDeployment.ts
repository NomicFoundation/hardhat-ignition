/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { Artifact } from "../../../../src";
import { buildModule } from "../../../../src/new-api/build-module";
import {
  DeploymentExecutionState,
  ExecutionStatus,
} from "../../../../src/new-api/internal/execution/types";
import { FutureType } from "../../../../src/new-api/types/module";
import { exampleAccounts, initOnchainState } from "../../helpers";
import {
  assertSuccessReconciliation,
  oneAddress,
  reconcile,
  twoAddress,
} from "../helpers";

describe("Reconciliation - artifact library", () => {
  const fakeArtifact: Artifact = {
    abi: [],
    contractName: "",
    bytecode: "",
    linkReferences: {},
  };

  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

  const exampleDeploymentState: DeploymentExecutionState = {
    id: "Example",
    futureType: FutureType.NAMED_CONTRACT_DEPLOYMENT,
    strategy: "basic",
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(),
    networkInteractions: [],
    history: [],
    onchain: initOnchainState,
    artifactFutureId: "./artifact.json",
    contractName: "Contract1",
    value: BigInt("0"),
    constructorArgs: [],
    libraries: {},
    from: exampleAccounts[0],
  };

  it("should reconcile unchanged", () => {
    const submoduleDefinition = buildModule("Submodule", (m) => {
      const safeMath = m.library("SafeMath");

      const mainLib = m.libraryFromArtifact("MainLibrary", fakeArtifact, {
        libraries: { SafeMath: safeMath },
      });

      return { safeMath, mainLib };
    });

    const moduleDefinition = buildModule("Module", (m) => {
      const { mainLib } = m.useModule(submoduleDefinition);

      return { mainLib };
    });

    assertSuccessReconciliation(moduleDefinition, {
      "Submodule:SafeMath": {
        ...exampleDeploymentState,
        futureType: FutureType.NAMED_LIBRARY_DEPLOYMENT,
        status: ExecutionStatus.SUCCESS,
        contractName: "SafeMath",
        contractAddress: exampleAddress,
      },
      "Submodule:MainLibrary": {
        ...exampleDeploymentState,
        futureType: FutureType.ARTIFACT_LIBRARY_DEPLOYMENT,
        status: ExecutionStatus.STARTED,
        contractName: "MainLibrary",
        libraries: {
          SafeMath: exampleAddress,
        },
      },
    });
  });

  it("should find changes to contract name unreconciliable", () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const library1 = m.libraryFromArtifact("LibraryChanged", fakeArtifact, {
        id: "Example",
      });

      return { contract1: library1 };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:Example": {
        ...exampleDeploymentState,
        futureType: FutureType.ARTIFACT_LIBRARY_DEPLOYMENT,
        status: ExecutionStatus.STARTED,
        contractName: "LibraryUnchanged",
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:Example",
        failure:
          "Library name has been changed from LibraryUnchanged to LibraryChanged",
      },
    ]);
  });

  it("should find changes to libraries unreconciliable", () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const safeMath = m.library("SafeMath");

      const mainLib = m.libraryFromArtifact("MainLibrary", fakeArtifact, {
        libraries: { Changed: safeMath },
      });

      return { safeMath, mainLib };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:SafeMath": {
        ...exampleDeploymentState,
        futureType: FutureType.NAMED_LIBRARY_DEPLOYMENT,
        status: ExecutionStatus.SUCCESS,
        contractName: "SafeMath",
        contractAddress: exampleAddress,
      },
      "Module:MainLibrary": {
        ...exampleDeploymentState,
        futureType: FutureType.ARTIFACT_LIBRARY_DEPLOYMENT,
        status: ExecutionStatus.HOLD,
        contractName: "MainLibrary",
        libraries: {
          Unchanged: exampleAddress,
        },
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:MainLibrary",
        failure: "Libraries have been changed",
      },
    ]);
  });

  it("should find changes to contract name unreconciliable", () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const library1 = m.libraryFromArtifact("Library1", fakeArtifact, {
        id: "Example",
        from: twoAddress,
      });

      return { contract1: library1 };
    });

    const reconiliationResult = reconcile(moduleDefinition, {
      "Module:Example": {
        ...exampleDeploymentState,
        futureType: FutureType.ARTIFACT_LIBRARY_DEPLOYMENT,
        status: ExecutionStatus.STARTED,
        contractName: "Library1",
        from: oneAddress,
      },
    });

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:Example",
        failure: `From account has been changed from ${oneAddress} to ${twoAddress}`,
      },
    ]);
  });
});
