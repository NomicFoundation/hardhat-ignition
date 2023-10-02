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
import { JournalMessageType } from "../../../src/internal/execution/types/messages";
import { NetworkInteractionType } from "../../../src/internal/execution/types/network-interaction";
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
    it("should indicate the user replaced the transaction if the transaction's nonce is less than the latest", async () => {
      const transactionCount = latestBlock + requiredConfirmations;
      const latest = transactionCount;

      // Setup an account that will fail if checked
      const mockJsonRpcClient = setupJsonRpcClient(latestBlock, {
        [exampleAccounts[1]]: {
          pending: transactionCount,
          latest,
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
              status: ExecutionStatus.STARTED,
              from: exampleAccounts[1],
              networkInteractions: [
                {
                  id: 1,
                  type: NetworkInteractionType.ONCHAIN_INTERACTION,
                  to: undefined,
                  data: "0x",
                  value: BigInt(0),
                  transactions: [],
                  shouldBeResent: false,
                  nonce: latest - 1, // the nonce is behind the latest nonce for the account
                },
              ],
            },
          },
        },
        ignitionModule,
        exampleAccounts,
        exampleAccounts[2],
        requiredConfirmations
      );

      assert.deepStrictEqual(result, [
        {
          futureId: "Example#MyContract",
          networkInteractionId: 1,
          type: JournalMessageType.ONCHAIN_INTERACTION_REPLACED_BY_USER,
        },
      ]);
    });

    it("should error if the user has sent a non-ignition pending transaction that has not confirmed on the account", async () => {
      const transactionCount = latestBlock + requiredConfirmations;
      const latest = transactionCount;
      const pending = latest + 1; //

      // Setup an account that will fail if checked
      const mockJsonRpcClient = setupJsonRpcClient(latestBlock, {
        [exampleAccounts[1]]: {
          pending,
          latest,
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
          {
            ...deploymentState,
            executionStates: {
              "Example#MyContract": {
                ...exampleDeploymentState,
                id: "Example#MyContract",
                status: ExecutionStatus.STARTED,
                from: exampleAccounts[1],
                networkInteractions: [
                  {
                    id: 1,
                    type: NetworkInteractionType.ONCHAIN_INTERACTION,
                    to: undefined,
                    data: "0x",
                    value: BigInt(0),
                    transactions: [],
                    shouldBeResent: false,
                    nonce: latest, // the nonce is the latest
                  },
                ],
              },
            },
          },
          ignitionModule,
          exampleAccounts,
          exampleAccounts[2],
          requiredConfirmations
        ),
        `IGN404: You have sent transactions from ${exampleAccounts[1]} with nonce 15. Please wait until they get 5 confirmations before running Ignition again.`
      );
    });

    it("should indicate the transaction was dropped if the nonce is higher than the latest", async () => {
      const transactionCount = latestBlock + requiredConfirmations;
      const latest = transactionCount;

      // Setup an account that will fail if checked
      const mockJsonRpcClient = setupJsonRpcClient(latestBlock, {
        [exampleAccounts[1]]: {
          pending: latest,
          latest,
          number: () => latest,
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
              status: ExecutionStatus.STARTED,
              from: exampleAccounts[1],
              networkInteractions: [
                {
                  id: 1,
                  type: NetworkInteractionType.ONCHAIN_INTERACTION,
                  to: undefined,
                  data: "0x",
                  value: BigInt(0),
                  transactions: [],
                  shouldBeResent: false,
                  // the nonce is ahead of latest,
                  // so must have been dropped
                  nonce: latest + 1,
                },
              ],
            },
          },
        },
        ignitionModule,
        exampleAccounts,
        exampleAccounts[2],
        requiredConfirmations
      );

      assert.deepStrictEqual(result, [
        {
          futureId: "Example#MyContract",
          networkInteractionId: 1,
          type: JournalMessageType.ONCHAIN_INTERACTION_DROPPED,
        },
      ]);
    });

    it("should ignore futures that have already been completed", async () => {
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
