import { MemoryJournal } from "../../../../src/new-api/internal/journal/memory-journal";
import { BasicExecutionStrategy } from "../../../../src/new-api/internal/new-execution/basic-execution-strategy";
import { FutureProcessor } from "../../../../src/new-api/internal/new-execution/future-processor/future-processor";
import {
  Block,
  CallParams,
  EstimateGasParams,
  JsonRpcClient,
  TransactionParams,
} from "../../../../src/new-api/internal/new-execution/jsonrpc-client";
import { NonceManager } from "../../../../src/new-api/internal/new-execution/nonce-management";
import { TransactionTrackingTimer } from "../../../../src/new-api/internal/new-execution/transaction-tracking-timer";
import {
  NetworkFees,
  RawStaticCallResult,
  Transaction,
  TransactionReceipt,
} from "../../../../src/new-api/internal/new-execution/types/jsonrpc";
import { assertIgnitionInvariant } from "../../../../src/new-api/internal/utils/assertions";
import {
  exampleAccounts,
  setupMockArtifactResolver,
  setupMockDeploymentLoader,
} from "../../helpers";

export function setupFutureProcessor(
  sendTransaction: (transactionParams: TransactionParams) => Promise<string>,
  transactions: { [key: string]: TransactionReceipt }
): {
  processor: FutureProcessor;
  storedDeployedAddresses: { [key: string]: string };
} {
  const storedDeployedAddresses: { [key: string]: string } = {};

  const mockDeploymentLoader = setupMockDeploymentLoader(
    new MemoryJournal(),
    storedDeployedAddresses
  );

  const mockArtifactResolver = setupMockArtifactResolver();

  const basicExecutionStrategy = new BasicExecutionStrategy(
    mockDeploymentLoader.loadArtifact
  );

  const mockJsonRpcClient = setupMockJsonRpcClient(
    sendTransaction,
    transactions
  );

  const transactionTrackingTimer = new TransactionTrackingTimer();

  const mockNonceManager = setupMockNonceManager();

  const processor = new FutureProcessor(
    mockDeploymentLoader,
    mockArtifactResolver,
    basicExecutionStrategy,
    mockJsonRpcClient,
    transactionTrackingTimer,
    mockNonceManager,
    1, // required confirmations
    10, // millisecondBeforeBumpingFees
    100, // maxFeeBumps
    exampleAccounts,
    {}
  );

  return { processor, storedDeployedAddresses };
}

function setupMockNonceManager(): NonceManager {
  let nonceCount = 0;
  return {
    getNextNonce: async (_sender: string): Promise<number> => {
      return nonceCount++;
    },
  };
}

function setupMockJsonRpcClient(
  sendTransaction: (transactionParams: TransactionParams) => Promise<string>,
  transactions: { [key: string]: TransactionReceipt }
): JsonRpcClient {
  const client = new MockJsonRpcClient(sendTransaction, transactions);

  return client;
}

class MockJsonRpcClient implements JsonRpcClient {
  private _blockNumber = 10;

  constructor(
    private _sendTransaction: (
      transactionParams: TransactionParams
    ) => Promise<string>,
    private _transactions: { [key: string]: TransactionReceipt }
  ) {}

  public async getChainId(): Promise<number> {
    return 31337;
  }

  public async getNetworkFees(): Promise<NetworkFees> {
    return {
      gasPrice: 1000n,
    };
  }

  public async getLatestBlock(): Promise<Block> {
    const blockNumber = this._blockNumber++;

    return {
      hash: `0xblockhash-${blockNumber}`,
      number: blockNumber,
    };
  }

  public getBalance(
    _address: string,
    _blockTag: "latest" | "pending"
  ): Promise<bigint> {
    throw new Error("Method not implemented.");
  }

  public async call(
    _callParams: CallParams,
    _blockTag: "latest" | "pending"
  ): Promise<RawStaticCallResult> {
    return {
      success: true,
      customErrorReported: false,
      returnData: "0x",
    };
  }

  public async estimateGas(
    _transactionParams: EstimateGasParams
  ): Promise<bigint> {
    return 100n;
  }

  public async sendTransaction(
    transactionParams: TransactionParams
  ): Promise<string> {
    return this._sendTransaction(transactionParams);
  }

  public getTransactionCount(
    _address: string,
    _blockTag: number | "latest" | "pending"
  ): Promise<number> {
    throw new Error("Method not implemented.");
  }

  public async getTransaction(
    txHash: string
  ): Promise<Omit<Transaction, "receipt"> | undefined> {
    return {
      hash: txHash,
      fees: {
        gasPrice: 1000n,
      },
    };
  }

  public async getTransactionReceipt(
    txHash: string
  ): Promise<TransactionReceipt | undefined> {
    assertIgnitionInvariant(
      txHash in this._transactions,
      `No transaction registered in test for the hash ${txHash}`
    );

    return this._transactions[txHash];
  }
}
