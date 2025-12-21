import { expect } from "chai";
import { network } from "hardhat";
import { SupplyChain } from "../types/ethers-contracts/index.js";
import { Signer } from "ethers";

const { ethers } = await network.connect();

describe("SupplyChain", () => {
    let supplyChain: SupplyChain;
    let manufacturer: Signer, distributor: Signer, retailer: Signer;
    before(async function() {
        [manufacturer, distributor, retailer] = await ethers.getSigners();
        supplyChain = await ethers.deployContract("SupplyChain");

        await supplyChain.grantRole(await supplyChain.MANUFACTURER_ROLE(), manufacturer);
        await supplyChain.grantRole(await supplyChain.DISTRIBUTOR_ROLE(), distributor);
        await supplyChain.grantRole(await supplyChain.RETAILER_ROLE(), retailer);
    });

    it("Should track the full supply chain process and emit all events correctly", async () => {
        const deploymentBlock = await ethers.provider.getBlockNumber();
        const PRODUCT_CODE = "SUNSCREEN-ROH-20251014-X7V";
        const PRODUCT_NAME = "Sunplay Skin Aqua";
        const IPFS_HASH = "QmTestHash12345";
        
        // --- 1. initProduct (Manufacturer) ---
        await supplyChain.connect(manufacturer).initProduct(PRODUCT_CODE, PRODUCT_NAME, IPFS_HASH, 1730001000);
        
        const PRODUCT_ID = await supplyChain.getIdFromCode(PRODUCT_CODE);
        expect(PRODUCT_ID).to.equal(1);
        
        // --- 2. passQC (Manufacturer) ---
        await supplyChain.connect(manufacturer).passQC(PRODUCT_ID, 1730002000);

        // --- 3. packageProduct (Manufacturer) ---
        await supplyChain.connect(manufacturer).packageProduct(PRODUCT_ID, 1730003000);
                
        // --- 4. transferToDistributor (Manufacturer) ---
        await supplyChain.connect(manufacturer).transferToDistributor(PRODUCT_ID, distributor.getAddress(), 1730004000);
                
        // --- 5. transferToRetailer (Distributor) ---
        await supplyChain.connect(distributor).transferToRetailer(PRODUCT_ID, retailer.getAddress(), 1730005000);
                
        // --- 6. sellToConsumer (Retailer) ---
        await supplyChain.connect(retailer).sellToConsumer(PRODUCT_ID, 1730006000);
                
        const updateEvents = await supplyChain.queryFilter(
            supplyChain.filters.UpdateProductState(1),
            deploymentBlock,
            "latest"
        );

        const initEvents = await supplyChain.queryFilter(
            supplyChain.filters.InitProduct(1),
            deploymentBlock,
            "latest"
        );

        const sorted = updateEvents.sort((a, b) => Number(a.blockNumber) - Number(b.blockNumber));

        // Build readable history
        const init = [{
            type: "InitProduct",
            productId: Number(initEvents[0].args?.id),
            from: initEvents[0].args?.owner,
            timestamp: initEvents[0].args?.timestamp
        }]
        const history = [];

        for (const e of sorted) {
            const block = await ethers.provider.getBlock(e.blockNumber);
            const ts = block?.timestamp ?? 0;

            history.push({
                type: "UpdateProductState",
                productId: Number(e.args?.id),
                state: Number(e.args?.newState),
                from: e.args?.from,
                to: e.args?.to,
                timestamp: e.args?.timestamp
            });
        }

        const participants = [
            { role: "Manufacturer", address: await manufacturer.getAddress() },
            { role: "Distributor", address: await distributor.getAddress() },
            { role: "Retailer", address: await retailer.getAddress() }
        ];
        console.log("\n====== Participants ======");
        console.table(participants);

        console.log("\n====== Init Product Info ======");
        console.table(init);

        console.log("\n====== Product History Timeline ======");
        console.table(history);

        // Basic checks
        expect(history.length).to.equal(6);
        expect(history[history.length - 1].state).to.equal(6); // Sold
    });
});