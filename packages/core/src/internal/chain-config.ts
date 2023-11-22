import type { ChainConfig } from "../types/verify";

// See https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md#list-of-chain-ids
export const builtinChains: ChainConfig[] = [
  {
    network: "mainnet",
    chainId: 1,
    urls: {
      apiURL: "https://api.etherscan.io/api",
      browserURL: "https://etherscan.io",
    },
  },
  {
    network: "goerli",
    chainId: 5,
    urls: {
      apiURL: "https://api-goerli.etherscan.io/api",
      browserURL: "https://goerli.etherscan.io",
    },
  },
  {
    network: "optimisticEthereum",
    chainId: 10,
    urls: {
      apiURL: "https://api-optimistic.etherscan.io/api",
      browserURL: "https://optimistic.etherscan.io/",
    },
  },
  {
    network: "optimisticGoerli",
    chainId: 420,
    urls: {
      apiURL: "https://api-goerli-optimism.etherscan.io/api",
      browserURL: "https://goerli-optimism.etherscan.io/",
    },
  },
  {
    network: "sepolia",
    chainId: 11155111,
    urls: {
      apiURL: "https://api-sepolia.etherscan.io/api",
      browserURL: "https://sepolia.etherscan.io",
    },
  },
];
