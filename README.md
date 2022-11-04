[![npm](https://img.shields.io/npm/v/@ignored/hardhat-ignition.svg)](https://www.npmjs.com/package/@ignored/hardhat-ignition) [![hardhat](https://hardhat.org/buidler-plugin-badge.svg?1)](https://hardhat.org)

# Ignition

> **WARNING**: This repository is **highly experimental**, and is under **active development**. Any code or binaries produced from this project **should not be used in any production or critical workloads**. The API is preliminary, **the API will change**.

Ignition is **Hardhat**'s deployment solution. It is a **Hardhat** plugin that allows you to create declarative deployments that can be reproduced across different networks.

Built by the [Nomic Foundation](https://nomic.foundation/) for the Ethereum community.

Join our [Hardhat Support Discord server](https://hardhat.org/discord) to stay up to date on new releases, plugins and tutorials.

## Installation

```bash
npm install --save-dev @ignored/hardhat-ignition
```

And add the following statement to your `hardhat.config.js`:

```js
require("@ignored/hardhat-ignition");
```

Or, if you are using TypeScript, add this to your `hardhat.config.ts`:

```js
import "@ignored/hardhat-ignition";
```

## Getting Started

See our [Getting started guide](./docs/getting-started-guide.md) for a worked example of **Ignition usage**.

## Documentation

- [Getting started](./docs/getting-started-guide.md)
- [Creating modules for deployment](./docs/creating-modules-for-deployment.md)
  - [Deploying a contract](./docs/creating-modules-for-deployment.md#deploying-a-contract)
  - [Calling contract methods](./docs/creating-modules-for-deployment.md#calling-contract-methods)
  - [Including modules within modules](./docs/creating-modules-for-deployment.md#modules-within-modules)
  - [Switching based on the _Network Chain ID_](./docs/creating-modules-for-deployment.md#switching-based-on-the-network-chain-id)
  - [Module parameters](./docs/creating-modules-for-deployment.md#module-parameters)
- [Testing With Hardhat](./docs/testing-with-hardhat.md)
- [Visualizing Your Deployment](./docs/visualizing-your-deployment.md)

### Examples

This repo contains example projects that show **Ignitions** features in context (under `./examples`):

- [Simple](./examples/simple/README.md) - a hello world example of a smart contract system deploy with Ignition
- [ENS](./examples/ens/README.md) - deploy ENS and its registry for local testing
- [Create2](./examples/create2/README.md) - deploy contracts using a `create2` factory

## Contributing

Contributions are always welcome! Feel free to open any issue or send a pull request.

Go to [CONTRIBUTING.md](./CONTRIBUTING.md) to learn about how to set up Ignition's development environment.

## Feedback, help and news

[Hardhat Support Discord server](https://hardhat.org/discord): for questions and feedback.

[Follow Hardhat on Twitter.](https://twitter.com/HardhatHQ)
