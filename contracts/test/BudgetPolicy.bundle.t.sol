// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {BudgetPolicy} from "../src/policies/BudgetPolicy.sol";
import {PackedUserOperation} from "../src/vendor/interfaces/PackedUserOperation.sol";

/**
 * @title BudgetPolicyBundleTest
 * @notice Same-bundle / same-block overshoot: check is view; recordSpend runs after execution.
 */
contract BudgetPolicyBundleTest is Test {
    BudgetPolicy public policy;
    address public account;
    address public owner;

    uint256 constant MAX_DAILY = 1e6;

    function setUp() public {
        account = makeAddr("account");
        owner = makeAddr("owner");
        policy = new BudgetPolicy(account, owner, 0, MAX_DAILY, 0, 0, 0, 0, 0);
    }

    function _transferExecuteCalldata(uint256 amount) internal returns (bytes memory) {
        return abi.encodeWithSignature(
            "execute(address,uint256,bytes)",
            makeAddr("token"),
            0,
            abi.encodeWithSignature("transfer(address,uint256)", makeAddr("recipient"), amount)
        );
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

    /// @dev Simulates two UserOps validated before either records spend (ERC-4337 bundle TOCTOU).
    function test_BundleTwoUserOpsOvershootDailyCap() public {
        bytes memory callData1 = _transferExecuteCalldata(0.6e6);
        bytes memory callData2 = _transferExecuteCalldata(0.6e6);

        assertEq(policy.check(_makeUserOp(callData1)), 0);
        assertEq(policy.check(_makeUserOp(callData2)), 0);

        vm.startPrank(account);
        policy.recordSpend(callData1);
        policy.recordSpend(callData2);
        vm.stopPrank();

        assertGt(policy.spentDaily(), MAX_DAILY);
        assertEq(policy.check(_makeUserOp(_transferExecuteCalldata(1))), 1);
    }

    function test_ExecuteBatchCheckRejectsSumOverDailyCap() public {
        address[] memory dests = new address[](2);
        dests[0] = makeAddr("token1");
        dests[1] = makeAddr("token2");
        uint256[] memory values = new uint256[](2);
        values[0] = 0;
        values[1] = 0;
        bytes[] memory funcs = new bytes[](2);
        funcs[0] = abi.encodeWithSignature("transfer(address,uint256)", makeAddr("r1"), 0.6e6);
        funcs[1] = abi.encodeWithSignature("transfer(address,uint256)", makeAddr("r2"), 0.6e6);

        bytes memory batchCalldata =
            abi.encodeWithSignature("executeBatch(address[],uint256[],bytes[])", dests, values, funcs);

        assertEq(policy.check(_makeUserOp(batchCalldata)), 1);
    }

    function test_OwnerDoubleExecuteOvershootsWithoutCheck() public {
        vm.startPrank(account);
        policy.recordSpend(_transferExecuteCalldata(0.6e6));
        policy.recordSpend(_transferExecuteCalldata(0.6e6));
        vm.stopPrank();

        assertGt(policy.spentDaily(), MAX_DAILY);
    }

    function testFuzz_CheckUsesCurrentSpentBeforeRecord(uint256 a, uint256 b) public {
        a = bound(a, 1, MAX_DAILY);
        b = bound(b, 1, MAX_DAILY);
        vm.assume(a + b > MAX_DAILY);

        bytes memory c1 = _transferExecuteCalldata(a);
        bytes memory c2 = _transferExecuteCalldata(b);

        assertEq(policy.check(_makeUserOp(c1)), 0);
        assertEq(policy.check(_makeUserOp(c2)), 0);

        vm.startPrank(account);
        policy.recordSpend(c1);
        policy.recordSpend(c2);
        vm.stopPrank();

        assertGt(policy.spentDaily(), MAX_DAILY);
    }
}
