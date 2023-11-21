import { assert } from "chai";

import { getApiKeyAndUrls } from "../../src/utils/getApiKeyAndUrls";

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
