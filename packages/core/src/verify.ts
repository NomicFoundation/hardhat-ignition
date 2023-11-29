import { IgnitionError } from "./errors";
import { ERRORS } from "./errors-list";
import { builtinChains } from "./internal/chain-config";
import { FileDeploymentLoader } from "./internal/deployment-loader/file-deployment-loader";
import { encodeDeploymentArguments } from "./internal/execution/abi";
import { loadDeploymentState } from "./internal/execution/deployment-state-helpers";
import { assertIgnitionInvariant } from "./internal/utils/assertions";
import { findDeployedContracts } from "./internal/views/find-deployed-contracts";
import { ChainConfig, VerifyResult } from "./types/verify";

/**
 * Retrieve the information required to verify all contracts from a deployment on Etherscan.
 *
 * @param deploymentDir - the file directory of the deployment
 *
 * @beta
 */
export async function* verify(
  deploymentDir: string,
  customChains: ChainConfig[] = []
): AsyncGenerator<VerifyResult> {
  const deploymentLoader = new FileDeploymentLoader(deploymentDir);

  const deploymentState = await loadDeploymentState(deploymentLoader);

  if (deploymentState === undefined) {
    throw new IgnitionError(ERRORS.VERIFY.UNINITIALIZED_DEPLOYMENT, {
      deploymentDir,
    });
  }

  const contracts = Object.entries(findDeployedContracts(deploymentState));

  if (contracts.length === 0) {
    throw new IgnitionError(ERRORS.VERIFY.NO_CONTRACTS_DEPLOYED, {
      deploymentDir,
    });
  }

  // implementation note:
  // if a user has set a custom chain with the same chainId as a builtin chain,
  // the custom chain will be used instead of the builtin chain
  const chainConfig = [...customChains, ...builtinChains].find(
    (c) => c.chainId === deploymentState.chainId
  );

  if (chainConfig === undefined) {
    throw new IgnitionError(ERRORS.VERIFY.UNSUPPORTED_CHAIN, {
      chainId: deploymentState.chainId,
    });
  }

  for (const [futureId, contract] of contracts) {
    const exState = deploymentState.executionStates[futureId];
    const [buildInfo, artifact] = await Promise.all([
      deploymentLoader.readBuildInfo(futureId),
      deploymentLoader.loadArtifact(futureId),
    ]);

    assertIgnitionInvariant(
      exState.type === "DEPLOYMENT_EXECUTION_STATE",
      "execution state is not a deployment"
    );

    const { contractName, constructorArgs } = exState;

    const verifyResult: VerifyResult = [
      chainConfig,
      {
        address: contract.address,
        compilerVersion: buildInfo.solcLongVersion.startsWith("v")
          ? buildInfo.solcLongVersion
          : `v${buildInfo.solcLongVersion}`,
        sourceCode: JSON.stringify(buildInfo.input),
        name: `${artifact.sourceName}:${contractName}`,
        args: encodeDeploymentArguments(artifact, constructorArgs),
      },
    ];

    yield verifyResult;
  }
}
