import type { ChainConfig } from "@nomicfoundation/hardhat-verify/types";

import { NomicLabsHardhatPluginError } from "hardhat/plugins";

export function getApiKeyAndUrls(
  etherscanApiKey: string | Record<string, string>,
  chainConfig: ChainConfig
): [apiKey: string, apiUrl: string, webUrl: string] {
  let apiKey: string;

  if (typeof etherscanApiKey === "string") {
    if (chainConfig.network !== "mainnet") {
      throw new NomicLabsHardhatPluginError(
        "@nomicfoundation/hardhat-ignition",
        `No etherscan API key configured for network ${chainConfig.network}`
      );
    }

    apiKey = etherscanApiKey;
  } else {
    apiKey = etherscanApiKey[chainConfig.network];

    if (apiKey === undefined) {
      throw new NomicLabsHardhatPluginError(
        "@nomicfoundation/hardhat-ignition",
        `No etherscan API key configured for network ${chainConfig.network}`
      );
    }
  }

  return [apiKey, chainConfig.urls.apiURL, chainConfig.urls.browserURL];
}
