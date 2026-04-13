const hre = require("hardhat");

async function main() {
  const IntelLog = await hre.ethers.getContractFactory("IntelLog");

  const contract = await IntelLog.deploy();

  await contract.waitForDeployment(); // ✅ FIX HERE

  console.log("Contract deployed at:", contract.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});