import { EIP1193Provider } from "../../types/provider";
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
      decode,
    }: {
      chainDispatcher: ChainDispatcher;
      decode: (response: any) => Promise<any>;
    }
  ) => any;
} = {
  REQUEST: requestNetworkInteraction,
};

async function requestNetworkInteraction(
  networkInteraction: NetworkInteraction,
  {
    chainDispatcher,
    decode,
  }: {
    chainDispatcher: ChainDispatcher;
    decode: (response: any) => Promise<any>;
  }
) {
  // TODO: geth will return the error as data, hh network will throw an error

  console.log("------------------> running simulation");

  // run simulation
  const simulateResult = await simulateTransaction({
    networkInteraction,
    provider: chainDispatcher.provider,
  });

  // console.log("simulateResult", simulateResult);

  const gasEstimate = await estimateGasForTransaction({
    networkInteraction,
    provider: chainDispatcher.provider,
  });

  console.log("gasEstimate", gasEstimate);

  const result = await sendTransaction({
    networkInteraction,
    provider: chainDispatcher.provider,
    gasEstimate,
  });

  console.log("result", result);

  // let iface = new ethers.utils.Interface(abi);

  // console.log("iface", iface);

  // estimate gas
  // send tx
}

async function simulateTransaction({
  networkInteraction,
  provider,
}: {
  networkInteraction: NetworkInteraction;
  provider: EIP1193Provider;
}): Promise<string> {
  try {
    return provider.request({
      method: "eth_call",
      params: [
        { to: networkInteraction.to, data: networkInteraction.data },
        "pending",
      ],
    }) as Promise<string>;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "data" in error &&
      typeof error.data === "object" &&
      error.data !== null &&
      "data" in error.data &&
      typeof error.data.data === "string"
    ) {
      return error.data.data;
    }

    throw error;
  }
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
    data: networkInteraction.data,
    gas: gasEstimate.toString(),
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
