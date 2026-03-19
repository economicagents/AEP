// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {IPolicyModule} from "../interfaces/IPolicyModule.sol";
import {IERC8004Identity} from "../interfaces/IERC8004Identity.sol";
import {IERC8004Reputation} from "../interfaces/IERC8004Reputation.sol";
import {PackedUserOperation} from "../vendor/interfaces/PackedUserOperation.sol";
import {PaymentDecoder} from "../libraries/PaymentDecoder.sol";

/**
 * @title CounterpartyPolicy
 * @notice Enforces allow/block lists, optional ERC-8004 agent allowlist, and min-reputation thresholds.
 */
contract CounterpartyPolicy is IPolicyModule, Initializable {
    error CounterpartyPolicyAllowListFull();
    error CounterpartyPolicyAgentListFull();
    error CounterpartyPolicyAgentAlreadyInList();
    error CounterpartyPolicyVerifiedListFull();
    error CounterpartyPolicyZeroIdentityRegistry();
    error CounterpartyPolicyNotOwner();
    error CounterpartyPolicyAlreadyInitialized();
    error CounterpartyPolicyNotAccount();
    error CounterpartyPolicyZeroOwner();
    error CounterpartyPolicyZeroAccount();

    uint256 public constant MAX_ALLOW_LIST_SIZE = 256;
    uint256 public constant MAX_AGENT_IDS = 256;
    uint256 public constant MAX_VERIFIED_WALLETS = 256;

    /// @dev getDenyReason return values
    uint8 public constant DENY_NONE = 0;
    uint8 public constant DENY_BLOCK_LIST = 1;
    uint8 public constant DENY_ALLOW_LIST = 2;
    uint8 public constant DENY_REPUTATION_TOO_LOW = 3;
    uint8 public constant DENY_UNREGISTERED = 4;

    address public account;
    address public owner;

    mapping(address => bool) public allowList;
    mapping(address => bool) public blockList;
    address[] public allowListAddresses;
    uint256[] public allowListAgentIds;

    IERC8004Identity public identityRegistry;
    IERC8004Reputation public reputationRegistry;
    int128 public minReputation;
    uint8 public minReputationDecimals; // 0 = min-reputation check disabled
    bool public useAllowList;
    bool public useAgentAllowList;
    bool public useGlobalMinReputation;

    mapping(address => uint256) public verifiedWalletToAgentId;
    address[] public verifiedWallets;

    event PolicyUpdated();
    event OwnerChanged(address indexed previousOwner, address indexed newOwner);
    event PolicyAccountUpdated(address indexed previousAccount, address indexed newAccount);
    event IdentityRegistryUpdated(address indexed registry);
    event ReputationRegistryUpdated(address indexed registry);

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    function _onlyOwner() internal view {
        if (msg.sender != owner) revert CounterpartyPolicyNotOwner();
    }

    constructor(address _account, address _owner) {
        if (_account == address(0)) revert CounterpartyPolicyZeroAccount();
        if (_owner == address(0)) revert CounterpartyPolicyZeroOwner();
        account = _account;
        owner = _owner;
    }

    /// @dev Policy modules must be deployed via factory or initialize called atomically in same tx as deployment.
    function initialize(address _account, address _owner) external initializer {
        if (account != address(0)) revert CounterpartyPolicyAlreadyInitialized();
        if (_account == address(0)) revert CounterpartyPolicyZeroAccount();
        if (_owner == address(0)) revert CounterpartyPolicyZeroOwner();
        account = _account;
        owner = _owner;
    }

    function setAccount(address _account) external onlyOwner {
        if (_account == address(0)) revert CounterpartyPolicyZeroAccount();
        emit PolicyAccountUpdated(account, _account);
        account = _account;
    }

    function setOwner(address _owner) external onlyOwner {
        if (_owner == address(0)) revert CounterpartyPolicyZeroOwner();
        emit OwnerChanged(owner, _owner);
        owner = _owner;
    }

    function setIdentityRegistry(address _registry) external onlyOwner {
        identityRegistry = IERC8004Identity(_registry);
        emit IdentityRegistryUpdated(_registry);
    }

    function setReputationRegistry(address _registry) external onlyOwner {
        reputationRegistry = IERC8004Reputation(_registry);
        emit ReputationRegistryUpdated(_registry);
    }

    function setMinReputation(int128 _minReputation, uint8 _decimals) external onlyOwner {
        minReputation = _minReputation;
        minReputationDecimals = _decimals;
        emit PolicyUpdated();
    }

    function setUseAllowList(bool _use) external onlyOwner {
        useAllowList = _use;
    }

    function setUseAgentAllowList(bool _use) external onlyOwner {
        useAgentAllowList = _use;
    }

    function setUseGlobalMinReputation(bool _use) external onlyOwner {
        useGlobalMinReputation = _use;
    }

    function addVerifiedAgent(uint256 agentId) external onlyOwner {
        if (address(identityRegistry) == address(0)) revert CounterpartyPolicyZeroIdentityRegistry();
        address wallet = identityRegistry.getAgentWallet(agentId);
        if (wallet == address(0)) return;
        if (verifiedWalletToAgentId[wallet] != 0) return; // already verified
        if (verifiedWallets.length >= MAX_VERIFIED_WALLETS) revert CounterpartyPolicyVerifiedListFull();
        verifiedWalletToAgentId[wallet] = agentId;
        verifiedWallets.push(wallet);
        emit PolicyUpdated();
    }

    function removeVerifiedAgent(address wallet) external onlyOwner {
        if (verifiedWalletToAgentId[wallet] == 0) return;
        verifiedWalletToAgentId[wallet] = 0;
        uint256 len = verifiedWallets.length;
        for (uint256 i = 0; i < len; i++) {
            if (verifiedWallets[i] == wallet) {
                verifiedWallets[i] = verifiedWallets[len - 1];
                verifiedWallets.pop();
                break;
            }
        }
        emit PolicyUpdated();
    }

    function addToAllowList(address addr) external onlyOwner {
        if (!allowList[addr]) {
            if (allowListAddresses.length >= MAX_ALLOW_LIST_SIZE) revert CounterpartyPolicyAllowListFull();
            allowList[addr] = true;
            allowListAddresses.push(addr);
        }
        emit PolicyUpdated();
    }

    function removeFromAllowList(address addr) external onlyOwner {
        if (allowList[addr]) {
            allowList[addr] = false;
            uint256 len = allowListAddresses.length;
            for (uint256 i = 0; i < len; i++) {
                if (allowListAddresses[i] == addr) {
                    allowListAddresses[i] = allowListAddresses[len - 1];
                    allowListAddresses.pop();
                    break;
                }
            }
        }
        emit PolicyUpdated();
    }

    function addToBlockList(address addr) external onlyOwner {
        blockList[addr] = true;
        emit PolicyUpdated();
    }

    function removeFromBlockList(address addr) external onlyOwner {
        blockList[addr] = false;
        emit PolicyUpdated();
    }

    function addAgentToAllowList(uint256 agentId) external onlyOwner {
        if (allowListAgentIds.length >= MAX_AGENT_IDS) revert CounterpartyPolicyAgentListFull();
        uint256 len = allowListAgentIds.length;
        for (uint256 i = 0; i < len; i++) {
            if (allowListAgentIds[i] == agentId) revert CounterpartyPolicyAgentAlreadyInList();
        }
        allowListAgentIds.push(agentId);
        emit PolicyUpdated();
    }

    function clearAgentAllowList() external onlyOwner {
        delete allowListAgentIds;
        emit PolicyUpdated();
    }

    function _checkReputation(uint256 agentId) internal view returns (bool) {
        if (address(reputationRegistry) == address(0) || minReputationDecimals == 0) return true;
        address[] memory clients = reputationRegistry.getClients(agentId);
        if (clients.length == 0) return false;
        (, int128 summaryValue, uint8 summaryValueDecimals) = reputationRegistry.getSummary(agentId, clients, "", "");
        int256 summaryScaled;
        if (summaryValueDecimals < 18) {
            summaryScaled = int256(summaryValue) * int256(10 ** uint256(18 - summaryValueDecimals));
        } else if (summaryValueDecimals > 18) {
            summaryScaled = (int256(summaryValue) * 1e18) / int256(10 ** uint256(summaryValueDecimals));
        } else {
            summaryScaled = int256(summaryValue);
        }
        int256 minScaled;
        if (minReputationDecimals < 18) {
            minScaled = int256(minReputation) * int256(10 ** uint256(18 - minReputationDecimals));
        } else if (minReputationDecimals > 18) {
            minScaled = (int256(minReputation) * 1e18) / int256(10 ** uint256(minReputationDecimals));
        } else {
            minScaled = int256(minReputation);
        }
        return summaryScaled >= minScaled;
    }

    function _isAllowed(address recipient) internal view returns (bool) {
        if (blockList[recipient]) return false;

        if (useGlobalMinReputation) {
            uint256 agentId = verifiedWalletToAgentId[recipient];
            if (agentId == 0) return false; // unregistered
            return _checkReputation(agentId);
        }

        if (useAllowList) {
            if (allowList[recipient]) return true;
            if (useAgentAllowList && address(identityRegistry) != address(0)) {
                uint256 agentLen = allowListAgentIds.length;
                for (uint256 i = 0; i < agentLen; i++) {
                    uint256 agentId = allowListAgentIds[i];
                    address wallet = identityRegistry.getAgentWallet(agentId);
                    if (wallet == address(0)) continue; // unset wallet = not registered
                    if (wallet != recipient) continue;
                    if (!_checkReputation(agentId)) return false;
                    return true;
                }
            }
            return false;
        }

        return true;
    }

    /// @notice Returns the deny reason when checkPolicy would return false. 0 = would allow.
    function getDenyReason(address recipient) external view returns (uint8) {
        if (blockList[recipient]) return DENY_BLOCK_LIST;

        if (useGlobalMinReputation) {
            uint256 agentId = verifiedWalletToAgentId[recipient];
            if (agentId == 0) return DENY_UNREGISTERED;
            if (!_checkReputation(agentId)) return DENY_REPUTATION_TOO_LOW;
            return DENY_NONE;
        }

        if (useAllowList) {
            if (allowList[recipient]) return DENY_NONE;
            if (useAgentAllowList && address(identityRegistry) != address(0)) {
                uint256 agentLen = allowListAgentIds.length;
                for (uint256 i = 0; i < agentLen; i++) {
                    uint256 agentId = allowListAgentIds[i];
                    address wallet = identityRegistry.getAgentWallet(agentId);
                    if (wallet == address(0)) continue;
                    if (wallet != recipient) continue;
                    if (!_checkReputation(agentId)) return DENY_REPUTATION_TOO_LOW;
                    return DENY_NONE;
                }
            }
            return DENY_ALLOW_LIST;
        }

        return DENY_NONE;
    }

    function check(PackedUserOperation calldata userOp) external view override returns (uint256 validationData) {
        if (userOp.sender != account) return 1;

        PaymentDecoder.PaymentInfo memory info = PaymentDecoder.decode(userOp.callData);

        for (uint256 i = 0; i < info.recipients.length; i++) {
            if (!_isAllowed(info.recipients[i])) return 1;
        }

        return 0;
    }

    function checkPolicy(uint256, address recipient) external view override returns (bool) {
        return _isAllowed(recipient);
    }

    function recordSpend(bytes calldata) external view override {
        if (msg.sender != account) revert CounterpartyPolicyNotAccount();
    }
}
