import type { ExecutionContext } from "../../types/deployment";
import type {
  ContractCall,
  ExecutionVertexVisitResult,
} from "../../types/executionGraph";

import { Contract } from "ethers";

import { resolveFrom, toAddress } from "./utils";

export async function executeContractCall(
  { method, contract, args, value, signer }: ContractCall,
  resultAccumulator: Map<number, ExecutionVertexVisitResult | undefined>,
  { services, options }: ExecutionContext
): Promise<ExecutionVertexVisitResult> {
  const resolve = resolveFrom(resultAccumulator);

  const resolvedArgs = args.map(resolve).map(toAddress);

  const { address, abi } = resolve(contract);

  let txHash: string;
  try {
    const contractInstance = new Contract(address, abi, signer);

    const unsignedTx = await contractInstance.populateTransaction[method](
      ...resolvedArgs,
      { value, from: await signer.getAddress() }
    );

    txHash = await services.contracts.sendTx(unsignedTx, {
      ...options,
      signer,
    });
  } catch (err) {
    return {
      _kind: "failure",
      failure: err as any,
    };
  }

  try {
    await services.transactions.wait(txHash);
  } catch {
    return {
      _kind: "hold",
    };
  }

  return {
    _kind: "success",
    result: {
      hash: txHash,
    },
  };
}
