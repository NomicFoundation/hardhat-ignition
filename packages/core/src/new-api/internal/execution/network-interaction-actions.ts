import { IgnitionError } from "../../../errors";
import { EIP1193Provider } from "../../types/provider";
import { CallErrorResult, call } from "./call-result-decoding/call";
import { ExecutionError } from "./call-result-decoding/result-decoding";
import { NetworkInteractionAction } from "./determineNextActionFor";
import { NetworkInteraction } from "./transaction-types";
import { ChainDispatcher } from "./types";

import {
  JsonRpcTransactionRequest,
  TransactionRequest,
  accessListify,
  getBigInt,
  hexlify,
  toQuantity,
} from "ethers";

export const networkInteractionActions: {
  [key in NetworkInteractionAction]: (
    networkInteraction: NetworkInteraction,
    {
      chainDispatcher,
      decodeError,
    }: {
      chainDispatcher: ChainDispatcher;
      decodeError: (
        callErrorResult: CallErrorResult
      ) => Promise<ExecutionError>;
    }
  ) => any;
} = {
  REQUEST: requestNetworkInteraction,
};

async function requestNetworkInteraction(
  networkInteraction: NetworkInteraction,
  {
    chainDispatcher,
    decodeError,
  }: {
    chainDispatcher: ChainDispatcher;
    decodeError: (callErrorResult: CallErrorResult) => Promise<ExecutionError>;
  }
) {
  // run simulation
  try {
    console.log("Starting simulate ---------------------->");
    const simulateResult = await simulateTransaction({
      networkInteraction,
      provider: chainDispatcher.provider,
      decodeError,
    });

    console.log("simulateResult", simulateResult);

    if (simulateResult !== undefined) {
      throw new IgnitionError(`Simulation failed: ${simulateResult.type}`);
    }

    const gasEstimate = await estimateGasForTransaction({
      networkInteraction,
      provider: chainDispatcher.provider,
    });

    console.log("gasEstimate", gasEstimate);

    const hash = await sendTransaction({
      networkInteraction,
      provider: chainDispatcher.provider,
      gasEstimate,
    });

    console.log("hash", hash);

    const txPolled = await chainDispatcher.getTransactionReceipt(
      hash as string
    );

    console.log("txPolled", txPolled);

    // let iface = new ethers.utils.Interface(abi);

    // console.log("iface", iface);

    // estimate gas
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
  // send tx
}

/**
 * Simulate transaction with a high gas to determine if it would  throw.
 * @param params.networkInteraction The network interaction to simulate
 * @param params.provider the provider to use to simulate the transaction
 * @returns either an ExecutionError on revert or undefined if the simulation succeeds
 */
async function simulateTransaction({
  networkInteraction,
  provider,
  decodeError,
}: {
  networkInteraction: NetworkInteraction;
  provider: EIP1193Provider;
  decodeError: (callErrorResult: CallErrorResult) => Promise<ExecutionError>;
}): Promise<ExecutionError | undefined> {
  const result = await call(
    provider,
    { to: networkInteraction.to, data: networkInteraction.data },
    "pending"
  );

  if (typeof result === "string") {
    return undefined;
  }

  const decoded = await decodeError(result);

  return decoded;
}

async function estimateGasForTransaction({
  networkInteraction,
  provider,
}: {
  networkInteraction: NetworkInteraction;
  provider: EIP1193Provider;
}): Promise<bigint> {
  const result = await provider.request({
    method: "eth_estimateGas",
    params: [
      { to: networkInteraction.to, data: networkInteraction.data },
      "pending",
    ],
  });

  return BigInt(result as string);
}

async function sendTransaction({
  networkInteraction,
  provider,
  gasEstimate,
}: {
  networkInteraction: NetworkInteraction;
  provider: EIP1193Provider;
  gasEstimate: bigint;
}) {
  const tx = {
    to: networkInteraction.to,
    from: networkInteraction.from,
    data: networkInteraction.data,
    gasLimit: gasEstimate.toString(),
    value: networkInteraction.value.toString(),
  };

  const result = await provider.request({
    method: "eth_sendTransaction",
    params: [getRpcTransaction(tx)],
  });

  return result;
}

export function getRpcTransaction(
  tx: TransactionRequest
): JsonRpcTransactionRequest {
  const result: JsonRpcTransactionRequest = {};

  // JSON-RPC now requires numeric values to be "quantity" values
  [
    "chainId",
    "gasLimit",
    "gasPrice",
    "type",
    "maxFeePerGas",
    "maxPriorityFeePerGas",
    "nonce",
    "value",
  ].forEach((key) => {
    if ((tx as any)[key] === null || (tx as any)[key] === undefined) {
      return;
    }
    let dstKey = key;
    if (key === "gasLimit") {
      dstKey = "gas";
    }
    (result as any)[dstKey] = toQuantity(
      getBigInt((tx as any)[key], `tx.${key}`)
    );
  });

  // Make sure addresses and data are lowercase
  ["from", "to", "data"].forEach((key) => {
    if ((tx as any)[key] === null || (tx as any)[key] === undefined) {
      return;
    }
    (result as any)[key] = hexlify((tx as any)[key]);
  });

  // Normalize the access list object
  if (tx.accessList !== null && tx.accessList !== undefined) {
    result.accessList = accessListify(tx.accessList);
  }

  return result;
}
