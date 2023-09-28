import { buildModule } from "@nomicfoundation/ignition-core";

const reverseTldHash = "0xreversehash";
const resolverNode = "0xresolvernodehash";
const resolverLabel = "0xresolverlabelhash";
const reverseLabel = "0xreverselabelhash";
const addrLabel = "0xaddrlabelhash";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

const registryModule = buildModule("REGISTRY", (m) => {
  const ens = m.contract("ENSRegistry");

  return { ens };
});

const resolverModule = buildModule("RESOLVER", (m) => {
  const { ens } = m.useModule(registryModule);
  const account = m.getAccount(0);

  // Setup resolver
  const resolver = m.contract("PublicResolver", [ens, ZERO_ADDRESS]);

  m.call(ens, "setSubnodeOwner", [ZERO_HASH, resolverLabel, account], {
    id: "set_subnode_owner_for_resolver",
  });

  m.call(ens, "setResolver", [resolverNode, resolver]);

  m.call(resolver, "setAddr(bytes32,address)", [resolverNode, resolver]);

  return { resolver };
});

const reverseRegistrarModule = buildModule("REVERSEREGISTRAR", (m) => {
  const account = m.getAccount(0);

  const { ens } = m.useModule(registryModule);
  const { resolver } = m.useModule(resolverModule);

  // Setup Reverse Registrar
  const reverseRegistrar = m.contract("ReverseRegistrar", [ens, resolver]);

  m.call(ens, "setSubnodeOwner", [ZERO_HASH, reverseLabel, account], {
    id: "set_subnode_owner_reverse",
  });

  m.call(
    ens,
    "setSubnodeOwner",
    [reverseTldHash, addrLabel, reverseRegistrar],
    {
      id: "set_subnode_addr_label",
    }
  );

  return { reverseRegistrar };
});

export default buildModule("ENS", (m) => {
  const { ens } = m.useModule(registryModule);
  const { resolver } = m.useModule(resolverModule);
  const { reverseRegistrar } = m.useModule(reverseRegistrarModule);

  return { ens, resolver, reverseRegistrar };
});
