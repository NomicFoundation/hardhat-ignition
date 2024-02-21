/* eslint-disable import/no-unused-modules */
import "hardhat/types/config";
import "hardhat/types/runtime";

import { DeployConfig } from "@nomicfoundation/ignition-core";

declare module "hardhat/types/config" {
  export interface ProjectPathsUserConfig {
    ignition?: string;
  }

  export interface ProjectPathsConfig {
    ignition: string;
  }

  export interface HardhatNetworkUserConfig {
    ignition?: {
      maxFeePerGasLimit?: bigint;
    };
  }

  export interface HardhatNetworkConfig {
    ignition: {
      maxFeePerGasLimit?: bigint;
    };
  }

  export interface HttpNetworkUserConfig {
    ignition?: {
      maxFeePerGasLimit?: bigint;
    };
  }

  export interface HttpNetworkConfig {
    ignition: {
      maxFeePerGasLimit?: bigint;
    };
  }

  export interface HardhatUserConfig {
    ignition?: Partial<DeployConfig>;
  }

  export interface HardhatConfig {
    ignition: Partial<DeployConfig>;
  }
}
