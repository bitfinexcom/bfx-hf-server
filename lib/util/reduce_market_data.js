"use strict";

const { PAPER_MODE_PAIRS } = require("../constants");

module.exports = (marketData) => {
  const marketValues = [...marketData.values()];

  const sandboxMarkets = {};
  const liveMarkets = {};

  marketValues.forEach((m) => {
    if (PAPER_MODE_PAIRS.includes(m.wsID)) {
      sandboxMarkets[m.wsID] = m;
    }
    if (m.p === 0) {
      liveMarkets[m.wsID] = m;
    }
  });

  return {
    sandboxMarkets,
    liveMarkets,
  };
};
