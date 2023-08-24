import { assert } from "chai";

import {
  Artifact,
  ArtifactResolver,
  BuildInfo,
  DeploymentParameters,
} from "../../../src";
import { DeploymentLoader } from "../../../src/new-api/internal/deployment-loader/types";
import { DeploymentState } from "../../../src/new-api/internal/new-execution/types/deployment-state";
import { ExecutionState } from "../../../src/new-api/internal/new-execution/types/execution-state";
import { JournalMessage } from "../../../src/new-api/internal/new-execution/types/messages";
import { getDefaultSender } from "../../../src/new-api/internal/new-execution/utils/get-default-sender";
import { Reconciler } from "../../../src/new-api/internal/reconciliation/reconciler";
import { ReconciliationResult } from "../../../src/new-api/internal/reconciliation/types";
import { IgnitionModule } from "../../../src/new-api/types/module";
import { exampleAccounts } from "../helpers";

export const oneAddress = "0x1111111111111111111111111111111111111111";
export const twoAddress = "0x2222222222222222222222222222222222222222";

export const mockArtifact = {
  contractName: "Contract1",
  bytecode: "0x",
  linkReferences: {},
  abi: [],
};

export class MockDeploymentLoader implements DeploymentLoader {
  public async recordToJournal(_: JournalMessage): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public async *readFromJournal(): AsyncGenerator<
    JournalMessage,
    any,
    unknown
  > {}

  public async loadArtifact(_artifactFutureId: string): Promise<Artifact> {
    return mockArtifact;
  }

  public async storeUserProvidedArtifact(
    _futureId: string,
    _artifact: Artifact
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public storeNamedArtifact(
    _futureId: string,
    _contractName: string,
    _artifact: Artifact
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public storeBuildInfo(_buildInfo: BuildInfo): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public recordDeployedAddress(
    _futureId: string,
    _contractAddress: string
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }
}

export class MockArtifactResolver implements ArtifactResolver {
  public async loadArtifact(_contractName: string): Promise<Artifact> {
    return mockArtifact;
  }

  public async getBuildInfo(
    _contractName: string
  ): Promise<BuildInfo | undefined> {
    throw new Error("Method not implemented.");
  }
}

export class ArtifactMapResolver extends MockArtifactResolver {
  constructor(
    private readonly _artifactMap: { [artifactId: string]: Artifact } = {}
  ) {
    super();
  }

  public async loadArtifact(contractName: string): Promise<Artifact> {
    return this._artifactMap[contractName];
  }
}

export class ArtifactMapDeploymentLoader extends MockDeploymentLoader {
  constructor(
    private readonly _artifactMap: { [artifactId: string]: Artifact } = {}
  ) {
    super();
  }

  public async loadArtifact(contractName: string): Promise<Artifact> {
    return this._artifactMap[contractName];
  }
}

export function createDeploymentState(
  ...exStates: ExecutionState[]
): DeploymentState {
  return {
    chainId: 123,
    executionStates: Object.fromEntries(exStates.map((s) => [s.id, s])),
  };
}

export async function reconcile(
  ignitionModule: IgnitionModule,
  deploymentState: DeploymentState,
  deploymentLoader: DeploymentLoader = new MockDeploymentLoader(),
  artifactLoader: ArtifactResolver = new MockArtifactResolver(),
  deploymentParameters: DeploymentParameters = {}
): Promise<ReconciliationResult> {
  const reconiliationResult = Reconciler.reconcile(
    ignitionModule,
    deploymentState,
    deploymentParameters,
    exampleAccounts,
    deploymentLoader,
    artifactLoader,
    getDefaultSender(exampleAccounts)
  );

  return reconiliationResult;
}

export function assertNoWarningsOrErrors(
  reconciliationResult: ReconciliationResult
) {
  assert.equal(
    reconciliationResult.reconciliationFailures.length,
    0,
    `Unreconcilied futures found: \n${JSON.stringify(
      reconciliationResult.reconciliationFailures,
      undefined,
      2
    )}`
  );
  assert.equal(
    reconciliationResult.missingExecutedFutures.length,
    0,
    `Missing futures found: \n${JSON.stringify(
      reconciliationResult.missingExecutedFutures,
      undefined,
      2
    )}`
  );
}

export async function assertSuccessReconciliation(
  ignitionModule: IgnitionModule,
  deploymentState: DeploymentState
) {
  const reconciliationResult = await reconcile(ignitionModule, deploymentState);

  assertNoWarningsOrErrors(reconciliationResult);
}
