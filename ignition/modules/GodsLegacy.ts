import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const GodsLegacyModule = buildModule("GodsLegacyModule", (m) => {
  const GodsLegacy = m.contract("GodsLegacy");
  return { GodsLegacy };
});

export default GodsLegacyModule;
