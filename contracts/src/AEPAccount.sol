// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

/* solhint-disable avoid-low-level-calls */
/* solhint-disable no-inline-assembly */

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {BaseAccount} from "./vendor/core/BaseAccount.sol";
import {SIG_VALIDATION_FAILED} from "./vendor/core/Helpers.sol";
import {TokenCallbackHandler} from "./vendor/callback/TokenCallbackHandler.sol";
import {IPolicyModule} from "./interfaces/IPolicyModule.sol";
import {PackedUserOperation} from "./vendor/interfaces/PackedUserOperation.sol";
import {IEntryPoint} from "./vendor/interfaces/IEntryPoint.sol";

/**
 * @title AEPAccount
 * @notice ERC-4337 smart account with embedded economic policy modules.
 */
contract AEPAccount is BaseAccount, TokenCallbackHandler, UUPSUpgradeable, Initializable {
    error AEPAccountNotOwner();
    error AEPAccountZeroOwner();
    error AEPAccountZeroModule();
    error AEPAccountAlreadyAdded();
    error AEPAccountNotModule();
    error AEPAccountWrongArrayLengths();
    error AEPAccountNotEntryPointOrOwner();
    error AEPAccountFrozen();

    address public owner;
    bool public frozen;

    address[] public policyModules;
    mapping(address => bool) public isPolicyModule;

    function getPolicyModulesLength() external view returns (uint256) {
        return policyModules.length;
    }

    IEntryPoint private immutable _ENTRY_POINT;

    event AEPAccountInitialized(IEntryPoint indexed entryPoint, address indexed owner);
    event PolicyModuleAdded(address indexed module);
    event PolicyModuleRemoved(address indexed module);
    event Frozen(bool frozen);
    event ExecutionSuccess(bytes32 indexed userOpHash);
    event PolicyRecordSpendFailed(address indexed module);

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    constructor(IEntryPoint anEntryPoint) {
        _ENTRY_POINT = anEntryPoint;
        _disableInitializers();
    }

    function _onlyOwner() internal view {
        if (msg.sender != owner && msg.sender != address(this)) revert AEPAccountNotOwner();
    }

    function entryPoint() public view virtual override returns (IEntryPoint) {
        return _ENTRY_POINT;
    }

    receive() external payable {}

    function initialize(address anOwner) public virtual initializer {
        if (anOwner == address(0)) revert AEPAccountZeroOwner();
        owner = anOwner;
        emit AEPAccountInitialized(_ENTRY_POINT, owner);
    }

    function initializeWithModules(address anOwner, address[] calldata modules) public virtual initializer {
        if (anOwner == address(0)) revert AEPAccountZeroOwner();
        owner = anOwner;
        uint256 len = modules.length;
        for (uint256 i = 0; i < len; i++) {
            if (modules[i] != address(0)) {
                policyModules.push(modules[i]);
                isPolicyModule[modules[i]] = true;
                emit PolicyModuleAdded(modules[i]);
            }
        }
        emit AEPAccountInitialized(_ENTRY_POINT, owner);
    }

    function setOwner(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert AEPAccountZeroOwner();
        owner = newOwner;
    }

    function setFrozen(bool _frozen) external onlyOwner {
        frozen = _frozen;
        emit Frozen(_frozen);
    }

    function addPolicyModule(address module) external onlyOwner {
        if (module == address(0)) revert AEPAccountZeroModule();
        if (isPolicyModule[module]) revert AEPAccountAlreadyAdded();
        policyModules.push(module);
        isPolicyModule[module] = true;
        emit PolicyModuleAdded(module);
    }

    function removePolicyModule(address module) external onlyOwner {
        if (!isPolicyModule[module]) revert AEPAccountNotModule();
        isPolicyModule[module] = false;
        uint256 len = policyModules.length;
        for (uint256 i = 0; i < len; i++) {
            if (policyModules[i] == module) {
                policyModules[i] = policyModules[len - 1];
                policyModules.pop();
                break;
            }
        }
        emit PolicyModuleRemoved(module);
    }

    function execute(address dest, uint256 value, bytes calldata func) external {
        _requireFromEntryPointOrOwner();
        _call(dest, value, func);
        _recordSpend();
    }

    function executeBatch(address[] calldata dests, uint256[] calldata values, bytes[] calldata funcs) external {
        _requireFromEntryPointOrOwner();
        if (dests.length != funcs.length || (values.length != 0 && values.length != funcs.length)) {
            revert AEPAccountWrongArrayLengths();
        }
        for (uint256 i = 0; i < dests.length; i++) {
            _call(dests[i], values.length == 0 ? 0 : values[i], funcs[i]);
        }
        _recordSpend();
    }

    function _requireFromEntryPointOrOwner() internal view {
        if (msg.sender != address(entryPoint()) && msg.sender != owner) revert AEPAccountNotEntryPointOrOwner();
        if (frozen) revert AEPAccountFrozen();
    }

    function _validateSignature(PackedUserOperation calldata userOp, bytes32 userOpHash)
        internal
        view
        override
        returns (uint256 validationData)
    {
        if (frozen) return SIG_VALIDATION_FAILED;

        bytes32 hash = MessageHashUtils.toEthSignedMessageHash(userOpHash);
        if (owner != ECDSA.recover(hash, userOp.signature)) {
            return SIG_VALIDATION_FAILED;
        }

        uint256 len = policyModules.length;
        for (uint256 i = 0; i < len; i++) {
            uint256 result = IPolicyModule(policyModules[i]).check(userOp);
            if (result != 0) return SIG_VALIDATION_FAILED;
        }

        return 0;
    }

    function _call(address target, uint256 value, bytes memory data) internal {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    /// @dev Swallowing recordSpend reverts favors availability (one buggy policy does not block execution)
    ///      at the cost of potential budget desync. Emits PolicyRecordSpendFailed for monitoring.
    function _recordSpend() internal {
        uint256 len = policyModules.length;
        for (uint256 i = 0; i < len; i++) {
            try IPolicyModule(policyModules[i]).recordSpend(msg.data) {}
            catch {
                emit PolicyRecordSpendFailed(policyModules[i]);
            }
        }
    }

    function checkPolicy(uint256 amount, address recipient) external view returns (bool) {
        uint256 len = policyModules.length;
        for (uint256 i = 0; i < len; i++) {
            try IPolicyModule(policyModules[i]).checkPolicy(amount, recipient) returns (bool allowed) {
                if (!allowed) return false;
            } catch {
                return false;
            }
        }
        return true;
    }

    function getDeposit() public view returns (uint256) {
        return entryPoint().balanceOf(address(this));
    }

    function addDeposit() public payable {
        entryPoint().depositTo{value: msg.value}(address(this));
    }

    function withdrawDepositTo(address payable withdrawAddress, uint256 amount) public onlyOwner {
        entryPoint().withdrawTo(withdrawAddress, amount);
    }

    function _authorizeUpgrade(address newImplementation) internal view override {
        (newImplementation);
        _onlyOwner();
    }
}
