// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {IERC8004Validation} from "../src/interfaces/IERC8004Validation.sol";

/**
 * @title MockERC8004Validation
 * @notice Mock Validation Registry for Phase 3 escrow and SLA tests.
 */
contract MockERC8004Validation is IERC8004Validation {
    struct Status {
        address validatorAddress;
        uint256 agentId;
        uint8 response;
        bytes32 responseHash;
        string tag;
        uint256 lastUpdate;
    }

    mapping(bytes32 => Status) public validations;

    function setValidation(bytes32 requestHash, address validatorAddress, uint256 agentId, uint8 response) external {
        validations[requestHash] = Status({
            validatorAddress: validatorAddress,
            agentId: agentId,
            response: response,
            responseHash: bytes32(0),
            tag: "",
            lastUpdate: block.timestamp
        });
    }

    function getValidationStatus(bytes32 requestHash)
        external
        view
        override
        returns (
            address validatorAddress,
            uint256 agentId,
            uint8 response,
            bytes32 responseHash,
            string memory tag,
            uint256 lastUpdate
        )
    {
        Status memory s = validations[requestHash];
        require(s.agentId != 0 || s.response != 0 || s.validatorAddress != address(0), "unknown");
        return (s.validatorAddress, s.agentId, s.response, s.responseHash, s.tag, s.lastUpdate);
    }
}
