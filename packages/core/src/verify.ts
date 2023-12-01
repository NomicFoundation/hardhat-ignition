import { IgnitionError } from "./errors";
import { ERRORS } from "./errors-list";
import { builtinChains } from "./internal/chain-config";
import { FileDeploymentLoader } from "./internal/deployment-loader/file-deployment-loader";
import { encodeDeploymentArguments } from "./internal/execution/abi";
import { loadDeploymentState } from "./internal/execution/deployment-state-helpers";
import {
  DeploymentExecutionState,
  ExecutionSateType,
} from "./internal/execution/types/execution-state";
import { assertIgnitionInvariant } from "./internal/utils/assertions";
import { findDeployedContracts } from "./internal/views/find-deployed-contracts";
import { Artifact, BuildInfo } from "./types/artifact";
import { DeployedContract } from "./types/deploy";
import {
  ChainConfig,
  SourceToLibraryToAddress,
  VerifyResult,
} from "./types/verify";

/**
 * Retrieve the information required to verify all contracts from a deployment on Etherscan.
 *
 * @param deploymentDir - the file directory of the deployment
 * @param customChains - an array of custom chain configurations
 * @param libraryInfo - an object containing library names and addresses
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

  const deployedContracts = findDeployedContracts(
    deploymentState,
    (exState): exState is DeploymentExecutionState => {
      return exState.type === ExecutionSateType.DEPLOYMENT_EXECUTION_STATE;
    }
  );

  const contracts = Object.entries(deployedContracts);

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

    const libraries = resolveLibraryInfoForArtifact(
      artifact,
      deployedContracts
    );

    const { contractName, constructorArgs } = exState;

    const verifyResult: VerifyResult = [
      chainConfig,
      {
        address: contract.address,
        compilerVersion: buildInfo.solcLongVersion.startsWith("v")
          ? buildInfo.solcLongVersion
          : `v${buildInfo.solcLongVersion}`,
        sourceCode: resolveSourceCodeForLibraries(buildInfo, libraries),
        name: `${artifact.sourceName}:${contractName}`,
        args: encodeDeploymentArguments(artifact, constructorArgs),
      },
    ];

    yield verifyResult;
  }
}

function resolveLibraryInfoForArtifact(
  artifact: Artifact,
  deployedContracts: Record<string, DeployedContract>
): SourceToLibraryToAddress | null {
  const sourceToLibraryToAddress: SourceToLibraryToAddress = {};

  for (const [sourceName, refObj] of Object.entries(artifact.linkReferences)) {
    for (const [libName] of Object.entries(refObj)) {
      sourceToLibraryToAddress[sourceName] ??= {};

      const libraryAddress = Object.values(deployedContracts).find(
        (contract) => contract.contractName === libName
      )?.address;

      assertIgnitionInvariant(
        libraryAddress !== undefined,
        `Could not find address for library ${libName}`
      );

      sourceToLibraryToAddress[sourceName][libName] = libraryAddress;
    }
  }

  if (Object.entries(sourceToLibraryToAddress).length === 0) {
    return null;
  }

  return sourceToLibraryToAddress;
}

function resolveSourceCodeForLibraries(
  buildInfo: BuildInfo,
  libraries: SourceToLibraryToAddress | null
): string {
  if (libraries === null) {
    return JSON.stringify(buildInfo.input);
  }

  const { input } = buildInfo;
  input.settings.libraries = libraries;

  return JSON.stringify(input);
}
