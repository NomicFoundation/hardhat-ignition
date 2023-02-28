import hre from "hardhat";
import { buildModule } from "@ignored/hardhat-ignition";

const currentTimestampInSeconds = Math.round(
  new Date(2023, 1, 1).valueOf() / 1000
);
const TEN_YEAR_IN_SECS = 10 * 365 * 24 * 60 * 60;
const TEN_YEARS_IN_FUTURE = currentTimestampInSeconds + TEN_YEAR_IN_SECS;

const ONE_GWEI = hre.ethers.utils.parseUnits("1", "gwei").toString();

const LockModule = buildModule("LockModule", (m) => {
  const artifact = require("../artifacts/contracts/Lock.sol/Lock.json");

  const unlockTime = m.getOptionalParam("unlockTime", TEN_YEARS_IN_FUTURE);
  const lockedAmount = m.getOptionalParam("lockedAmount", ONE_GWEI);

  const lock = m.contract("Lock", artifact, {
    args: [unlockTime],
    value: lockedAmount,
  });

  const event = m.event(lock, "Withdrawal", { args: [] });

  return { lock, event };
});

export default LockModule;
