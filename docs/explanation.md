# Explanation

> This document explains what Ignition is, what it is used for, and the building blocks that make it.

Ignition is an infrastructure-as-code system to both deploy and distribute smart contract systems.

When working with Ignition you define how your smart contracts should be deployed, and let it be in charge of the execution. This means that Ignition will be responsible for sending your transactions, managing gas, handling errors and restarts, and other situations that can appear when deploying a complex system.

Ignition can be used to deploy a complex smart contract system and will support the deployment with: planning tools, visualisations of the running deployment and the capability to restart partial deployments.

Specifying a deployment through Ignition provides the option to leverage that specification in Hardhat tests, simplifying test setup. It is a goal of Ignition to enable to distribution of Ignition deployments to allow Solidity developers to quickly create complex on-chain scenarios (e.g. testing your contracts interaction with [Maker during an emergency shutdown](https://docs.makerdao.com/smart-contract-modules/shutdown)), that are not currently possible through forking tests.

> NOTE: This document focuses on deploying your local contracts, and not on distributing them. Deployment distribution is not part of the initial prototype.

## Understanding the Module API

Ignition achieves this separation of responsibilites through a `Future`-orientated declarative api, as opposed to the procedural api used in deployment scripts. This allows Ignition to statically analyse the deployment without running it. That analysis supports: improved validation, resuming partial deployments and efficient grouping and processing of transactions.

### What is a Module?

Deployments in Ignition are organized by modules. A module is a set of related smart contracts to be deployed and potentially some actions that need to be run on them (e.g. calling an `initialize()` function).

A module is built by calling the `buildModule` function and passing it a unique name and a callback, the `moduleDefinition`. A common pattern is building one module per file and exporting it.

```tsx
module.exports = buildModule("CounterModule", (m) => {
  const intialCounterValue = 123;

  const counter = m.contract("Counter", { args: [initialCounterValue]});

  return { counter };
});
```

The `moduleDefinition` callback receives a `moduleBuilder` object, which is used to define the different `Action`s that are needed to complete the deployment of the module, and returns the contracts it wants to export.

`moduleBuidler` methods don’t execute any `Action`, they create them and return a `Future` that represents the eventual result of its execution.

In the above example, when we call `m.contract`, we create a contract deployment `Action`, and get a `Future` that represents its result.

`Action`s can depend on other `Action`'s results. We do this by using `Future`s as arguments of `moduleBuidler` methods. For example, here we define two `Action`s. One that deploys a contract, and another one that initializes it.

```tsx
module.exports = buildModule("ContractWithInitModule", (m) => {
  const c = m.contract("ContractWithInitModule");

  m.call(c, "init", {args: [123]});

  return { c };
});
```

You can create complex graphs of `Action`s like this.

### How modules get executed

- Modules are only run once, like JavaScript modules.
- Ignition takes a Module, creates the graph of actions, and then executes it.
- Most actions get executed by running a transaction.
- Ignition may run more than one transaction to complete an action.
    - Because of errors or gas management
    - Transparent to the user
- Not every action results in transactions
- Executing an Action successfully makes its associated Future “resolved”.
- Actions aren’t run until all the Future’s it depends on have been resolved.
- Ignition executes Actions in batches, running as many actions as it can in parallel.

<!-- ## Using a Module from another Module

- How to use a Module from another one.
- Only get one result per module.
- Using the same module twice gives you the same set of contracts. Doesn’t deploy twice.
- If an action depends on another module’s future, it won’t be executed until the entire module gets successfully executed. -->

## Handling errors and restarting

- Ignition keeps a journal of the execution
- When a deployment fails, you can restart from where it failed. It doesn’t redeploy everything.
- It uses the journal to quickly get back to the state it was at, and continues from there.

## Modifying your Modules between deployments

- You can modify your deployments between Ignition runs
- This can help deal with errors
- You can use it to incrementally grow your system
- Ignition will restart from where it was left the last time you run it, and continue from there, deploying the new contracts.
- To be able to do this, Ignition needs to be able to uniquely identify each Action, even in the presence of changes
- Ignition won’t try to execute successfully executed Actions unless you explicitly ask for it.
- Ignition assigns an id to each Action. It can do it automatically in most cases, but sometimes it will ask the user to do it instead.

---

Next, dig deeper into defining modules:

[Creating modules for deployment](./creating-modules-for-deployment.md)
