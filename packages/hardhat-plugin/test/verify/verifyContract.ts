import type { Etherscan } from "@nomicfoundation/hardhat-verify/etherscan";

import { assert } from "chai";

import { verifyEtherscanContract } from "../../src/utils/verifyContract";

describe("verifyEtherscanContract", function () {
  let etherscanInstance: any;
  const contractInfo = {
    address: "0x123",
    compilerVersion: "v0.8.0",
    sourceCode: "sourceCode",
    name: "name",
    args: "args",
  };

  beforeEach(function () {
    etherscanInstance = {
      verify: async () => ({ message: "guid" }),
      getVerificationStatus: async () => ({
        isSuccess: () => true,
        message: "message",
      }),
      getContractUrl: () => "url",
    };
  });

  it("should return a success object when verification succeeds", async function () {
    const result = await verifyEtherscanContract(
      etherscanInstance as Etherscan,
      contractInfo
    );

    assert.deepEqual(result, {
      type: "success",
      contractURL: "url",
    });
  });

  it("should return a failure object when verification is not successful", async function () {
    const message = "message";

    etherscanInstance.getVerificationStatus = async () => ({
      isSuccess: () => false,
      message,
    });

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    assert.isRejected(
      verifyEtherscanContract(etherscanInstance as Etherscan, contractInfo)
    );
  });
});
