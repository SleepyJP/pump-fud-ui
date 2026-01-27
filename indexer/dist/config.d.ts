export declare const TREASURY_WALLET: "0x49bBEFa1d94702C0e9a5EAdDEc7c3C5D3eb9086B";
export declare const FEES: {
    readonly BUY_TOTAL_BPS: 100;
    readonly BUY_USER_BPS: 50;
    readonly BUY_TREASURY_BPS: 50;
    readonly SELL_TOTAL_BPS: 110;
    readonly SELL_USER_BPS: 50;
    readonly SELL_TREASURY_BPS: 60;
    readonly GRADUATION_FEE_BPS: 1000;
    readonly REFERRAL_BPS: 25;
};
export declare const GRADUATION_LIQUIDITY: {
    readonly PULSEX_V2_PERCENT: 10;
    readonly PAISLEY_V2_PERCENT: 10;
};
export declare const FACTORY_ABI: readonly [{
    readonly name: "TokenLaunched";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "tokenId";
        readonly indexed: true;
    }, {
        readonly type: "address";
        readonly name: "tokenAddress";
        readonly indexed: true;
    }, {
        readonly type: "address";
        readonly name: "creator";
        readonly indexed: true;
    }, {
        readonly type: "string";
        readonly name: "name";
    }, {
        readonly type: "string";
        readonly name: "symbol";
    }];
}, {
    readonly name: "TokenGraduated";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "tokenId";
        readonly indexed: true;
    }, {
        readonly type: "address";
        readonly name: "tokenAddress";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "liquidityAmount";
    }, {
        readonly type: "uint256";
        readonly name: "treasuryFee";
    }];
}, {
    readonly name: "TokenDelisted";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "uint256";
        readonly name: "tokenId";
        readonly indexed: true;
    }, {
        readonly type: "address";
        readonly name: "tokenAddress";
        readonly indexed: true;
    }, {
        readonly type: "string";
        readonly name: "reason";
    }];
}];
export declare const TOKEN_ABI: readonly [{
    readonly name: "Buy";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "buyer";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "plsIn";
    }, {
        readonly type: "uint256";
        readonly name: "tokensOut";
    }, {
        readonly type: "uint256";
        readonly name: "fee";
    }];
}, {
    readonly name: "Sell";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "seller";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "tokensIn";
    }, {
        readonly type: "uint256";
        readonly name: "plsOut";
    }, {
        readonly type: "uint256";
        readonly name: "fee";
    }];
}, {
    readonly name: "Transfer";
    readonly type: "event";
    readonly inputs: readonly [{
        readonly type: "address";
        readonly name: "from";
        readonly indexed: true;
    }, {
        readonly type: "address";
        readonly name: "to";
        readonly indexed: true;
    }, {
        readonly type: "uint256";
        readonly name: "value";
    }];
}, {
    readonly name: "graduated";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "bool";
    }];
}, {
    readonly name: "plsReserve";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}, {
    readonly name: "creator";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
}, {
    readonly name: "getCurrentPrice";
    readonly type: "function";
    readonly stateMutability: "view";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly type: "uint256";
    }];
}];
export declare const CHAIN: {
    readonly id: 369;
    readonly name: "PulseChain";
    readonly rpcUrl: string;
    readonly blockTime: 10;
};
export declare const INDEXER_CONFIG: {
    readonly BATCH_SIZE: 1000;
    readonly POLL_INTERVAL: 10000;
    readonly CONFIRMATIONS: 2;
};
export declare function calculateBuyFees(plsAmount: bigint): {
    totalFee: bigint;
    userFee: bigint;
    treasuryFee: bigint;
};
export declare function calculateSellFees(plsAmount: bigint): {
    totalFee: bigint;
    userFee: bigint;
    treasuryFee: bigint;
};
export declare function calculateGraduationFee(liquidityAmount: bigint): bigint;
export declare function calculateReferralFee(treasuryFee: bigint): bigint;
//# sourceMappingURL=config.d.ts.map