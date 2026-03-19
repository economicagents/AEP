// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {PaymentDecoder} from "../src/libraries/PaymentDecoder.sol";

contract PaymentDecoderHelper {
    function decode(bytes calldata callData) external pure returns (PaymentDecoder.PaymentInfo memory) {
        return PaymentDecoder.decode(callData);
    }
}

contract PaymentDecoderTest is Test {
    PaymentDecoderHelper helper = new PaymentDecoderHelper();

    function test_DecodeExecuteWithValue() public {
        address dest = makeAddr("dest");
        uint256 value = 1e6;
        bytes memory data = "";
        bytes memory callData = abi.encodeWithSignature("execute(address,uint256,bytes)", dest, value, data);

        PaymentDecoder.PaymentInfo memory info = helper.decode(callData);
        assertEq(info.totalAmount, value);
        assertEq(info.recipients.length, 1);
        assertEq(info.recipients[0], dest);
    }

    function test_DecodeExecuteWithTransfer() public {
        address dest = makeAddr("token");
        address to = makeAddr("to");
        uint256 amount = 0.5e6;
        bytes memory inner = abi.encodeWithSignature("transfer(address,uint256)", to, amount);
        bytes memory callData = abi.encodeWithSignature("execute(address,uint256,bytes)", dest, 0, inner);

        PaymentDecoder.PaymentInfo memory info = helper.decode(callData);
        assertEq(info.totalAmount, amount);
        assertEq(info.recipients.length, 1);
        assertEq(info.recipients[0], to);
    }

    function test_DecodeExecuteWithTransferFrom() public {
        address dest = makeAddr("token");
        address from = makeAddr("from");
        address to = makeAddr("to");
        uint256 amount = 2e6;
        bytes memory inner = abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount);
        bytes memory callData = abi.encodeWithSignature("execute(address,uint256,bytes)", dest, 0, inner);

        PaymentDecoder.PaymentInfo memory info = helper.decode(callData);
        assertEq(info.totalAmount, amount);
        assertEq(info.recipients.length, 1);
        assertEq(info.recipients[0], to);
    }

    function test_DecodeExecuteBatch() public {
        address[] memory dests = new address[](2);
        dests[0] = makeAddr("d1");
        dests[1] = makeAddr("d2");
        uint256[] memory values = new uint256[](2);
        values[0] = 0.3e6;
        values[1] = 0.7e6;
        bytes[] memory funcs = new bytes[](2);
        funcs[0] = "";
        funcs[1] = "";

        bytes memory callData =
            abi.encodeWithSignature("executeBatch(address[],uint256[],bytes[])", dests, values, funcs);
        PaymentDecoder.PaymentInfo memory info = helper.decode(callData);

        assertEq(info.totalAmount, 1e6);
        assertEq(info.recipients.length, 2);
        assertEq(info.recipients[0], dests[0]);
        assertEq(info.recipients[1], dests[1]);
    }

    function test_DecodeExecuteBatchWithTransfer() public {
        address[] memory dests = new address[](2);
        dests[0] = makeAddr("token1");
        dests[1] = makeAddr("token2");
        uint256[] memory values = new uint256[](2);
        values[0] = 0;
        values[1] = 0;
        bytes[] memory funcs = new bytes[](2);
        funcs[0] = abi.encodeWithSignature("transfer(address,uint256)", makeAddr("r1"), 0.4e6);
        funcs[1] = abi.encodeWithSignature("transfer(address,uint256)", makeAddr("r2"), 0.6e6);

        bytes memory callData =
            abi.encodeWithSignature("executeBatch(address[],uint256[],bytes[])", dests, values, funcs);
        PaymentDecoder.PaymentInfo memory info = helper.decode(callData);

        assertEq(info.totalAmount, 1e6);
        assertEq(info.recipients.length, 2);
        assertEq(info.recipients[0], makeAddr("r1"));
        assertEq(info.recipients[1], makeAddr("r2"));
    }

    function test_DecodeEmptyReturnsZero() public view {
        bytes memory callData = "";
        PaymentDecoder.PaymentInfo memory info = helper.decode(callData);
        assertEq(info.totalAmount, 0);
        assertEq(info.recipients.length, 0);
    }

    function test_DecodeShortCalldataReturnsZero() public view {
        bytes memory callData = hex"1234";
        PaymentDecoder.PaymentInfo memory info = helper.decode(callData);
        assertEq(info.totalAmount, 0);
    }

    function test_DecodeUnknownSelectorReturnsZero() public view {
        bytes memory callData = abi.encodeWithSignature("unknown()");
        PaymentDecoder.PaymentInfo memory info = helper.decode(callData);
        assertEq(info.totalAmount, 0);
    }
}
