# Using Ignition in _Hardhat_ tests

For this guide, we'll be referring to the **Ignition** module and test inside the [simple example](../examples/simple/README.md):

```javascript
// ignition/Simple.js
const { buildModule } = require("@ignored/hardhat-ignition");

module.exports = buildModule("Simple", (m) => {
  const incAmount = m.getOptionalParam("IncAmount", 1);

  const simple = m.contract("Simple");

  m.call(simple, "inc", {
    args: [incAmount],
  });

  return { simple };
});

// test/simple.test.js
const { assert } = require("chai");
const SimpleModule = require("../ignition/Simple");

describe("Simple", function () {
  let simpleContract;

  before(async () => {
    const { simple } = await ignition.deploy(SimpleModule, {
      parameters: {
        IncAmount: 42,
      },
    });

    simpleContract = simple;
  });

  it("should return an instantiated ethers contract", async function () {
    assert.isDefined(simpleContract);
  });

  it("should have incremented the count with the deployment config call", async function () {
    assert.equal(await simpleContract.count(), 52);
  });
});
```

As you can see above, the **Ignition** Hardhat plugin makes an `ignition` instance available globally during your Mocha tests. Using this instance allows you to deploy your imported modules exactly as you would on the command line!

Since the contract instances returned from modules are resolved as ethers contracts, you can then call functions on them according to your testing needs just like you normally would.

---

Next learn how to run a deployment:

[Running a deployment](./running-a-deployment.md)
