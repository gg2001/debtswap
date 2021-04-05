// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.6;

import { IUniswapV2Callee } from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Callee.sol";
import { IUniswapV2Factory } from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import { ILendingPoolAddressesProvider } from "../Aave/interfaces/ILendingPoolAddressesProvider.sol";
import { ILendingPool } from "../Aave/interfaces/ILendingPool.sol";
import { IFlashLoanReceiver } from "../Aave/interfaces/IFlashLoanReceiver.sol";

/// @author Ganesh Gautham Elango
/// @title Aave flash loan contract
abstract contract Provider is IFlashLoanReceiver, IUniswapV2Callee {
    ILendingPoolAddressesProvider public immutable override ADDRESSES_PROVIDER;
    ILendingPool public immutable override LENDING_POOL;
    IUniswapV2Factory public immutable uniswapFactory;

    /// @param provider Aave lending pool addresses provider
    /// @param _uniswapFactory Uniswap V2 factory address
    constructor(address provider, address _uniswapFactory) {
        ADDRESSES_PROVIDER = ILendingPoolAddressesProvider(provider);
        LENDING_POOL = ILendingPool(ILendingPoolAddressesProvider(provider).getLendingPool());
        uniswapFactory = IUniswapV2Factory(_uniswapFactory);
    }
}
