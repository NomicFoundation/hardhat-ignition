import { IgnitionHelper } from "./ignition-helper";

declare module "hardhat/types/runtime" {
  export interface HardhatRuntimeEnvironment {
    ignition: IgnitionHelper;
  }
}
