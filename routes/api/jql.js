const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');

// instanciate jira request
const axios = require('axios');
const jira = axios.create({
  baseURL: 'https://jira.diabolocom.com/rest/api/2',
  timeout: 2000,
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Basic YmlhZnJhdGU6UkJsYW51aXRkZXN0ZW1wczc1Jg=='
  }
});

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
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    console.log(req.body);

    try {
      const response = await jira.post('/search', {
        jql:
          'project = EV2 AND status not in (Canceled) AND component = Data AND TargetVersion = 3.10',
        startAt: 0,
        maxResults: 20,
        fields: [
          'summary',
          'issuetype',
          'status',
          'fixVersions',
          'versions',
          'components',
          'customfield_10006',
          'customfield_10700',
          'customfield_10701',
          'worklog'
        ]
      });
      console.log(response.data);
      res.status(200);
      res.json(response.data);
      //res.send('jql route');
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;
