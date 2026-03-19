// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PolicyRegistry
 * @notice Singleton registry of reusable policy templates. Agents can deploy accounts from templates.
 */
contract PolicyRegistry is Ownable2Step {
    error PolicyRegistryTemplateNotFound();
    error PolicyRegistryTemplateExists();

    struct Template {
        bool registered;
        uint256 maxPerTx;
        uint256 maxDaily;
        uint256 maxWeekly;
        uint256 maxPerTask;
        uint256 taskWindowSeconds;
        uint256 dailyWindowSeconds;
        uint256 weeklyWindowSeconds;
    }

    mapping(bytes32 => Template) public templates;

    event TemplateRegistered(
        bytes32 indexed id,
        uint256 maxPerTx,
        uint256 maxDaily,
        uint256 maxWeekly,
        uint256 maxPerTask,
        uint256 taskWindowSeconds,
        uint256 dailyWindowSeconds,
        uint256 weeklyWindowSeconds
    );

    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @notice Register a policy template (basic: per-tx, daily, weekly only).
     */
    function registerTemplate(bytes32 id, uint256 maxPerTx, uint256 maxDaily, uint256 maxWeekly) external onlyOwner {
        if (templates[id].registered) revert PolicyRegistryTemplateExists();
        templates[id] = Template({
            registered: true,
            maxPerTx: maxPerTx,
            maxDaily: maxDaily,
            maxWeekly: maxWeekly,
            maxPerTask: 0,
            taskWindowSeconds: 0,
            dailyWindowSeconds: 0,
            weeklyWindowSeconds: 0
        });
        emit TemplateRegistered(id, maxPerTx, maxDaily, maxWeekly, 0, 0, 0, 0);
    }

    /**
     * @notice Register a policy template with per-task and configurable windows.
     */
    function registerTemplateFull(
        bytes32 id,
        uint256 maxPerTx,
        uint256 maxDaily,
        uint256 maxWeekly,
        uint256 maxPerTask,
        uint256 taskWindowSeconds,
        uint256 dailyWindowSeconds,
        uint256 weeklyWindowSeconds
    ) external onlyOwner {
        if (templates[id].registered) revert PolicyRegistryTemplateExists();
        templates[id] = Template({
            registered: true,
            maxPerTx: maxPerTx,
            maxDaily: maxDaily,
            maxWeekly: maxWeekly,
            maxPerTask: maxPerTask,
            taskWindowSeconds: taskWindowSeconds,
            dailyWindowSeconds: dailyWindowSeconds,
            weeklyWindowSeconds: weeklyWindowSeconds
        });
        emit TemplateRegistered(
            id, maxPerTx, maxDaily, maxWeekly, maxPerTask, taskWindowSeconds, dailyWindowSeconds, weeklyWindowSeconds
        );
    }

    /**
     * @notice Get template config.
     */
    function getTemplate(bytes32 id)
        external
        view
        returns (
            uint256 maxPerTx,
            uint256 maxDaily,
            uint256 maxWeekly,
            uint256 maxPerTask,
            uint256 taskWindowSeconds,
            uint256 dailyWindowSeconds,
            uint256 weeklyWindowSeconds
        )
    {
        Template storage t = templates[id];
        if (!t.registered) revert PolicyRegistryTemplateNotFound();
        return (
            t.maxPerTx,
            t.maxDaily,
            t.maxWeekly,
            t.maxPerTask,
            t.taskWindowSeconds,
            t.dailyWindowSeconds,
            t.weeklyWindowSeconds
        );
    }

    /**
     * @notice Check if a template exists.
     */
    function hasTemplate(bytes32 id) external view returns (bool) {
        return templates[id].registered;
    }
}
