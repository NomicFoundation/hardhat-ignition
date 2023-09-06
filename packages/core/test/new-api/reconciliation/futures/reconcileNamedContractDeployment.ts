/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "../../../../src/build-module";
import { ExecutionResultType } from "../../../../src/internal/execution/types/execution-result";
import {
  DeploymentExecutionState,
  ExecutionSateType,
  ExecutionStatus,
} from "../../../../src/internal/execution/types/execution-state";
import { FutureType } from "../../../../src/types/module";
import { exampleAccounts } from "../../helpers";
import {
  assertSuccessReconciliation,
  createDeploymentState,
  oneAddress,
  reconcile,
  twoAddress,
} from "../helpers";

describe("Reconciliation - named contract", () => {
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";

  const exampleDeploymentState: DeploymentExecutionState = {
    id: "Example",
    type: ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
    futureType: FutureType.NAMED_CONTRACT_DEPLOYMENT,
    strategy: "basic",
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(),
    networkInteractions: [],
    artifactId: "./artifact.json",
    contractName: "Contract1",
    value: BigInt("0"),
    constructorArgs: [],
    libraries: {},
    from: exampleAccounts[0],
  };

  it("should reconcile unchanged", async () => {
    const submoduleDefinition = buildModule("Submodule", (m) => {
      const owner = m.getAccount(3);
      const supply = m.getParameter("supply", BigInt(500));
      const ticker = m.getParameter("ticker", "CodeCoin");

      const safeMath = m.library("SafeMath");

      const contract1 = m.contract(
        "Contract1",
        [owner, { nested: { supply } }, [1, ticker, 3], safeMath],
        {
          libraries: {
            SafeMath: safeMath,
          },
        }
      );

      return { contract1 };
    });

    const moduleDefinition = buildModule("Module", (m) => {
      const { contract1 } = m.useModule(submoduleDefinition);

      return { contract1 };
    });

    await assertSuccessReconciliation(
      moduleDefinition,
      createDeploymentState(
        {
          ...exampleDeploymentState,
          id: "Submodule:SafeMath",
          futureType: FutureType.NAMED_LIBRARY_DEPLOYMENT,
          status: ExecutionStatus.SUCCESS,
          contractName: "SafeMath",
          result: {
            type: ExecutionResultType.SUCCESS,
            address: exampleAddress,
          },
        },
        {
          ...exampleDeploymentState,
          id: "Submodule:Contract1",
          status: ExecutionStatus.STARTED,
          constructorArgs: [
            "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
            { nested: { supply: BigInt(500) } },
            [1, "CodeCoin", 3],
            exampleAddress,
          ],
          libraries: {
            SafeMath: exampleAddress,
          },
        }
      )
    );
  });

  it("should find changes to contract name unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract1 = m.contract("ContractChanged", [], {
        id: "Example",
      });

      return { contract1 };
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState({
        ...exampleDeploymentState,
        id: "Module:Example",
        status: ExecutionStatus.STARTED,
        contractName: "ContractUnchanged",
      })
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:Example",
        failure:
          "Contract name has been changed from ContractUnchanged to ContractChanged",
      },
    ]);
  });

  it("should find changes to constructor args unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const owner = m.getAccount(3);
      const supply = m.getParameter("supply", BigInt(500));
      const ticker = m.getParameter("ticker", "CodeCoin");

      const contract1 = m.contract(
        "ContractChanged",
        [owner, { nested: { supply } }, [1, ticker, 3]],
        {
          id: "Example",
        }
      );

      return { contract1 };
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState({
        ...exampleDeploymentState,
        id: "Module:Example",
        status: ExecutionStatus.STARTED,
        contractName: "ContractUnchanged",
        constructorArgs: [1, 2, 3],
      })
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:Example",
        failure:
          "Contract name has been changed from ContractUnchanged to ContractChanged",
      },
    ]);
  });

  it("should find changes to libraries unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const safeMath = m.library("SafeMath");

      const contract1 = m.contract("Contract1", [], {
        libraries: {
          SafeMath: safeMath,
        },
      });

      return { contract1 };
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState(
        {
          ...exampleDeploymentState,
          id: "Module:SafeMath",
          futureType: FutureType.NAMED_LIBRARY_DEPLOYMENT,
          status: ExecutionStatus.SUCCESS,
          contractName: "SafeMath",
          result: {
            type: ExecutionResultType.SUCCESS,
            address: exampleAddress,
          },
        },
        {
          ...exampleDeploymentState,
          id: "Module:Contract1",
          status: ExecutionStatus.STARTED,
          libraries: {},
        }
      )
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:Contract1",
        failure: "Library SafeMath has been added",
      },
    ]);
  });

  it("should find changes to value unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract1 = m.contract("Contract", [], {
        id: "Example",
        value: BigInt(3),
      });

      return { contract1 };
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState({
        ...exampleDeploymentState,
        id: "Module:Example",
        status: ExecutionStatus.STARTED,
        contractName: "Contract",
        value: BigInt(2),
      })
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:Example",
        failure: "Value has been changed from 2 to 3",
      },
    ]);
  });

  it("should find changes to from unreconciliable", async () => {
    const moduleDefinition = buildModule("Module", (m) => {
      const contract1 = m.contract("Contract", [], {
        id: "Example",
        from: twoAddress,
      });

      return { contract1 };
    });

    const reconiliationResult = await reconcile(
      moduleDefinition,
      createDeploymentState({
        ...exampleDeploymentState,
        id: "Module:Example",
        status: ExecutionStatus.STARTED,
        contractName: "Contract",
        from: oneAddress,
      })
    );

    assert.deepStrictEqual(reconiliationResult.reconciliationFailures, [
      {
        futureId: "Module:Example",
        failure: `From account has been changed from ${oneAddress} to ${twoAddress}`,
      },
    ]);
  });
});
