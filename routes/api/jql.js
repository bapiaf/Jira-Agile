const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');

//@route POST api/jql
//@ desc searches Diabolocom jira for tickets matching jql query
// @access Private (Jira auth)
router.post(
  '/',
  [
    check('jql', 'JQL is required')
      .not()
      .isEmpty()
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    console.log(req.body);
    res.send('jql route');
  }
);

module.exports = router;
