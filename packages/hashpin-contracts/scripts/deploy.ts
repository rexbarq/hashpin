import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Deploying Hashpin contract...");

  // Get the contract factory
  const Hashpin = await ethers.getContractFactory("Hashpin");
  
  // Deploy the contract
  const hashpin = await Hashpin.deploy();
  await hashpin.waitForDeployment();
  
  const address = await hashpin.getAddress();
  console.log(`Hashpin deployed to: ${address}`);
  
  // Save the contract address and ABI to a file for later use
  const deploymentInfo = {
    address,
    abi: JSON.parse(Hashpin.interface.formatJson())
  };
  
  // Create a deployment directory if it doesn't exist
  const deploymentDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }
  
  // Save the deployment info
  fs.writeFileSync(
    path.join(deploymentDir, "hashpin.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("Deployment info saved to deployments/hashpin.json");
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 