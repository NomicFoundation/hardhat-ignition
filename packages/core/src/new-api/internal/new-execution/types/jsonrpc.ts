/**
 * The result of a static call, as returned by eth_call.
 */
export interface RawStaticCallResult {
  /**
   * The data returned by the call.
   */
  returnData: string;

  /**
   * A boolean indicating whether the call was successful or not.
   */
  success: boolean;

  /**
   * A boolean indicating whether the JSON-RPC server that run the
   * call reported that the call failed due to a custom error.
   */
  customErrorReported: boolean;
}

/**
 * The relevant subset of a transaction log, as returned by eth_getTransactionReceipt.
 */
export interface TransactionLog {
  address: string;
  logIndex: string;
  data: string;
  topics: string[];
}

/**
 * The status of a transaction, as represented in its receipt.
 */
export enum TransactionReceiptStatus {
  FAILURE = 0,
  SUCCESS = 1,
}

/**
 * The relevant subset of the receipt, as returned by eth_getTransactionReceipt.
 */
export interface TransactionReceipt {
  contractAddress: string | null;
  status: TransactionReceiptStatus;
  logs: TransactionLog[];
}

/**
 * This interface represents a transaction that was sent to the network.
 */
export interface Transaction {
  hash: string;

  // We store this data in case we need to bump the transaction fees.
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;

  // Only available after the transaction has confirmed, with enough confirmations.
  receipt?: TransactionReceipt;
}