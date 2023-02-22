import type { PopulatedTransaction } from "ethers";

import { ExecutionContext } from "types/deployment";
import { SentETH } from "types/executionGraph";
import { VertexVisitResult, VertexResultEnum } from "types/graph";

import { resolveFrom, toAddress } from "./utils";

export async function executeSendETH(
  { address, value }: SentETH,
  resultAccumulator: Map<number, VertexVisitResult | null>,
  { services, options }: ExecutionContext
): Promise<VertexVisitResult> {
  const resolve = resolveFrom(resultAccumulator);

  const to = toAddress(resolve(address));

  let txHash: string;
  try {
    const tx: PopulatedTransaction = { to, value };

    txHash = await services.contracts.sendTx(tx, options);
  } catch (err) {
    return {
      _kind: VertexResultEnum.FAILURE,
      failure: err as any,
    };
  }

  try {
    await services.transactions.wait(txHash);
  } catch {
    return {
      _kind: VertexResultEnum.HOLD,
    };
  }

  return {
    _kind: VertexResultEnum.SUCCESS,
    result: {
      hash: txHash,
      value,
    },
  };
}
