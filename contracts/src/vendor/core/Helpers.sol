// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

/* solhint-disable no-inline-assembly */

uint256 constant SIG_VALIDATION_FAILED = 1;
uint256 constant SIG_VALIDATION_SUCCESS = 0;

struct ValidationData {
    address aggregator;
    uint48 validAfter;
    uint48 validUntil;
}

function _parseValidationData(uint256 validationData) pure returns (ValidationData memory data) {
    // forge-lint: disable-next-line(unsafe-typecast)
    address aggregator = address(uint160(validationData));
    // forge-lint: disable-next-line(unsafe-typecast)
    uint48 validUntil = uint48(validationData >> 160);
    if (validUntil == 0) {
        validUntil = type(uint48).max;
    }
    // forge-lint: disable-next-line(unsafe-typecast)
    uint48 validAfter = uint48(validationData >> (48 + 160));
    return ValidationData({aggregator: aggregator, validAfter: validAfter, validUntil: validUntil});
}

function _packValidationData(ValidationData memory data) pure returns (uint256) {
    return uint160(data.aggregator) | (uint256(data.validUntil) << 160) | (uint256(data.validAfter) << (160 + 48));
}

function _packValidationData(bool sigFailed, uint48 validUntil, uint48 validAfter) pure returns (uint256) {
    return (sigFailed ? 1 : 0) | (uint256(validUntil) << 160) | (uint256(validAfter) << (160 + 48));
}

function calldataKeccak(bytes calldata data) pure returns (bytes32 ret) {
    assembly ("memory-safe") {
        let mem := mload(0x40)
        let len := data.length
        calldatacopy(mem, data.offset, len)
        ret := keccak256(mem, len)
    }
}

function min(uint256 a, uint256 b) pure returns (uint256) {
    return a < b ? a : b;
}
