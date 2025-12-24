// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

contract RoleManager is AccessControl {
    /* ========== ROLES ========== */
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant RETAILER_ROLE   = keccak256("RETAILER_ROLE");

    /* ========== PARTICIPANT ========== */
    struct Participant {
        string name;
        bytes32 role; // lưu role chính (MANUFACTURER/DISTRIBUTOR/RETAILER)
    }
    mapping(address => Participant) public participants;

    /* ========== EVENTS ========== */
    event AddParticipant(address indexed account, bytes32 role, uint timestamp);
    event RemoveParticipant(address indexed account, bytes32 role, uint timestamp);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        participants[msg.sender] = Participant({
            name: "Admin",
            role: DEFAULT_ADMIN_ROLE
        });
    }

    /* ========== ADMIN FUNCTIONS ========== */
    function addParticipant(
        address _account,
        bytes32 _role,
        string calldata _name,
        uint _timestamp
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_account != address(0), "Invalid account");
        require(
            _role == MANUFACTURER_ROLE ||
            _role == DISTRIBUTOR_ROLE ||
            _role == RETAILER_ROLE,
            "Invalid role"
        );

        _grantRole(_role, _account);
        participants[_account] = Participant({
            name: _name,
            role: _role
        });

        emit AddParticipant(_account, _role, _timestamp);
    }

    function removeParticipant(
        address _account,
        bytes32 _role,
        uint _timestamp
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(hasRole(_role, _account), "No such role");
        _revokeRole(_role, _account);
        delete participants[_account];

        emit RemoveParticipant(_account, _role, _timestamp);
    }

    /* ========== VIEW FUNCTIONS ========== */
    function getParticipant(address _account) 
        external 
        view 
        returns (string memory name, string memory roleStr) 
    {
        Participant memory p = participants[_account];
        require(bytes(p.name).length > 0, "Participant not exist");

        if (p.role == MANUFACTURER_ROLE) roleStr = "Manufacturer";
        else if (p.role == DISTRIBUTOR_ROLE) roleStr = "Distributor";
        else if (p.role == RETAILER_ROLE)   roleStr = "Retailer";
        else roleStr = "None";

        return (p.name, roleStr);
    }

    /* ========== HELPERS (dùng cho contract khác inherit hoặc call) ========== */
    function isManufacturer(address _account) external view returns (bool) {
        return hasRole(MANUFACTURER_ROLE, _account);
    }

    function isDistributor(address _account) external view returns (bool) {
        return hasRole(DISTRIBUTOR_ROLE, _account);
    }

    function isRetailer(address _account) external view returns (bool) {
        return hasRole(RETAILER_ROLE, _account);
    }
}