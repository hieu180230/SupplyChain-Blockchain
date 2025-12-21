import { network } from "hardhat";
import fs from "fs";
import { parse } from "csv-parse/sync";

const { ethers } = await network.connect();
const accounts = await ethers.getSigners();
const admin = accounts[0];

const SUPPLY_CHAIN_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const supplyChain = await ethers.getContractAt("SupplyChain", SUPPLY_CHAIN_ADDRESS);

async function loadCSV(path: string) {
    const file = fs.readFileSync(path);
    return parse(file, { columns: true, trim: true});
}


async function main() {
    const products = await loadCSV("data/products.csv");
    const history = await loadCSV("data/history_product.csv"); 


    for (let i = 0;i < products.length; i++) {
        console.log("i: ", i);
        // Init 
        if (!history[i].history1_owner) continue;
        console.log("Init");
        await supplyChain.connect(accounts[Number(history[i].history1_owner)]).initProduct(
            history[i].product_id, 
            products[i].product_name, 
            products[i].cid, 
            Number(history[i].history1_time)
        );

        const productIdOnChain = await supplyChain.getIdFromCode(history[i].product_id);
        console.log("Product ID On-chain: ", productIdOnChain);

        // Pass QC
        if (!history[i].history2_owner) continue;
        console.log("Pass QC");
        await supplyChain.connect(accounts[Number(history[i].history2_owner)]).passQC(
            productIdOnChain, 
            Number(history[i].history2_time)
        );
        
        // Package product
        if (!history[i].history3_owner) continue;
        console.log("Package");
        await supplyChain.connect(accounts[Number(history[i].history2_owner)]).packageProduct(
            productIdOnChain, 
            Number(history[i].history3_time)
        );

        // Transfer to Distributor
        if (!history[i].history4_owner) continue;
        console.log("Transfer to Distributor");
        await supplyChain.connect(accounts[Number(history[i].history3_owner)]).transferToDistributor(
            productIdOnChain,
            accounts[Number(history[i].history4_owner)].getAddress(),
            Number(history[i].history4_time)
        );

        // Transfer to Retailer
        if (!history[i].history5_owner) continue;
        console.log("Transfer to Retailer");
        await supplyChain.connect(accounts[Number(history[i].history4_owner)]).transferToRetailer(
            productIdOnChain,
            accounts[Number(history[i].history5_owner)].getAddress(),
            Number(history[i].history5_time)
        );

        // Sell to Consumer
        if (!history[i].history6_owner) continue;
        console.log("Sell To Consumer");
        await supplyChain.connect(accounts[Number(history[i].history5_owner)]).sellToConsumer(
            productIdOnChain,
            Number(history[i].history6_time)
        );
    }
    console.log("Completed");
    // console.log(history);
}

main();