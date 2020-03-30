const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const config = require('config');
const jirausername = config.get('username');
const jirapassword = config.get('password');
const domain = config.get('domain');

// instanciate jira request
const axios = require('axios');
const jira = axios.create({
  baseURL: domain + '/rest/api/2',
  timeout: 2000,
  auth: {
    username: jirausername,
    password: jirapassword
  },
  headers: {
    'Content-Type': 'application/json'
    //Authorization: 'Basic YmlhZnJhdGU6UkJsYW51aXRkZXN0ZW1wczc1Jg=='
  }
});

// Create worklog extractor function
const getWorklog = worklogs => {
  const cleanWorklog = [];
  for (const worklog of worklogs) {
    cleanWorklog.push({
      name: worklog.author.name,
      timeSpentSeconds: worklog.timeSpentSeconds
    });
  }
  return cleanWorklog;
};

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
    //console.log(req.body);
    console.log(jirausername);

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

      const cleanResponse = {};

      res.json(response.data);
      //res.send('jql route');
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;
