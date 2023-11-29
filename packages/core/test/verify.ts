import { assert } from "chai";
import path from "path";

import { VerifyResult, verify } from "../src";

describe("verify", () => {
  it("should not verify an unitialized deployment", async () => {
    await assert.isRejected(
      verify("test").next(),
      /IGN1000: Cannot verify contracts for nonexistant deployment at test/
    );
  });

  it("should not verify a deployment that did not deploy any contracts", async () => {
    const deploymentDir = path.join(
      __dirname,
      "mocks",
      "verify",
      "no-contracts"
    );

    await assert.isRejected(
      verify(deploymentDir).next(),
      /IGN1001: Cannot verify deployment/
    );
  });

  it("should not verify a deployment deployed to an unsupported chain", async () => {
    const deploymentDir = path.join(
      __dirname,
      "mocks",
      "verify",
      "unsupported-chain"
    );

    await assert.isRejected(
      verify(deploymentDir).next(),
      /IGN1: Internal Hardhat Ignition invariant was violated: Verification not yet supported for chainId 123456789/
    );
  });

  it("should yield a verify result", async () => {
    const expectedResult: VerifyResult = [
      {
        network: "mainnet",
        chainId: 1,
        urls: {
          apiURL: "https://api.etherscan.io/api",
          browserURL: "https://etherscan.io",
        },
      },
      {
        address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        compilerVersion: "v0.8.19+commit.7dd6d404",
        sourceCode: `{"language":"Solidity","sources":{"contracts/Lock.sol":{"content":"// SPDX-License-Identifier: UNLICENSED\\npragma solidity ^0.8.9;\\n\\n// Uncomment this line to use console.log\\n// import \\"hardhat/console.sol\\";\\n\\ncontract Lock {\\n  uint public unlockTime;\\n  address payable public owner;\\n\\n  event Withdrawal(uint amount, uint when);\\n\\n  constructor(uint _unlockTime) payable {\\n    require(\\n      block.timestamp < _unlockTime,\\n      \\"Unlock time should be in the future\\"\\n    );\\n\\n    unlockTime = _unlockTime;\\n    owner = payable(msg.sender);\\n  }\\n\\n  function withdraw() public {\\n    // Uncomment this line, and the import of \\"hardhat/console.sol\\", to print a log in your terminal\\n    // console.log(\\"Unlock time is %o and block timestamp is %o\\", unlockTime, block.timestamp);\\n\\n    require(block.timestamp >= unlockTime, \\"You can't withdraw yet\\");\\n    require(msg.sender == owner, \\"You aren't the owner\\");\\n\\n    emit Withdrawal(address(this).balance, block.timestamp);\\n\\n    owner.transfer(address(this).balance);\\n  }\\n}\\n"}},"settings":{"optimizer":{"enabled":false,"runs":200},"outputSelection":{"*":{"*":["abi","evm.bytecode","evm.deployedBytecode","evm.methodIdentifiers","metadata"],"":["ast"]}}}}`,
        name: "contracts/Lock.sol:Lock",
        args: "00000000000000000000000000000000000000000000000000000000767d1650",
      },
    ];

    const deploymentDir = path.join(__dirname, "mocks", "verify", "success");

    const result = (await verify(deploymentDir).next()).value;

    assert.deepEqual(result, expectedResult);
  });
});
