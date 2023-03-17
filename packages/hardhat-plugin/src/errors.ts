import { NomicLabsHardhatPluginError } from "hardhat/plugins";

export class IgnitionPluginError extends NomicLabsHardhatPluginError {
  constructor(message: string) {
    super("ignition", message);
  }
}
