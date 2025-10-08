> [!CAUTION]
> Hardhat Ignition has moved to the [Hardhat monorepo](https://github.com/nomicFoundation/hardhat), this repo is now archived.

# Hardhat Ignition

Hardhat Ignition is a declarative system for deploying smart contracts on Ethereum. It enables you to define smart contract instances you want to deploy, and any operation you want to run on them. By taking over the deployment and execution, Hardhat Ignition lets you focus on your project instead of getting caught up in the deployment details.

Built by the [Nomic Foundation](https://nomic.foundation/) for the Ethereum community.

Join the Hardhat Ignition channel of our [Hardhat Community Discord server](https://hardhat.org/ignition-discord) to stay up to date on new releases and tutorials.

## Installation

```bash
# ethers users
npm install --save-dev @nomicfoundation/hardhat-ignition-ethers

# viem users
npm install --save-dev @nomicfoundation/hardhat-ignition-viem
```

Import the plugin in your `hardhat.config.js``:

```js
// ethers users
require("@nomicfoundation/hardhat-ignition-ethers");

// viem users
require("@nomicfoundation/hardhat-ignition-viem");
```

Or if you are using TypeScript, in your `hardhat.config.ts``:

```js
// ethers users
import "@nomicfoundation/hardhat-ignition-ethers";

// viem users
import "@nomicfoundation/hardhat-ignition-viem";
```

## Documentation

On [Hardhat Ignition's website](https://hardhat.org/ignition) you will find guides for:

- [Getting started](https://hardhat.org/ignition/docs/getting-started)
- [Creating Modules](https://hardhat.org/ignition/docs/guides/creating-modules)
- [Deploying a module](https://hardhat.org/ignition/docs/guides/deploy)
- [Visualizing your module](https://hardhat.org/ignition/docs/guides/visualize)
- [Handling errors](https://hardhat.org/ignition/docs/guides/error-handling)
- [Modifying an existing module](https://hardhat.org/ignition/docs/guides/modifications)
- [Using Hardhat Ignition in your tests](https://hardhat.org/ignition/docs/guides/tests)

## Contributing

Contributions are always welcome! Feel free to open any issue or send a pull request.

Go to [CONTRIBUTING.md](https://github.com/NomicFoundation/hardhat-ignition/blob/main/CONTRIBUTING.md) to learn about how to set up Hardhat Ignition's development environment.

## Feedback, help and news

[Hardhat Ignition on Discord](https://hardhat.org/ignition-discord): for questions and feedback.

Follow [Hardhat](https://twitter.com/HardhatHQ) and [Nomic Foundation](https://twitter.com/NomicFoundation) on Twitter.
