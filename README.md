# Supply Chain - Tracking

## Prerequisites
Make sure you have the following installed on your machine:
- **Node.js** (v18 or later recommended)
- **npm** (comes with Node.js)
- **Git**

## Project Structure
```
SupplyChain-Tracking/
├── SupplyChain/          # Blockchain layer (Hardhat project)
│   ├── contracts/       # Solidity smart contracts and smart contract unit tests with solidity-based tests (Foundry-style)
│   ├── ignition/        # Hardhat Ignition deployment modules
│   │   └── modules/     # Deployment logic (recommended place)
│   ├── test/            # Smart contract integration tests with mocha
│   ├── scripts/         # Setup data scripts
│   ├── data/            # Simulated data for 50 products
│   ├── hardhat.config.ts
│   └── package.json
│
├── frontend/             # Frontend application
│   ├── src/              # Frontend source code
│   └── package.json
│
└── README.md
```
***Note***: The project structure above **highlights only the most important folders and files** for understanding the system architecture. Additional configuration files, generated artifacts, and auxiliary directories exist in the actual project but are intentionally omitted here for clarity.

### Blockchain layer
Contains the core blockchain logic of the system.
- `contracts/`: Solidity smart contracts that implement the supply chain workflow. This folder also includes `.t.sol` test files, which are Solidity-based tests used to validate contract logic at a low level.
- `ignition/`: Deployment logic using Hardhat Ignition, providing deterministic and manageable contract deployments.
- `test/`: Hardhat-based tests written in TypeScript using Mocha/Chai.
- `scripts/`: Utility scripts used after deployment to Grant roles (Manufacturer, Distributor, Retailer) and Create products and simulate supply chain transactions.
- `data/`: Simulated data for **50 products**, which is used by `scripts/setup-data.ts` to preload and test the application.

### Frontend layer
Contains the user interface of the application.
- `src/`: Main frontend source code.

## Run projects
### Deploy smart contract in local
- Navigate to `SupplyChain` directory
```bash
cd SupplyChain
```
- Install dependencies
```bash
npm install
```
- Start local blockchain
```bash
npx hardhat node
```
- **Open another terminal**, deploy smart contract on local blockchain
```bash
npx hardhat ignition deploy ignition/modules/SupplyChain.ts --network localhost
```
- After deploying the smart contract using Hardhat Ignition, the terminal will display deployment information similar to the following:
```bash
Hardhat Ignition 🚀

Deploying [ SupplyChainModule ]

Batch #1
  Executed SupplyChainModule#RoleManager

Batch #2
  Executed SupplyChainModule#SupplyChain

[ SupplyChainModule ] successfully deployed 🚀

Deployed Addresses

SupplyChainModule#RoleManager - 0x5FbDB2315678afecb367f032d93F642f64180aa3
SupplyChainModule#SupplyChain - 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```
- ***About the Contract Address***: When deploying to the Hardhat local network (`npx hardhat node`), the blockchain starts from a clean, deterministic state. The `RoleManager` and `SupplyChain` contracts using the default Hardhat deployer account will **always have the above addresses**. If the deployed contract addresses match the output above, **you can safely skip the “Important Note” section below**:
```bash
SupplyChainModule#RoleManager - 0x5FbDB2315678afecb367f032d93F642f64180aa3
SupplyChainModule#SupplyChain - 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```
- ***Important Note***: If the deployed contract addresses are different from the one shown above, you must update the contract address manually in the `scripts/grant-roles.ts` and `scripts/setup-data.ts`. Update the following line in each file, replace it with **your actual deployed contract addresses**:
```bash
const ROLE_MANAGER_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; # grant-roles.ts
const SUPPLY_CHAIN_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; # setup-data.ts
```
- Run the scripts to grant roles and setup data
```bash
npx hardhat run scripts/grant-roles.ts --network localhost
npx hardhat run scripts/setup-data.ts --network localhost
```

### Run frontend
```bash
npm run start
```
