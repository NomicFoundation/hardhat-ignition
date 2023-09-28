import { IgnitionModuleSerializer } from "@nomicfoundation/ignition-core";
import { writeFile } from "node:fs/promises";

// temporarily using an ENS version for batching testing
// import complexModule from "../examples/ComplexModule.js";
import complexModule from "../examples/ENS.js";

const main = async () => {
  await writeDeploymentJsonFor(complexModule);
};

const temp = [
  ["REGISTRY#ENSRegistry"],
  [
    "RESOLVER#PublicResolver",
    "RESOLVER#set_subnode_owner_for_resolver",
    "REVERSEREGISTRAR#set_subnode_owner_reverse",
  ],
  [
    "RESOLVER#ENSRegistry.setResolver",
    "RESOLVER#PublicResolver.setAddr(bytes32,address)",
  ],
  ["REVERSEREGISTRAR#ReverseRegistrar"],
  ["REVERSEREGISTRAR#set_subnode_addr_label"],
];

async function writeDeploymentJsonFor(ignitionModule) {
  const serializedIgnitionModule =
    IgnitionModuleSerializer.serialize(ignitionModule);

  console.log("Deployment written to ./public/deployment.json");

  await writeFile(
    "./public/deployment.json",
    JSON.stringify(
      { module: serializedIgnitionModule, batches: temp },
      undefined,
      2
    )
  );
}

main();
