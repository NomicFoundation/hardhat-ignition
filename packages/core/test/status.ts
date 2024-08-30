import { assert } from "chai";
import path from "path";

import { Artifact, status } from "../src";
import { zeroHash } from "../src/internal/journal/types/deployment-stamp";

import { setupMockArtifactResolver } from "./helpers";

describe("status", () => {
  it("should return a status result for a successful deployment", async () => {
    const expectedResult = {
      started: [],
      successful: ["LockModule#Lock"],
      held: [],
      timedOut: [],
      failed: [],
      chainId: 1,
      contracts: {
        "LockModule#Lock": {
          abi: ["test"],
          address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
          blockNumber: 0,
          contractName: "ArtifactLock",
          id: "LockModule#Lock",
          sourceName: "contracts/ArtifactLock.sol",
          transactionHash: zeroHash,
        },
      },
    };

    const fakeArtifact: Artifact = {
      abi: ["test"],
      contractName: "ArtifactLock",
      sourceName: "contracts/ArtifactLock.sol",
      bytecode: "",
      linkReferences: {},
    };

    const deploymentDir = path.join(__dirname, "mocks", "status", "success");

    const artifactResolver = setupMockArtifactResolver({ Lock: fakeArtifact });

    const result = await status(deploymentDir, artifactResolver);

    assert.deepEqual(result, expectedResult);
  });

  it("should throw an error if the deployment is not initialized", async () => {
    const artifactResolver = setupMockArtifactResolver();

    await assert.isRejected(
      status("fake", artifactResolver),
      /IGN800: Cannot get status for nonexistant deployment at fake/
    );
  });
});
