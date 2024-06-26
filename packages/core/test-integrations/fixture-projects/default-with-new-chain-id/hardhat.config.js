require("@nomicfoundation/hardhat-ignition");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      metadata: {
        // We disable the metadata to keep the fixtures more stables
        appendCBOR: false,
      },
    },
  },
  networks: {
    hardhat: {
      // We use a different chain id to avoid triggering the auto-wipe for fixtures
      chainId: 1337,
    },
  },
};
