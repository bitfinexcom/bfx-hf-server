
module.exports = (hf) => {
  const express = require('express');
  const router = express.Router();
  const { AlgoOrder } = hf._db

  router.get('/:gid/stop', async function(req, res) {
    try {
      // send stop signal to AO
      await hf.algoHost.stopAO(req.params.gid)
      // save state to database
      await hf.algoHost.onAOPersist(req.params.gid)
      const allAos = await AlgoOrder.getAll()
      // return new set of aos
      res.json(allAos)
    } catch (e) {
      res.status(500).send({ error: e.message })
    }
  });

  router.get('', async function(req, res) {
    const allAos = await AlgoOrder.getAll()
    res.json(allAos)
  });


  return router
}
