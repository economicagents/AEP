// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {AEPTestBase, ReceiveHelper} from "./helpers/AEPTestHelpers.sol";
import {AEPAccount} from "../src/AEPAccount.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IEntryPoint} from "../src/vendor/interfaces/IEntryPoint.sol";

/**
 * @title AEPAccountUpgradeTest
 * @notice UUPS / initializer / reinit paths on AEPAccount.
 */
contract AEPAccountUpgradeTest is AEPTestBase {
    address public account;

    function setUp() public {
        _deployCore();
        account = _deployAccount(bytes32(uint256(400)));
    }

    function test_ImplementationInitializeReverts() public {
        vm.expectRevert();
        implementation.initialize(owner);
    }

    function test_ProxyDoubleInitializeReverts() public {
        vm.expectRevert();
        AEPAccount(payable(account)).initialize(makeAddr("other"));
    }

    function test_OwnerCanUpgradeUUPS() public {
        AEPAccount newImpl = new AEPAccount(IEntryPoint(address(entryPoint)));
        vm.prank(owner);
        AEPAccount(payable(account)).upgradeToAndCall(address(newImpl), "");
        assertEq(AEPAccount(payable(account)).owner(), owner);
    }

    function test_NonOwnerUpgradeReverts() public {
        AEPAccount newImpl = new AEPAccount(IEntryPoint(address(entryPoint)));
        vm.prank(makeAddr("attacker"));
        vm.expectRevert(AEPAccount.AEPAccountNotOwner.selector);
        AEPAccount(payable(account)).upgradeToAndCall(address(newImpl), "");
    }

    function test_InitializeWithModulesSkipsZeroAddress() public {
        address module = address(new ReceiveHelper());
        address[] memory modules = new address[](2);
        modules[0] = address(0);
        modules[1] = module;

        address proxyAccount = factory.deployAccountWithModules(owner, bytes32(uint256(401)), modules);
        assertEq(AEPAccount(payable(proxyAccount)).getPolicyModulesLength(), 1);
        assertTrue(AEPAccount(payable(proxyAccount)).isPolicyModule(module));
    }

    function test_InitializeWithModulesDuplicateRevertsAlreadyAdded() public {
        address module = address(new ReceiveHelper());
        address[] memory modules = new address[](2);
        modules[0] = module;
        modules[1] = module;

        bytes memory initData = abi.encodeWithSelector(AEPAccount.initializeWithModules.selector, owner, modules);
        vm.expectRevert(AEPAccount.AEPAccountAlreadyAdded.selector);
        new ERC1967Proxy(address(implementation), initData);
    }

    function test_UpgradePreservesOwnerAndModules() public {
        uint256 moduleLen = AEPAccount(payable(account)).getPolicyModulesLength();
        address mod0 = AEPAccount(payable(account)).policyModules(0);

        AEPAccount newImpl = new AEPAccount(IEntryPoint(address(entryPoint)));
        vm.prank(owner);
        AEPAccount(payable(account)).upgradeToAndCall(address(newImpl), "");

        assertEq(AEPAccount(payable(account)).owner(), owner);
        assertEq(AEPAccount(payable(account)).getPolicyModulesLength(), moduleLen);
        assertEq(AEPAccount(payable(account)).policyModules(0), mod0);
    }
}
