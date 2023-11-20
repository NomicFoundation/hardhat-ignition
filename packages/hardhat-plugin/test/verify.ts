/* eslint-disable import/no-unused-modules */
import type { Etherscan } from "@nomicfoundation/hardhat-verify/etherscan";

import { assert } from "chai";

import { getApiKeyAndUrls } from "../src/utils/getApiKeyAndUrls";
import { verifyEtherscanContract } from "../src/utils/verifyEtherscanContract";

import { useEphemeralIgnitionProject } from "./use-ignition-project";

describe("verify", function () {
  describe("when there is no etherscan API key configured", function () {
    useEphemeralIgnitionProject("verify-no-api-key");

    it("should throw", async function () {
      await assert.isRejected(
        this.hre.run(
          { scope: "ignition", task: "verify" },
          {
            deploymentId: "test",
          }
        ),
        /No etherscan API key configured/
      );
    });
  });

  describe("utils", function () {
    describe("getApiKeyList", function () {
      it("should return the correct API URLs when given a string", function () {
        const apiKeyList = getApiKeyAndUrls("testApiKey", "mainnet");

        assert.deepEqual(apiKeyList, [
          "testApiKey",
          "https://api.etherscan.io/api",
          "https://etherscan.io",
        ]);
      });

      it("should return the correct API URLs when given an object and a configured network name", function () {
        const apiKeyList = getApiKeyAndUrls(
          {
            goerli: "goerliApiKey",
            sepolia: "sepoliaApiKey",
          },
          "goerli"
        );

        assert.deepEqual(apiKeyList, [
          "goerliApiKey",
          "https://api-goerli.etherscan.io/api",
          "https://goerli.etherscan.io",
        ]);
      });

      it("should throw when given a string if the network name is not mainnet", function () {
        assert.throws(() => getApiKeyAndUrls("testApiKey", "goerli"));
      });

      it("should throw when given an object and a nonexistent network name", function () {
        assert.throws(
          () =>
            getApiKeyAndUrls(
              {
                goerli: "goerliApiKey",
                sepolia: "sepoliaApiKey",
              },
              "mainnet"
            ),
          /No etherscan API key configured for network mainnet/
        );
      });
    });

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
        etherscanInstance.getVerificationStatus = async () => ({
          isSuccess: () => false,
          message: "message",
        });

        const result = await verifyEtherscanContract(
          etherscanInstance as Etherscan,
          contractInfo
        );

        assert.deepEqual(result, {
          type: "failure",
          reason: new Error("message"),
        });
      });
    });
  });
});
