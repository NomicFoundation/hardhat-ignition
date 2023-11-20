import { NomicLabsHardhatPluginError } from "hardhat/plugins";

const ETHERSCAN_API_URL = "https://api%.etherscan.io/api";
const ETHERSCAN_WEB_URL = "https://%etherscan.io";

export function getApiKeyAndUrls(
  etherscanApiKey: string | Record<string, string>,
  networkName: string
): [string, string, string] {
  const lowerNetworkName = networkName.toLowerCase();

  if (typeof etherscanApiKey === "string") {
    if (lowerNetworkName !== "mainnet") {
      throw new NomicLabsHardhatPluginError(
        "@nomicfoundation/hardhat-ignition",
        `No etherscan API key configured for network ${lowerNetworkName}`
      );
    }

    return [
      etherscanApiKey,
      ETHERSCAN_API_URL.replace("%", ""),
      ETHERSCAN_WEB_URL.replace("%", ""),
    ];
  } else {
    const apiKey = etherscanApiKey[lowerNetworkName];

    if (apiKey === undefined) {
      throw new NomicLabsHardhatPluginError(
        "@nomicfoundation/hardhat-ignition",
        `No etherscan API key configured for network ${lowerNetworkName}`
      );
    }

    return [
      apiKey,
      ETHERSCAN_API_URL.replace("%", `-${lowerNetworkName}`),
      ETHERSCAN_WEB_URL.replace("%", `${lowerNetworkName}.`),
    ];
  }
}
