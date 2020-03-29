const express = require('express');
const router = express.Router();

//@route POST api/jql
//@ desc searches Diabolocom jira for tickets matching jql query
// @access Private (Jira auth)
router.post('/', (req, res) => res.send('jql route'));

module.exports = router;
