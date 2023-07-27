# Using Ignition in _Hardhat_ tests

**Ignition** can be used in **Hardhat** tests to simplify test setup, as **Ignition** modules can capture complex deployments of contract systems, which is a common problem when creating test fixtures.

## The Ignition object

Requiring **Ignition** within your `hardhat.config.{ts,js}` will automatically inject the `ignition` object as a global variable within **Hardhat** test files.

The `ignition` object exposes a `deploy` method, that takes a Module as the first argument and an optional configuration object as the second argument. Module parameters can be passed under the `parameters` property of the options object, indexed by the `ModuleId`:

```js
it("should allow setting the start count for new counters", async function () {
  const CounterModule = buildModule("Counter", (m) => {
    const startCount = m.getOptionalParam("startCount", 0);

    const counter = m.contract("Counter", { args: [startCount] });

    return { counter };
  });

  const { counter } = await ignition.deploy(CounterModule, {
    parameters: {
      Counter: {
        startCount: 42,
      },
    },
  });

  assert.equal(await counter.count(), 42);
});
```

The `ignition.deploy` method automatically converts any `ContractFuture`s returned from the passed module into `ether`'s contract objects, so they can be manipulated and invoked.

---

Next learn how to run a deployment:

[Running a deployment](./running-a-deployment.md)
