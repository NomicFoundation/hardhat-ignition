import "@nomicfoundation/hardhat-ignition";
import "@nomicfoundation/hardhat-ethers";
import { extendEnvironment } from "hardhat/config";
import { HardhatPluginError, lazyObject } from "hardhat/plugins";

import "./type-extensions";

/**
 * Add an `ignition` object to the HRE.
 */
extendEnvironment((hre) => {
  if (hre.ignition !== undefined && hre.ignition.type !== "ethers") {
    throw new HardhatPluginError(
      "hardhat-ignition-ethers",
      `Found ${hre.ignition.type} and ethers, but only one Hardhat Ignition extention plugin can be used at a time.`
    );
  }

  hre.ignition = lazyObject(() => {
    const { IgnitionHelper } = require("./ignition-helper");

    return new IgnitionHelper(hre);
  });
});
