

const registerAOUIs = require('bfx-hf-algo/lib/host/ui/register_ao_uis')

module.exports = (hf) => {
  const express = require('express');
  const router = express.Router();

  const { AccumulateDistribute, TWAP, Iceberg, PingPong } = require('bfx-hf-algo')
  // just use a hard coded set of orders for now. In the future this will need to be dynamic
  const activeOrders = {
    [AccumulateDistribute.id]: { active: false, ...AccumulateDistribute},
    [TWAP.id]: { active: false, ...TWAP },
    [Iceberg.id]: { active: false, ...Iceberg },
    [PingPong.id]: { active: false, ...PingPong }
  }

  router.post('/:id/state/set', async function(req, res) {
    const state = req.body.active
    const id = req.params.id
    if (state == undefined) {
      return res.status(401).json({ error: 'Invalid state in body' })
    }
    if (!Object.keys(activeOrders).includes(id)) {
      return res.status(404).json({ error: `Definition with id ${id} not found.` })
    }
    if (!!state) {
      // enable the order definition
      activeOrders[id].active = true
    } else {
      // disable the order definition
      activeOrders[id].active = false
    }
    // set the algo hosts directly (this means we dont have to establish a new connection)
    // TODO add this as a public function on algoHost
    hf.algoHost.aos = Object.values(activeOrders).filter((ao) => ao.active)
    try {
      await hf.algoHost.reloadAllAOs()
      // re-register to ui
      registerAOUIs(hf.algoHost)
    } catch (e) {
      return res.status(500).send({ error: e.message })
    }
    // return up-to-date list of definitions
    res.json(Object.values(activeOrders))
  });

  return router
}
