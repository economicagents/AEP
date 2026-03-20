// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

/* solhint-disable no-inline-assembly */

import {PackedUserOperation} from "../interfaces/PackedUserOperation.sol";
import {calldataKeccak, min} from "./Helpers.sol";

library UserOperationLib {
    uint256 public constant PAYMASTER_VALIDATION_GAS_OFFSET = 20;
    uint256 public constant PAYMASTER_POSTOP_GAS_OFFSET = 36;
    uint256 public constant PAYMASTER_DATA_OFFSET = 52;

    function getSender(PackedUserOperation calldata userOp) internal pure returns (address) {
        address data;
        assembly {
            data := calldataload(userOp)
        }
        return address(uint160(data));
    }

    function gasPrice(PackedUserOperation calldata userOp) internal view returns (uint256) {
        unchecked {
            (uint256 maxPriorityFeePerGas, uint256 maxFeePerGas) = unpackUints(userOp.gasFees);
            if (maxFeePerGas == maxPriorityFeePerGas) {
                return maxFeePerGas;
            }
            return min(maxFeePerGas, maxPriorityFeePerGas + block.basefee);
        }
    }

    function encode(PackedUserOperation calldata userOp) internal pure returns (bytes memory ret) {
        address sender = getSender(userOp);
        uint256 nonce = userOp.nonce;
        bytes32 hashInitCode = calldataKeccak(userOp.initCode);
        bytes32 hashCallData = calldataKeccak(userOp.callData);
        bytes32 accountGasLimits = userOp.accountGasLimits;
        uint256 preVerificationGas = userOp.preVerificationGas;
        bytes32 gasFees = userOp.gasFees;
        bytes32 hashPaymasterAndData = calldataKeccak(userOp.paymasterAndData);

        return abi.encode(
            sender,
            nonce,
            hashInitCode,
            hashCallData,
            accountGasLimits,
            preVerificationGas,
            gasFees,
            hashPaymasterAndData
        );
    }

    function unpackUints(bytes32 packed) internal pure returns (uint256 high128, uint256 low128) {
        // forge-lint: disable-next-line(unsafe-typecast)
        return (uint128(bytes16(packed)), uint128(uint256(packed)));
    }

    function unpackHigh128(bytes32 packed) internal pure returns (uint256) {
        return uint256(packed) >> 128;
    }

    function unpackLow128(bytes32 packed) internal pure returns (uint256) {
        return uint128(uint256(packed));
    }

    function unpackMaxPriorityFeePerGas(PackedUserOperation calldata userOp) internal pure returns (uint256) {
        return unpackHigh128(userOp.gasFees);
    }

    function unpackMaxFeePerGas(PackedUserOperation calldata userOp) internal pure returns (uint256) {
        return unpackLow128(userOp.gasFees);
    }

    function unpackVerificationGasLimit(PackedUserOperation calldata userOp) internal pure returns (uint256) {
        return unpackHigh128(userOp.accountGasLimits);
    }

    function unpackCallGasLimit(PackedUserOperation calldata userOp) internal pure returns (uint256) {
        return unpackLow128(userOp.accountGasLimits);
    }

    function unpackPaymasterVerificationGasLimit(PackedUserOperation calldata userOp) internal pure returns (uint256) {
        return uint128(bytes16(userOp.paymasterAndData[PAYMASTER_VALIDATION_GAS_OFFSET:PAYMASTER_POSTOP_GAS_OFFSET]));
    }

    function unpackPostOpGasLimit(PackedUserOperation calldata userOp) internal pure returns (uint256) {
        return uint128(bytes16(userOp.paymasterAndData[PAYMASTER_POSTOP_GAS_OFFSET:PAYMASTER_DATA_OFFSET]));
    }

    function unpackPaymasterStaticFields(bytes calldata paymasterAndData)
        internal
        pure
        returns (address paymaster, uint256 validationGasLimit, uint256 postOpGasLimit)
    {
        return (
            address(bytes20(paymasterAndData[:PAYMASTER_VALIDATION_GAS_OFFSET])),
            uint128(bytes16(paymasterAndData[PAYMASTER_VALIDATION_GAS_OFFSET:PAYMASTER_POSTOP_GAS_OFFSET])),
            uint128(bytes16(paymasterAndData[PAYMASTER_POSTOP_GAS_OFFSET:PAYMASTER_DATA_OFFSET]))
        );
    }

    function hash(PackedUserOperation calldata userOp) internal pure returns (bytes32) {
        // forge-lint: disable-next-line(asm-keccak256)
        return keccak256(encode(userOp));
    }
}
