// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {AEPTestBase, ReceiveHelper} from "./helpers/AEPTestHelpers.sol";
import {AEPAccount} from "../src/AEPAccount.sol";
import {IEntryPoint} from "../src/vendor/interfaces/IEntryPoint.sol";
import {SIG_VALIDATION_FAILED} from "../src/vendor/core/Helpers.sol";

/**
 * @title AEPAccountFrozenTest
 * @notice frozen blocks spend + withdrawDepositTo; admin paths remain available.
 */
contract AEPAccountFrozenTest is AEPTestBase {
    address public account;

    function setUp() public {
        _deployCore();
        account = _deployAccount(bytes32(uint256(300)));
        vm.deal(account, 2 ether);
    }

    function test_FrozenAllowsSetOwner() public {
        address newOwner = makeAddr("newOwner");
        vm.startPrank(owner);
        AEPAccount(payable(account)).setFrozen(true);
        AEPAccount(payable(account)).setOwner(newOwner);
        vm.stopPrank();
        assertEq(AEPAccount(payable(account)).owner(), newOwner);
    }

    function test_FrozenAllowsAddRemovePolicyModule() public {
        address module = address(new ReceiveHelper());
        vm.startPrank(owner);
        AEPAccount(payable(account)).setFrozen(true);
        uint256 lenBefore = AEPAccount(payable(account)).getPolicyModulesLength();
        AEPAccount(payable(account)).addPolicyModule(module);
        assertEq(AEPAccount(payable(account)).getPolicyModulesLength(), lenBefore + 1);
        AEPAccount(payable(account)).removePolicyModule(module);
        assertEq(AEPAccount(payable(account)).getPolicyModulesLength(), lenBefore);
        vm.stopPrank();
    }

    function test_FrozenAllowsUnfreeze() public {
        vm.startPrank(owner);
        AEPAccount(payable(account)).setFrozen(true);
        AEPAccount(payable(account)).setFrozen(false);
        AEPAccount(payable(account)).execute(makeAddr("r"), 0.01 ether, "");
        vm.stopPrank();
        assertEq(makeAddr("r").balance, 0.01 ether);
    }

    function test_FrozenBlocksValidateUserOp() public {
        vm.prank(owner);
        AEPAccount(payable(account)).setFrozen(true);

        bytes memory callData = abi.encodeWithSignature("execute(address,uint256,bytes)", makeAddr("dest"), 0, "");
        bytes32 userOpHash = keccak256("frozen-userop");
        uint256 validationData = _validateUserOp(account, _makeExecuteUserOp(account, callData), userOpHash);
        _expectValidationFailed(validationData);
    }

    function test_FrozenAllowsAddDeposit() public {
        vm.startPrank(owner);
        AEPAccount(payable(account)).setFrozen(true);
        vm.stopPrank();

        vm.deal(account, 1 ether);
        AEPAccount(payable(account)).addDeposit{value: 0.5 ether}();
        assertEq(AEPAccount(payable(account)).getDeposit(), 0.5 ether);
    }

    function test_FrozenOwnerCanUpgrade() public {
        AEPAccount newImpl = new AEPAccount(IEntryPoint(address(entryPoint)));
        vm.startPrank(owner);
        AEPAccount(payable(account)).setFrozen(true);
        AEPAccount(payable(account)).upgradeToAndCall(address(newImpl), "");
        vm.stopPrank();

        assertTrue(AEPAccount(payable(account)).frozen());
        assertEq(AEPAccount(payable(account)).owner(), owner);
    }
}
