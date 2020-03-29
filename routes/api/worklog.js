const express = require('express');
const router = express.Router();

//@route GET api/worklog
//@ desc searches Diabolocom jira for worklogs associated to a ticket
// @access Private (Jira auth)
router.get('/', (req, res) => res.send('worklog route'));

module.exports = router;
