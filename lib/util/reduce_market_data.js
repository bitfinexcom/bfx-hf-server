"use strict";

const { PAPER_MODE_PAIRS } = require("../constants");

const INITIAL_MARKETS_OBJECT = {
  sandboxMarkets: [],
  liveMarkets: [],
};

module.exports = (marketData) => {
  const marketValues = [...marketData.values()];

  return marketValues.reduce((acc, m) => {
    if (PAPER_MODE_PAIRS.includes(m.wsID)) {
      acc.sandboxMarkets = [...acc.sandboxMarkets, m];
    }
    if (m.p === 0) {
      acc.liveMarkets = [...acc.liveMarkets, m];
    }
    return acc;
  }, INITIAL_MARKETS_OBJECT);
};
