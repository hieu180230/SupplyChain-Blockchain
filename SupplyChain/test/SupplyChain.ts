import { expect } from "chai";
import { network } from "hardhat";
import { SupplyChain } from "../types/ethers-contracts/index.js";
import { RoleManager } from "../types/ethers-contracts/index.js";
import { Signer } from "ethers";

const { ethers } = await network.connect();

describe("SupplyChain", () => {
    let supplyChain: SupplyChain;
    let roleManager: RoleManager;
    let admin: Signer, manufacturer: Signer, distributor: Signer, retailer: Signer;

    const TIMESTAMP = 1730000000;
    before(async function() {
        [admin, manufacturer, distributor, retailer] = await ethers.getSigners();

        const RoleManagerFactory = await ethers.getContractFactory("RoleManager", admin);
        roleManager = await RoleManagerFactory.deploy();
        await roleManager.waitForDeployment();

        // 2. Deploy SupplyChain và truyền address của RoleManager
        const SupplyChainFactory = await ethers.getContractFactory("SupplyChain", admin);
        supplyChain = await SupplyChainFactory.deploy(await roleManager.getAddress());
        await supplyChain.waitForDeployment();

        await roleManager.connect(admin).addParticipant(
            await manufacturer.getAddress(), 
            await roleManager.MANUFACTURER_ROLE(), 
            "Sunplay Manufacturer Co",
            TIMESTAMP
        );

        await roleManager.connect(admin).addParticipant(
            await distributor.getAddress(), 
            await roleManager.DISTRIBUTOR_ROLE(), 
            "National Pharma Distributor",
            TIMESTAMP + 100
        );

        await roleManager.connect(admin).addParticipant(
            await retailer.getAddress(), 
            await roleManager.RETAILER_ROLE(), 
            "Guardian Pharmacy Chain",
            TIMESTAMP + 200
        );
    });

    it("Should track the full supply chain process and emit all events correctly", async () => {
        const PRODUCT_CODE = "SUNSCREEN-ROH-20251014-X7V";
        const PRODUCT_NAME = "Sunplay Skin Aqua";
        const IPFS_HASH = "QmTestHash12345";
        
        // --- 1. initProduct (Manufacturer) ---
        await supplyChain.connect(manufacturer).initProduct(PRODUCT_CODE, PRODUCT_NAME, IPFS_HASH, TIMESTAMP + 1000);
        
        const PRODUCT_ID = await supplyChain.getIdFromCode(PRODUCT_CODE);
        expect(PRODUCT_ID).to.equal(1);
        
        // --- 2. passQC (Manufacturer) ---
        await supplyChain.connect(manufacturer).passQC(PRODUCT_ID, TIMESTAMP + 2000);

        // --- 3. packageProduct (Manufacturer) ---
        await supplyChain.connect(manufacturer).packageProduct(PRODUCT_ID, TIMESTAMP + 3000);
                
        // --- 4. transferToDistributor (Manufacturer) ---
        await supplyChain.connect(manufacturer).transferToDistributor(PRODUCT_ID, distributor.getAddress(), TIMESTAMP + 4000);
                
        // --- 5. transferToRetailer (Distributor) ---
        await supplyChain.connect(distributor).transferToRetailer(PRODUCT_ID, retailer.getAddress(), TIMESTAMP + 5000);
                
        // --- 6. sellToConsumer (Retailer) ---
        await supplyChain.connect(retailer).sellToConsumer(PRODUCT_ID, TIMESTAMP + 5000);
                
        const initEvents = await supplyChain.queryFilter(
            supplyChain.filters.InitProduct(1),
            0,
            "latest"
        );
        
        const updateEvents = await supplyChain.queryFilter(
            supplyChain.filters.UpdateProductState(1),
            0,
            "latest"
        );

        expect(initEvents.length).to.equal(1);
        expect(updateEvents.length).to.equal(6);

        // Participants table
        const participants = [
            { role: "Manufacturer", address: await manufacturer.getAddress() },
            { role: "Distributor", address: await distributor.getAddress() },
            { role: "Retailer", address: await retailer.getAddress() }
        ];
        console.log("\n====== Participants ======");
        console.table(participants);
        
        // Init event table
        const init = [{
            productId: Number(initEvents[0].args?.id),
            from: initEvents[0].args?.owner,
            timestamp: initEvents[0].args?.timestamp
        }];
        console.log("\n====== Init Product Info ======");
        console.table(init);

        // Update event table
        const history = updateEvents.map(e => {
            return {
                productId: Number(e.args?.id),
                state: Number(e.args?.newState),
                from: e.args?.from,
                to: e.args?.to,
                timestamp: e.args?.timestamp
            }
        });
        console.log("\n====== Product History Timeline ======");
        console.table(history);

        const finalInfo = await supplyChain.getProductInfo(PRODUCT_ID);
        expect(finalInfo.currentOwner).to.equal(ethers.ZeroAddress);
        expect(finalInfo.state).to.equal(6);
        expect(finalInfo.code).to.equal(PRODUCT_CODE);
    });
});