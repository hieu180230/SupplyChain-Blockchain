import { ethers } from "ethers";
import SupplyChain from '../artifacts/SupplyChain.json';
import RoleManager from '../artifacts/RoleManager.json'
import axios from "axios";

// -----------------------------------------------------------------------------
// CONFIGURATION
// -----------------------------------------------------------------------------

const ROLE_MANAGER_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const SUPPLY_CHAIN_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
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

const getJsonFromPinata = async (cid) => {
    const url = `https://gateway.pinata.cloud/ipfs/${cid}`;

    try {
        const res = await axios.get(url);
        return res.data;
    } catch (err) {
        console.error("Error:", err.message);
        return null;
    }
}

export const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp * 1000); // Convert seconds to milliseconds

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours === 0 ? 12 : hours; // handle 0 as 12
  const hourStr = String(hours).padStart(2, '0');

  return `${month}/${day}/${year} ${hourStr}:${minutes}:${seconds} ${ampm}`;
};

const generateTimeline = async (role, logs) => {
  const states = [
    { label: "Manufacturing", icon: "droplet" },
    { label: "Quality Check Passed", icon: "dollar" },
    { label: "Packaged", icon: "package" },
    { label: "At Distributor", icon: "truck" },
    { label: "At Retailer", icon: "funnel" },
    { label: "Sold", icon: "leaf" },
  ];

  let history = [];
  for (let i = 0; i < logs.length && i < states.length; i++) {
      const state_id = Number(logs[i].args[1]);
      const from = await role.getParticipant(logs[i].args[2]);
      const to = logs[i].args[3] === ethers.ZeroAddress ? ["Sold"] : await role.getParticipant(logs[i].args[3]);
      const date = new Date(Number(logs[i].args[4]) * 1000);
      history.push({
        status: states[state_id - 1].label,
        date: formatTimestamp(Number(logs[i].args[4])),
        ownerName: from[0],
        nextOwner: to[0],
        icon: states[i].icon,
      });
    }
  return history;
};

export const fetchBlockchainProduct = async (code) => {
  try {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

    const contract = new ethers.Contract(
      SUPPLY_CHAIN_ADDRESS,
      SupplyChain.abi,
      provider
    );
    const role = new ethers.Contract(
      ROLE_MANAGER_ADDRESS,
      RoleManager.abi,
      provider
    );

    console.log(
      `Calling Smart Contract at ${SUPPLY_CHAIN_ADDRESS} for ID: ${code}`
    );

    //convert product code to id
    let id = code; //this is for debug only
    try {
      id = await contract.getIdFromCode(code);
    } catch (err) {}

    //get product state update logs and data
    const filter = contract.filters.UpdateProductState(id);
    const logs = await contract.queryFilter(filter);
    // console.log(await generateTimeline(role, logs));
    const productRaw = await contract.getProductInfo(id);
    if (!productRaw[1]) {
      throw new Error("Product not found or empty data returned.");
    }
    // console.log(productRaw);

    //get participant
    let participantName = "Unknown";
    let participantRole = "Unknown";
    if (productRaw[2] && productRaw[2] !== ethers.ZeroAddress) {
      try {
        const participantRaw = await role.getParticipant(productRaw[2]);
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

    const jsonObj = await getJsonFromPinata(productRaw[4]);
    // console.log(jsonObj);

    return {
      id: id,
      code: productRaw[0],
      name: productRaw[1],
      ownerAddress: productRaw[2],
      ownerName: participantName,
      ownerRole: participantRole,
      stateIndex: Number(productRaw[3]), // Convert BigInt to Number
      stateLabel: STATE_MAP[Number(productRaw[3])],
      brand: jsonObj.brand,
      category: jsonObj.category,
      cert: jsonObj.certification,
      origin: jsonObj.countryOfOrigin,
      expire: jsonObj.exp,
      storage_condition: jsonObj.storage_condition,
      batch_num: jsonObj.batch_number,
      timeline: await generateTimeline(role, logs),
      timestamp: Number(productRaw[5]),
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
};
