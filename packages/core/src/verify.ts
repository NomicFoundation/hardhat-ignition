import { IgnitionError } from "./errors";
import { ERRORS } from "./errors-list";
import { builtinChains } from "./internal/chain-config";
import { FileDeploymentLoader } from "./internal/deployment-loader/file-deployment-loader";
import { encodeDeploymentArguments } from "./internal/execution/abi";
import { loadDeploymentState } from "./internal/execution/deployment-state-helpers";
import { assertIgnitionInvariant } from "./internal/utils/assertions";
import { findDeployedContracts } from "./internal/views/find-deployed-contracts";
import { VerifyResult } from "./types/verify";

/**
 * Retrieve the information required to verify all contracts from a deployment on Etherscan.
 *
 * @param deploymentDir - the file directory of the deployment
 *
 * @beta
 */
export async function* verify(
  deploymentDir: string
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

  const chainConfig = builtinChains.find(
    (c) => c.chainId === deploymentState.chainId
  );

  // this case is a failure on our part
  // if it fails, it means we need to update the builtinChains list with the newly supported chain info
  assertIgnitionInvariant(
    chainConfig !== undefined,
    `Verification not yet supported for chainId ${deploymentState.chainId}`
  );

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
