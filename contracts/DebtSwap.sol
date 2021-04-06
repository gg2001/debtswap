// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.6;

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IUniswapV2Factory } from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import { UniswapV2Library } from "./libraries/UniswapV2Library.sol";
import { ILendingPool } from "./interfaces/ILendingPool.sol";
import { Aave } from "./adapters/Aave.sol";

/// @author Ganesh Gautham Elango
/// @title Aave flash loan contract
contract DebtSwap is Aave {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /// @param provider Aave lending pool addresses provider
    /// @param _uniswapFactory Uniswap V2 factory address
    constructor(address provider, address _uniswapFactory) Aave(provider, _uniswapFactory) {}

    function swapDebt(
        address borrowAsset,
        uint256 repayAmount,
        uint256 borrowMode,
        uint256 repayMode,
        address debtTokenAddress,
        address[] memory path
    ) external {
        address[] memory assets = new address[](1);
        assets[0] = borrowAsset;
        uint256 amountToRepay = repayAmount;
        if (repayAmount == type(uint256).max) {
            amountToRepay = IERC20(debtTokenAddress).balanceOf(msg.sender);
        }
        uint256[] memory amountsIn = UniswapV2Library.getAmountsIn(address(uniswapFactory), amountToRepay, path);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amountsIn[amountsIn.length - 1];
        uint256[] memory modes = new uint256[](1);
        modes[0] = borrowMode;
        bytes memory params = abi.encode(path, repayMode);
        LENDING_POOL.flashLoan(
            address(this), // receiverAddress
            assets,
            amounts,
            modes,
            msg.sender, // onBehalfOf
            params,
            0 // referralCode
        );
    }
}
