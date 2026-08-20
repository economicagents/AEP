// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {CounterpartyPolicy} from "../src/policies/CounterpartyPolicy.sol";
import {PaymentDecoder} from "../src/libraries/PaymentDecoder.sol";
import {PaymentDecoderHelper} from "./PaymentDecoder.t.sol";
import {PackedUserOperation} from "../src/vendor/interfaces/PackedUserOperation.sol";

/**
 * @title CounterpartyPolicyInvariantTest
 * @notice Invariant: allowlist/denylist honored on UserOp decode path.
 */
contract CounterpartyPolicyInvariantTest is Test {
    CounterpartyPolicy public policy;
    PaymentDecoderHelper public decoderHelper;
    address public account;
    address public owner;

    function setUp() public {
        account = makeAddr("account");
        owner = makeAddr("owner");
        policy = new CounterpartyPolicy(account, owner);
        decoderHelper = new PaymentDecoderHelper();
    }

    function _makeUserOp(bytes memory callData) internal view returns (PackedUserOperation memory) {
        return PackedUserOperation({
            sender: account,
            nonce: 0,
            initCode: "",
            callData: callData,
            accountGasLimits: bytes32(0),
            preVerificationGas: 0,
            gasFees: bytes32(0),
            paymasterAndData: "",
            signature: ""
        });
    }

    function _transferExecuteCalldata(address recipient, uint256 amount) internal pure returns (bytes memory) {
        return abi.encodeWithSignature(
            "execute(address,uint256,bytes)",
            address(0xBEEF),
            0,
            abi.encodeWithSignature("transfer(address,uint256)", recipient, amount)
        );
    }

    function testFuzz_BlockListDeniesUserOp(address blocked, address allowed) public {
        vm.assume(blocked != allowed);
        vm.assume(blocked != address(0));

        vm.prank(owner);
        policy.addToBlockList(blocked);

        assertEq(policy.check(_makeUserOp(_transferExecuteCalldata(blocked, 1))), 1);
        assertEq(policy.check(_makeUserOp(_transferExecuteCalldata(allowed, 1))), 0);
    }

    function testFuzz_AllowListHonoredOnUserOpPath(address allowed, address denied) public {
        vm.assume(allowed != denied);
        vm.assume(allowed != address(0));
        vm.assume(denied != address(0));

        vm.startPrank(owner);
        policy.setUseAllowList(true);
        policy.addToAllowList(allowed);
        vm.stopPrank();

        assertEq(policy.check(_makeUserOp(_transferExecuteCalldata(allowed, 1))), 0);
        assertEq(policy.check(_makeUserOp(_transferExecuteCalldata(denied, 1))), 1);
    }

    function testFuzz_DecodedRecipientsMatchTransfer(address recipient, uint256 amount) public {
        recipient = address(uint160(bound(uint160(recipient), 1, type(uint160).max)));
        amount = bound(amount, 0, type(uint128).max);

        bytes memory callData = _transferExecuteCalldata(recipient, amount);
        PaymentDecoder.PaymentInfo memory info = decoderHelper.decode(callData);

        assertEq(info.recipients.length, 1);
        assertEq(info.recipients[0], recipient);
        assertEq(info.totalAmount, amount);
    }
}
