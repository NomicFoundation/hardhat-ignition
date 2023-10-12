import { StatusResult } from "@nomicfoundation/ignition-core";
import { assert } from "chai";
import chalk from "chalk";

import { calculateDeploymentStatusDisplay } from "../../../src/ui/helpers/calculate-deployment-status-display";

describe.only("ui - calculate deployment status display", () => {
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
  const differentAddress = "0x0011223344556677889900112233445566778899";

  const exampleStatusResult = {
    started: [],
    timedOut: [],
    held: [],
    failed: [],
    successful: [],
    contracts: {},
  };

  describe("successful deployment", () => {
    it("should render a sucessful deployment", () => {
      const expectedText = testFormat(`

        🚀 Deployment deployment-01 Complete

        Deployed Addresses

        MyModule#Token - 0x1F98431c8aD98523631AE4a59f267346ea31F984
        MyModule#AnotherToken - 0x0011223344556677889900112233445566778899`);

      const statusResult: StatusResult = {
        ...exampleStatusResult,
        successful: ["MyModule#Token", "MyModule#AnotherToken"],
        contracts: {
          "MyModule#Token": {
            id: "MyModule#Token",
            address: exampleAddress,
            contractName: "Token",
          },
          "MyModule#AnotherToken": {
            id: "MyModule#AnotherToken",
            address: differentAddress,
            contractName: "AnotherToken",
          },
        },
      };

      const actualText = calculateDeploymentStatusDisplay(
        "deployment-01",
        statusResult
      );

      assert.equal(actualText, expectedText);
    });

    it("should render a sucessful deployment with no deploys", () => {
      const expectedText = testFormat(`

        🚀 Deployment deployment-01 Complete

        ${chalk.italic("No contracts were deployed")}`);

      const statusResult: StatusResult = {
        ...exampleStatusResult,
        successful: ["MyModule#a_call"],
        contracts: {},
      };

      const actualText = calculateDeploymentStatusDisplay(
        "deployment-01",
        statusResult
      );

      assert.equal(actualText, expectedText);
    });
  });

  describe("failed deployment", () => {
    it("should render an execution failure with multiple of each problem type", () => {
      const expectedText = testFormat(`

        ⛔ Deployment deployment-01 did not complete as there were timeouts, failures and holds

        There are timed-out futures:
         - MyModule:MyContract1
         - MyModule:AnotherContract1

        Consider increasing the fee in your config.
        Check out the docs to learn more: <LINK>

        There are failed futures:
         - MyModule:MyContract3/1: Reverted with reason x
         - MyModule:AnotherContract3/3: Reverted with reason y

        There are futures that the strategy held:
         - MyModule:MyContract2/1: Vote is not complete
         - MyModule:AnotherContract2/3: Server timed out`);

      const statusResult: StatusResult = {
        started: [],
        timedOut: [
          { futureId: "MyModule:MyContract1", networkInteractionId: 1 },
          { futureId: "MyModule:AnotherContract1", networkInteractionId: 3 },
        ],
        held: [
          {
            futureId: "MyModule:MyContract2",
            heldId: 1,
            reason: "Vote is not complete",
          },
          {
            futureId: "MyModule:AnotherContract2",
            heldId: 3,
            reason: "Server timed out",
          },
        ],
        failed: [
          {
            futureId: "MyModule:MyContract3",
            networkInteractionId: 1,
            error: "Reverted with reason x",
          },
          {
            futureId: "MyModule:AnotherContract3",
            networkInteractionId: 3,
            error: "Reverted with reason y",
          },
        ],
        successful: ["MyModule#Token", "MyModule#AnotherToken"],
        contracts: {
          "MyModule#Token": {
            id: "MyModule#Token",
            address: exampleAddress,
            contractName: "Token",
          },
          "MyModule#AnotherToken": {
            id: "MyModule#AnotherToken",
            address: differentAddress,
            contractName: "AnotherToken",
          },
        },
      };

      const actualText = calculateDeploymentStatusDisplay(
        "deployment-01",
        statusResult
      );

      assert.equal(actualText, expectedText);
    });
  });

  describe("deployment with started but unfinished futures (e.g. simulation errors)", () => {
    it("should render a sucessful deployment", () => {
      const expectedText = testFormat(`

        ⛔ Deployment deployment-01 has not fully completed, there are futures have started but not finished

         - MyModule#Token
         - MyModule#AnotherToken`);

      const statusResult: StatusResult = {
        ...exampleStatusResult,
        started: ["MyModule#Token", "MyModule#AnotherToken"],
      };

      const actualText = calculateDeploymentStatusDisplay(
        "deployment-01",
        statusResult
      );

      assert.equal(actualText, expectedText);
    });
  });
});

function testFormat(expected: string): string {
  return expected
    .toString()
    .substring(1) // Remove the first newline
    .split("\n")
    .map((line) => line.substring(8)) // remove prefix whitespace
    .join("\n");
}
