import { ethers, network } from "hardhat";
import { Signer, Wallet, BigNumber } from "ethers";
import { expect } from "chai";
import { ChainId, Token, Fetcher, Trade, Route, TokenAmount, TradeType, Percent, Pair, JSBI } from "@uniswap/sdk";

import {
  DebtSwap,
  DebtSwap__factory,
  ERC20,
  ILendingPool,
  ILendingPoolAddressesProvider,
  IStableDebtToken,
  IVariableDebtToken,
} from "../typechain";
import { lendingPoolProviderAddress, uniswapFactoryAddress } from "../scripts/constants/addresses";

describe("DebtSwap", () => {
  const impersonateAccount: string = "0xD465bE4e63bD09392bAC51Fcf04AA13412B552D0";
  const daiAddress: string = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  const usdcAddress: string = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const daiVariableDebtTokenAddress: string = "0x6C3c78838c761c6Ac7bE9F59fe808ea2A6E4379d";
  const usdcStableDebtTokenAddress: string = "0xE4922afAB0BbaDd8ab2a88E0C79d884Ad337fcA6";
  const usdcVariableDebtTokenAddress: string = "0x619beb58998eD2278e08620f97007e1116D5D25b";
  const testAmountOut: string = "1000000000000000000000";
  const slippageTolerance: Percent = new Percent("1", "100");
  const zeroSlippage: Percent = new Percent("0");

  let accounts: Signer[];
  let debtSwap: DebtSwap;
  let lendingPool: ILendingPool;
  let lendingPoolAddressesProvider: ILendingPoolAddressesProvider;
  let dai: ERC20;
  let usdc: ERC20;
  let daiToken: Token;
  let usdcToken: Token;
  let path: [Token, Token][];
  let routePath: Pair[];
  let route: Route;

  beforeEach(async () => {
    accounts = await ethers.getSigners();

    const aaveFactory: DebtSwap__factory = (await ethers.getContractFactory(
      "contracts/DebtSwap.sol:DebtSwap",
      <Wallet>accounts[0],
    )) as DebtSwap__factory;
    debtSwap = await aaveFactory.deploy(lendingPoolProviderAddress);

    lendingPoolAddressesProvider = (await ethers.getContractAt(
      "contracts/interfaces/ILendingPoolAddressesProvider.sol:ILendingPoolAddressesProvider",
      lendingPoolProviderAddress,
    )) as ILendingPoolAddressesProvider;

    const lendingPoolAddress: string = await lendingPoolAddressesProvider.getLendingPool();
    lendingPool = (await ethers.getContractAt(
      "contracts/interfaces/ILendingPool.sol:ILendingPool",
      lendingPoolAddress,
    )) as ILendingPool;

    dai = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20", daiAddress)) as ERC20;
    usdc = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20", usdcAddress)) as ERC20;
    daiToken = new Token(ChainId.MAINNET, dai.address, await dai.decimals());
    usdcToken = new Token(ChainId.MAINNET, usdc.address, await usdc.decimals());
    path = [[usdcToken, daiToken]];
    routePath = await Promise.all(
      path.map((pair: [Token, Token]) => Fetcher.fetchPairData(pair[0], pair[1], ethers.provider)),
    );
    route = new Route(routePath, usdcToken);
  });

  it("should initialize state variables", async () => {
    const getAddressesProvider: string = await debtSwap.ADDRESSES_PROVIDER();
    expect(getAddressesProvider).to.equal(lendingPoolProviderAddress);
    const getLendingPool: string = await debtSwap.LENDING_POOL();
    expect(getLendingPool).to.equal(lendingPool.address);
  });

  it("swap from variable DAI debt testAmountOut to USDC stable debt", async () => {
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [impersonateAccount],
    });
    const impersonateAccountSigner: Signer = await ethers.provider.getSigner(impersonateAccount);
    const trade: Trade = new Trade(route, new TokenAmount(daiToken, testAmountOut), TradeType.EXACT_OUTPUT);
    const amountInMax: JSBI = trade.maximumAmountIn(slippageTolerance).raw;
    const expectedAmountIn: BigNumber = BigNumber.from(trade.maximumAmountIn(zeroSlippage).raw.toString());
    const pathInput: string[] = trade.route.path.map((token: Token) => token.address);
    const debtToken: IStableDebtToken = (await ethers.getContractAt(
      "contracts/interfaces/IStableDebtToken.sol:IStableDebtToken",
      usdcStableDebtTokenAddress,
    )) as IStableDebtToken;
    const daiVariableDebtToken: ERC20 = (await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
      daiVariableDebtTokenAddress,
    )) as ERC20;
    const usdcStableDebtToken: ERC20 = (await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
      usdcStableDebtTokenAddress,
    )) as ERC20;
    const beforeDaiDebt: BigNumber = await daiVariableDebtToken.balanceOf(impersonateAccount);
    const beforeUsdcDebt: BigNumber = await usdcStableDebtToken.balanceOf(impersonateAccount);
    await debtToken
      .connect(impersonateAccountSigner)
      .approveDelegation(debtSwap.address, BigNumber.from(amountInMax.toString()));
    await debtSwap
      .connect(impersonateAccountSigner)
      .swapDebt(
        [usdc.address],
        pathInput,
        [1],
        testAmountOut,
        BigNumber.from(amountInMax.toString()),
        2,
        daiVariableDebtToken.address,
        uniswapFactoryAddress,
      );
    const afterDaiDebt: BigNumber = await daiVariableDebtToken.balanceOf(impersonateAccount);
    const afterUsdcDebt: BigNumber = await usdcStableDebtToken.balanceOf(impersonateAccount);
    expect(afterDaiDebt).to.lt(beforeDaiDebt);
    expect(afterUsdcDebt).to.equal(expectedAmountIn.add(beforeUsdcDebt));
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [impersonateAccount],
    });
  });

  it("swap from variable DAI debt testAmountOut to USDC variable debt", async () => {
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [impersonateAccount],
    });
    const impersonateAccountSigner: Signer = await ethers.provider.getSigner(impersonateAccount);
    const trade: Trade = new Trade(route, new TokenAmount(daiToken, testAmountOut), TradeType.EXACT_OUTPUT);
    const amountInMax: JSBI = trade.maximumAmountIn(slippageTolerance).raw;
    const expectedAmountIn: BigNumber = BigNumber.from(trade.maximumAmountIn(zeroSlippage).raw.toString());
    const pathInput: string[] = trade.route.path.map((token: Token) => token.address);
    const debtToken: IVariableDebtToken = (await ethers.getContractAt(
      "contracts/interfaces/IVariableDebtToken.sol:IVariableDebtToken",
      usdcVariableDebtTokenAddress,
    )) as IVariableDebtToken;
    const daiVariableDebtToken: ERC20 = (await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
      daiVariableDebtTokenAddress,
    )) as ERC20;
    const usdcVariableDebtToken: ERC20 = (await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
      usdcVariableDebtTokenAddress,
    )) as ERC20;
    const beforeDaiDebt: BigNumber = await daiVariableDebtToken.balanceOf(impersonateAccount);
    const beforeUsdcDebt: BigNumber = await usdcVariableDebtToken.balanceOf(impersonateAccount);
    await debtToken
      .connect(impersonateAccountSigner)
      .approveDelegation(debtSwap.address, BigNumber.from(amountInMax.toString()));
    await debtSwap
      .connect(impersonateAccountSigner)
      .swapDebt(
        [usdc.address],
        pathInput,
        [2],
        testAmountOut,
        BigNumber.from(amountInMax.toString()),
        2,
        daiVariableDebtToken.address,
        uniswapFactoryAddress,
      );
    const afterDaiDebt: BigNumber = await daiVariableDebtToken.balanceOf(impersonateAccount);
    const afterUsdcDebt: BigNumber = await usdcVariableDebtToken.balanceOf(impersonateAccount);
    expect(afterDaiDebt).to.lt(beforeDaiDebt);
    expect(afterUsdcDebt).to.equal(expectedAmountIn.add(beforeUsdcDebt));
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [impersonateAccount],
    });
  });

  it("swap from variable DAI debt maxAmount to USDC stable debt", async () => {
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [impersonateAccount],
    });
    const impersonateAccountSigner: Signer = await ethers.provider.getSigner(impersonateAccount);
    const daiVariableDebtToken: ERC20 = (await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
      daiVariableDebtTokenAddress,
    )) as ERC20;
    const maxAmountOut = await daiVariableDebtToken.balanceOf(impersonateAccount);
    const trade: Trade = new Trade(route, new TokenAmount(daiToken, maxAmountOut.toString()), TradeType.EXACT_OUTPUT);
    const amountInMax: JSBI = trade.maximumAmountIn(slippageTolerance).raw;
    const pathInput: string[] = trade.route.path.map((token: Token) => token.address);
    const debtToken: IStableDebtToken = (await ethers.getContractAt(
      "contracts/interfaces/IVariableDebtToken.sol:IVariableDebtToken",
      usdcStableDebtTokenAddress,
    )) as IStableDebtToken;
    const usdcStableDebtToken: ERC20 = (await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
      usdcStableDebtTokenAddress,
    )) as ERC20;
    const beforeUsdcDebt: BigNumber = await usdcStableDebtToken.balanceOf(impersonateAccount);
    await debtToken
      .connect(impersonateAccountSigner)
      .approveDelegation(debtSwap.address, BigNumber.from(amountInMax.toString()));
    await debtSwap
      .connect(impersonateAccountSigner)
      .swapDebt(
        [usdc.address],
        pathInput,
        [1],
        ethers.constants.MaxUint256,
        BigNumber.from(amountInMax.toString()),
        2,
        daiVariableDebtToken.address,
        uniswapFactoryAddress,
      );
    const afterDaiDebt: BigNumber = await daiVariableDebtToken.balanceOf(impersonateAccount);
    const afterUsdcDebt: BigNumber = await usdcStableDebtToken.balanceOf(impersonateAccount);
    expect(afterDaiDebt).to.equal(BigNumber.from(0));
    expect(afterUsdcDebt).to.gt(beforeUsdcDebt);
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [impersonateAccount],
    });
  });

  it("swap from stable USDC debt maxAmount to DAI variable debt", async () => {
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [impersonateAccount],
    });
    const impersonateAccountSigner: Signer = await ethers.provider.getSigner(impersonateAccount);
    const path2: [Token, Token][] = [[usdcToken, daiToken]];
    const routePath2 = await Promise.all(
      path2.map((pair: [Token, Token]) => Fetcher.fetchPairData(pair[0], pair[1], ethers.provider)),
    );
    const route2 = new Route(routePath2, daiToken);
    const usdcStableDebtToken: ERC20 = (await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
      usdcStableDebtTokenAddress,
    )) as ERC20;
    const maxAmountOut = await usdcStableDebtToken.balanceOf(impersonateAccount);
    const trade: Trade = new Trade(route2, new TokenAmount(usdcToken, maxAmountOut.toString()), TradeType.EXACT_OUTPUT);
    const amountInMax: JSBI = trade.maximumAmountIn(slippageTolerance).raw;
    const pathInput: string[] = trade.route.path.map((token: Token) => token.address);
    const debtToken: IVariableDebtToken = (await ethers.getContractAt(
      "contracts/interfaces/IVariableDebtToken.sol:IVariableDebtToken",
      daiVariableDebtTokenAddress,
    )) as IVariableDebtToken;
    const daiVariableDebtToken: ERC20 = (await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
      daiVariableDebtTokenAddress,
    )) as ERC20;
    const beforeDaiDebt: BigNumber = await daiVariableDebtToken.balanceOf(impersonateAccount);
    await debtToken
      .connect(impersonateAccountSigner)
      .approveDelegation(debtSwap.address, BigNumber.from(amountInMax.toString()));
    await debtSwap
      .connect(impersonateAccountSigner)
      .swapDebt(
        [dai.address],
        pathInput,
        [2],
        ethers.constants.MaxUint256,
        BigNumber.from(amountInMax.toString()),
        1,
        usdcStableDebtToken.address,
        uniswapFactoryAddress,
      );
    const afterUsdcDebt: BigNumber = await usdcStableDebtToken.balanceOf(impersonateAccount);
    const afterDaiDebt: BigNumber = await daiVariableDebtToken.balanceOf(impersonateAccount);
    expect(afterUsdcDebt).to.equal(BigNumber.from(0));
    expect(afterDaiDebt).to.gt(beforeDaiDebt);
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [impersonateAccount],
    });
  });
});
