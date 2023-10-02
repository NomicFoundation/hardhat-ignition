import { assert } from "chai";

import { FutureType, buildModule } from "../../../src";
import { JsonRpcClient } from "../../../src/internal/execution/jsonrpc-client";
import { getNonceSyncMessages } from "../../../src/internal/execution/nonce-management/get-nonce-sync-messages";
import { deploymentStateReducer } from "../../../src/internal/execution/reducers/deployment-state-reducer";
import { DeploymentState } from "../../../src/internal/execution/types/deployment-state";
import {
  DeploymentExecutionState,
  ExecutionSateType,
  ExecutionStatus,
} from "../../../src/internal/execution/types/execution-state";
import { exampleAccounts } from "../../helpers";

describe("execution - getNonceSyncMessages", () => {
  const requiredConfirmations = 5;
  const latestBlock = 10;
  let deploymentState: DeploymentState;

  const exampleDeploymentState: DeploymentExecutionState = {
    id: "Example",
    type: ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
    futureType: FutureType.CONTRACT_DEPLOYMENT,
    strategy: "basic",
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(),
    networkInteractions: [],
    artifactId: "./artifact.json",
    contractName: "Contract1",
    value: BigInt("0"),
    constructorArgs: [],
    libraries: {},
    from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  };

  beforeEach(() => {
    deploymentState = deploymentStateReducer();
  });

  describe("first deployment run", () => {
    it("should allow if there are no pending transactions for all of the future's senders", async () => {
      const transactionCount = latestBlock + requiredConfirmations;

      const mockJsonRpcClient = setupJsonRpcClient(latestBlock, {
        [exampleAccounts[1]]: {
          pending: transactionCount,
          latest: transactionCount,
          number: () => transactionCount,
        },
        [exampleAccounts[2]]: {
          pending: transactionCount,
          latest: transactionCount,
          number: () => transactionCount,
        },
      });

      const ignitionModule = buildModule("Example", (m) => {
        m.contract("MyContract", [], { from: exampleAccounts[1] });
        m.contract("AnotherContract", [], { from: undefined });

        return {};
      });

      const result = await getNonceSyncMessages(
        mockJsonRpcClient,
        deploymentState,
        ignitionModule,
        exampleAccounts,
        exampleAccounts[2],
        requiredConfirmations
      );

      assert.deepStrictEqual(result, []);
    });

    it("should throw if there are pending transactions for a future's sender", async () => {
      const transactionCount = latestBlock + requiredConfirmations;

      const mockJsonRpcClient = setupJsonRpcClient(latestBlock, {
        [exampleAccounts[1]]: {
          pending: transactionCount + 1,
          latest: transactionCount,
          number: () => transactionCount,
        },
      });

      const ignitionModule = buildModule("Example", (m) => {
        m.contract("MyContract", [], { from: exampleAccounts[1] });

        return {};
      });

      await assert.isRejected(
        getNonceSyncMessages(
          mockJsonRpcClient,
          deploymentState,
          ignitionModule,
          exampleAccounts,
          exampleAccounts[2],
          requiredConfirmations
        ),
        `IGN403: You have sent transactions from ${exampleAccounts[1]}. Please wait until they get 5 confirmations before running Ignition again.`
      );
    });
  });

  describe("second deployment run", () => {
    it("should ignore futures that have already been started", async () => {
      const transactionCount = latestBlock + requiredConfirmations;

      // Setup an account that will fail if checked
      const mockJsonRpcClient = setupJsonRpcClient(latestBlock, {
        [exampleAccounts[1]]: {
          pending: transactionCount + 99,
          latest: transactionCount,
          number: () => transactionCount,
        },
      });

      const ignitionModule = buildModule("Example", (m) => {
        m.contract("MyContract", [], { from: exampleAccounts[1] });

        return {};
      });

      const result = await getNonceSyncMessages(
        mockJsonRpcClient,
        {
          ...deploymentState,
          executionStates: {
            "Example#MyContract": {
              ...exampleDeploymentState,
              id: "Example#MyContract",
              status: ExecutionStatus.SUCCESS,
            },
          },
        },
        ignitionModule,
        exampleAccounts,
        exampleAccounts[2],
        requiredConfirmations
      );

      assert.deepStrictEqual(result, []);
    });
  });
});

function setupJsonRpcClient(
  latestBlock: number,
  transactionCountEntries: {
    [key: string]: {
      pending: number;
      latest: number;
      number: (num: number) => number;
    };
  }
): JsonRpcClient {
  const mockJsonRpcClient = {
    getLatestBlock: () => {
      return { number: latestBlock };
    },
    getTransactionCount: (
      address: string,
      blockTag: "pending" | "latest" | number
    ) => {
      const transactionCountEntry = transactionCountEntries[address];

      if (transactionCountEntry === undefined) {
        throw new Error(
          `Mock getTransactionCount was not expecting the sender: ${address}`
        );
      }

      if (blockTag === "pending") {
        return transactionCountEntry.pending;
      } else if (blockTag === "latest") {
        return transactionCountEntry.latest;
      } else {
        return transactionCountEntry.number(blockTag);
      }
    },
  } as any;

  return mockJsonRpcClient;
}
