import { ethers } from "ethers";
import SupplyChain from "../../../artifacts/contracts/SupplyChain.sol/SupplyChain.json";

// -----------------------------------------------------------------------------
// CONFIGURATION
// -----------------------------------------------------------------------------

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const STATE_MAP = [
  "None",
  "Manufacturing",
  "QC_Passed",
  "Packaged",
  "AtDistributor",
  "AtRetailer",
  "Sold",
];

// -----------------------------------------------------------------------------
// SERVICE FUNCTIONS
// -----------------------------------------------------------------------------

const generateTimeline = (stateIndex, currentOwnerName) => {
  const states = [
    { label: "Manufacturing", icon: "droplet", owner: "Manufacturer" },
    { label: "QC_Passed", icon: "dollar", owner: "Quality Control" },
    { label: "Packaged", icon: "package", owner: "Packaging Unit" },
    { label: "AtDistributor", icon: "truck", owner: "Distributor" },
    { label: "AtRetailer", icon: "funnel", owner: "Retailer" },
    { label: "Sold", icon: "leaf", owner: "Consumer" },
  ];


  let history = [];
  const maxIndex = stateIndex - 1; 

  if (stateIndex > 0) {
    for (let i = 0; i <= maxIndex && i < states.length; i++) {
      history.push({
        status: states[i].label,
        date: i === maxIndex ? "Current Stage" : "Completed",
        ownerCode: i === maxIndex ? currentOwnerName : "Passed",
        ownerName: i === maxIndex ? currentOwnerName : states[i].owner,
        icon: states[i].icon,
      });
    }
  }
  return history;
};

export const fetchBlockchainProduct = async (code) => {
  try {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      SupplyChain.abi,
      provider
    );

    console.log(
      `Calling Smart Contract at ${CONTRACT_ADDRESS} for ID: ${code}`
    );

    let id = code;
    try {
      id = await contract.getIdFromCode(code);
    } catch (err) {}

    const productRaw = await contract.getProductInfo(id);
    if (!productRaw[1]) {
      throw new Error("Product not found or empty data returned.");
    }
    console.log(productRaw);

    let participantName = "Unknown";
    let participantRole = "Unknown";
    if (productRaw[2] && productRaw[2] !== ethers.ZeroAddress) {
      try {
        const participantRaw = await contract.getParticipant(productRaw[2]);
        participantName = participantRaw[0];
        participantRole = participantRaw[1];
      } catch (err) {
        console.warn(
          "Could not fetch participant info (might be a raw address):",
          err
        );
        participantName = `${productRaw[2].slice(0, 6)}...${productRaw[2].slice(
          -4
        )}`;
      }
    } else if (productRaw[2] === ethers.ZeroAddress) {
      participantName = "Sold";
      participantRole = "Sold";
    }

    return {
      id: id,
      code: productRaw[0],
      name: productRaw[1],
      ownerAddress: productRaw[2],
      ownerName: participantName,
      ownerRole: participantRole,
      stateIndex: Number(productRaw[3]), // Convert BigInt to Number
      stateLabel: STATE_MAP[Number(productRaw[3])],
      ipfsHash: productRaw[4],
      timeline: generateTimeline(Number(productRaw[3]), participantName),
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
};
