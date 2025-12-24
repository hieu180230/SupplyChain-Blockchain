import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("SupplyChainModule", (m) => {
  const roleManager = m.contract("RoleManager");
  const supplyChain = m.contract("SupplyChain", [roleManager]);
  
  return { roleManager, supplyChain };
});