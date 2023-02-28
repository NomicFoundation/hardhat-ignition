import { Contract } from "ethers";

import { ExecutionContext } from "types/deployment";
import { ContractCall } from "types/executionGraph";
import { VertexVisitResult, VertexResultEnum } from "types/graph";

import { resolveFrom, toAddress } from "./utils";

export async function executeContractCall(
  { method, contract, args, value }: ContractCall,
  resultAccumulator: Map<number, VertexVisitResult | null>,
  { services, options }: ExecutionContext
): Promise<VertexVisitResult> {
  const resolve = resolveFrom(resultAccumulator);

  const resolvedArgs = args.map(resolve).map(toAddress);

  const { address, abi } = resolve(contract);

  let txHash: string;
  try {
    const contractInstance = new Contract(address, abi);

    const unsignedTx = await contractInstance.populateTransaction[method](
      ...resolvedArgs,
      { value }
    );

    txHash = await services.contracts.sendTx(unsignedTx, options);
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
    },
  };
}
