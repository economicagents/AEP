// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

/**
 * @title PaymentDecoder
 * @notice Decodes payment amount and recipients from AEPAccount execute/executeBatch calldata.
 */
library PaymentDecoder {
    bytes4 constant EXECUTE_SELECTOR = bytes4(keccak256("execute(address,uint256,bytes)"));
    bytes4 constant EXECUTE_BATCH_SELECTOR = bytes4(keccak256("executeBatch(address[],uint256[],bytes[])"));
    bytes4 constant TRANSFER_SELECTOR = bytes4(keccak256("transfer(address,uint256)"));
    bytes4 constant TRANSFER_FROM_SELECTOR = bytes4(keccak256("transferFrom(address,address,uint256)"));

    struct PaymentInfo {
        uint256 totalAmount;
        address[] recipients;
    }

    function decode(bytes calldata callData) internal pure returns (PaymentInfo memory info) {
        if (callData.length < 4) return info;

        bytes4 selector = bytes4(
            uint32(uint8(callData[0])) << 24 | uint32(uint8(callData[1])) << 16 | uint32(uint8(callData[2])) << 8
                | uint32(uint8(callData[3]))
        );

        bytes memory payload = _copyCalldata(callData, 4);
        if (selector == EXECUTE_SELECTOR) {
            (address dest, uint256 value, bytes memory data) = abi.decode(payload, (address, uint256, bytes));
            if (data.length >= 4) {
                bytes4 innerSelector = bytes4(bytes.concat(data[0], data[1], data[2], data[3]));
                if (innerSelector == TRANSFER_SELECTOR) {
                    (address to, uint256 amount) = abi.decode(_slice(data, 4), (address, uint256));
                    info.totalAmount = amount;
                    info.recipients = new address[](1);
                    info.recipients[0] = to;
                } else if (innerSelector == TRANSFER_FROM_SELECTOR) {
                    (, address to, uint256 amount) = abi.decode(_slice(data, 4), (address, address, uint256));
                    info.totalAmount = amount;
                    info.recipients = new address[](1);
                    info.recipients[0] = to;
                } else {
                    info.totalAmount = value;
                    info.recipients = new address[](1);
                    info.recipients[0] = dest;
                }
            } else {
                info.totalAmount = value;
                info.recipients = new address[](1);
                info.recipients[0] = dest;
            }
        } else if (selector == EXECUTE_BATCH_SELECTOR) {
            (address[] memory dests, uint256[] memory values, bytes[] memory funcs) =
                abi.decode(payload, (address[], uint256[], bytes[]));
            uint256 len = dests.length;
            info.recipients = new address[](len);
            for (uint256 i = 0; i < len; i++) {
                if (funcs[i].length >= 4) {
                    bytes memory f = funcs[i];
                    bytes4 innerSelector = bytes4(bytes.concat(f[0], f[1], f[2], f[3]));
                    if (innerSelector == TRANSFER_SELECTOR) {
                        (address to, uint256 amount) = abi.decode(_slice(f, 4), (address, uint256));
                        info.totalAmount += amount;
                        info.recipients[i] = to;
                    } else if (innerSelector == TRANSFER_FROM_SELECTOR) {
                        (, address to, uint256 amount) = abi.decode(_slice(f, 4), (address, address, uint256));
                        info.totalAmount += amount;
                        info.recipients[i] = to;
                    } else {
                        info.totalAmount += values.length > 0 ? values[i] : 0;
                        info.recipients[i] = dests[i];
                    }
                } else {
                    info.totalAmount += values.length > 0 ? values[i] : 0;
                    info.recipients[i] = dests[i];
                }
            }
        }
        return info;
    }

    function _slice(bytes memory data, uint256 start) private pure returns (bytes memory) {
        uint256 len = data.length - start;
        bytes memory result = new bytes(len);
        for (uint256 i = 0; i < len; i++) {
            result[i] = data[start + i];
        }
        return result;
    }

    function _copyCalldata(bytes calldata src, uint256 start) private pure returns (bytes memory) {
        uint256 len = src.length - start;
        bytes memory result = new bytes(len);
        for (uint256 i = 0; i < len; i++) {
            result[i] = src[start + i];
        }
        return result;
    }
}
