import { Services } from "services/types";
import { ContractDeploy } from "types/executionGraph";
import { VertexVisitResult } from "types/graph";

import { resolveFrom, toAddress } from "./utils";

export async function executeContractDeploy(
  { artifact, args, libraries }: ContractDeploy,
  resultAccumulator: Map<number, VertexVisitResult>,
  { services }: { services: Services }
): Promise<VertexVisitResult> {
  try {
    const resolve = resolveFrom(resultAccumulator);

    const resolvedArgs = args.map(resolve).map(toAddress);

    const resolvedLibraries = Object.fromEntries(
      Object.entries(libraries ?? {}).map(([k, v]) => [
        k,
        toAddress(resolve(v)),
      ])
    );

    const txHash = await services.contracts.deploy(
      artifact,
      resolvedArgs,
      resolvedLibraries
    );

    await new Promise((resolve) => {
      setTimeout(resolve, Math.random() * (3000 - 1000) + 1000);
    });

    const receipt = await services.transactions.wait(txHash);

    return {
      _kind: "success",
      result: {
        name: artifact.contractName,
        abi: artifact.abi,
        bytecode: artifact.bytecode,
        address: receipt.contractAddress,
      },
    };
  } catch (err) {
    return {
      _kind: "failure",
      failure: err as any,
    };
  }
}
