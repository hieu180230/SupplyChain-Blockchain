import { network } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";
import * as fs from "fs";
import { parse } from "csv-parse";

const { ethers } = await network.connect();
const accounts = await ethers.getSigners();
const admin = accounts[0];

const MANUFACTURER_ROLE = keccak256(toUtf8Bytes("MANUFACTURER_ROLE"));
const DISTRIBUTOR_ROLE = keccak256(toUtf8Bytes("DISTRIBUTOR_ROLE"));
const RETAILER_ROLE = keccak256(toUtf8Bytes("RETAILER_ROLE"));

const SUPPLY_CHAIN_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const supplyChain = await ethers.getContractAt("SupplyChain", SUPPLY_CHAIN_ADDRESS);

async function main() {
    const records: any[] = [];

    fs.createReadStream("data/participants.csv")
    .pipe(parse({ columns: true, trim: true }))
    .on("data", (row) => {
        records.push(row);
    })
    .on("end", async () => {
        console.log("Parsed CSV:", records);

        for(let i = 0;i < records.length;i++) {
            let role;
            if (records[i].role === "Manufacturer") role = MANUFACTURER_ROLE;
            else if (records[i].role === "Distributor") role = DISTRIBUTOR_ROLE;
            else if (records[i].role === "Retailer") role = RETAILER_ROLE;

            if (role) { 
                console.log(`Granting ${records[i].role} → ${records[i].name}: ${await accounts[i + 1].getAddress()}`);
                await supplyChain.connect(admin).addParticipant(
                    await accounts[i + 1].getAddress(),
                    role,
                    records[i].name,
                    173000000
                );
            }
        }
    });    
}

main();