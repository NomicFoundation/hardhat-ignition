import type { HardhatUserConfig, vars } from "hardhat/types";

import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ignition-viem";
import "@nomicfoundation/hardhat-viem";

const ALCHEMY_API_KEY = vars.get("ALCHEMY_API_KEY");
const TEST_PRIVATE_KEY = vars.get("TEST_PRIVATE_KEY");

const config: HardhatUserConfig = {
  solidity: "0.8.19",
  networks: {
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [TEST_PRIVATE_KEY],
    },
  },
  ignition: {
    strategyConfig: {
      create2: {
        // To learn more about salts, see the CreateX documentation
        salt: "0x0000000000000000000000000000000000000000000000000000000000000000",
      },
    },
  },
};

export default config;
