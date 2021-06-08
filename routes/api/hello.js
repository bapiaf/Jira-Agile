const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const config = require('config');
const fs = require('fs');

//@route POST api/hello
//@ desc says hello
// @access Public.
router.post('/', async (req, res) => {
  try {
    console.log(req.body);
    res.json(req.body);
  } catch (err) {
    console.error(err);
  }
});

module.exports = router;
