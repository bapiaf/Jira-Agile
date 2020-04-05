const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const config = require('config');
const jirausername = config.get('username');
const jirapassword = config.get('password');
const domain = config.get('domain');
// get QA members
const QAteam = [
  'aozherelyeva',
  'cbalan',
  'dmarkov',
  'dradu',
  'ebrysova',
  'ilisovskaya',
  'sartamonov',
  'vrodina',
  'yhoptyan'
];

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

// Extract QA & Dev time from a worklog
// used in issue extractor (getIssues)
const getQADev = worklogs => {
  var QAtime = 0;
  var Devtime = 0;
  for (const worklog of worklogs) {
    if (QAteam.includes(worklog.author.name) == true) {
      QAtime += worklog.timeSpentSeconds / 3600;
    } else {
      Devtime += worklog.timeSpentSeconds / 3600;
    }
  }
  return [QAtime, Devtime];
};

//check if worklog author already present
//used in worklog extractor (getWorklog)
const checkAuthor = (author, cleanWorklog) => {
  var indexMatch = -1;
  if (cleanWorklog.length > 0) {
    for (var i = 0; i < cleanWorklog.length; i++) {
      if (cleanWorklog[i].name == author) {
        indexMatch += 1;
      }
    }
  }
  return indexMatch;
};

// Extract clean worklogs from a Jira raw worklog and agregate them by author
// used in issue extractor (getIssues)
const getWorklog = worklogs => {
  var cleanWorklog = [];
  for (const worklog of worklogs) {
    var index = checkAuthor(worklog.author.name, cleanWorklog);
    if (index == -1) {
      cleanWorklog.push({
        name: worklog.author.name,
        timeSpentHours: worklog.timeSpentSeconds / 3600
      });
    } else {
      cleanWorklog[index].timeSpentHours += worklog.timeSpentSeconds / 3600;
    }
  }
  return cleanWorklog;
};

// version [] cleaner. Gets the last (most relevant) fix version or affect version
// used in issue extractor (getIssues)
const getVersion = version => {
  var cleanVersion = '';
  if (version.length > 0) {
    cleanVersion = version[version.length - 1].name;
  }
  return cleanVersion;
};

// extract clean issues from Jira's response
// used in the jql route
const getIssues = issues => {
  const cleanIssues = [];
  for (const issue of issues) {
    cleanIssues.push({
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status.name,
      issuetype: issue.fields.issuetype.name,
      affectsVersion: getVersion(issue.fields.versions),
      fixVersion: getVersion(issue.fields.fixVersions),
      epicLink: issue.fields.customfield_10006,
      SP: issue.fields.customfield_10002,
      SP_FE: issue.fields.customfield_10700,
      SP_BE: issue.fields.customfield_10701,
      components: issue.fields.components.name,
      worklog: getWorklog(issue.fields.worklog.worklogs),
      qatime: getQADev(issue.fields.worklog.worklogs)[0],
      devtime: getQADev(issue.fields.worklog.worklogs)[1]
    });
  }
  return cleanIssues;
};

//@route POST api/jql
//@ desc searches Diabolocom jira for tickets matching jql query
// @access Public. (Server is using Jira auth from config)
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
    //console.log(jirausername);

    try {
      const response = await jira.post('/search', {
        jql: req.body.jql,
        startAt: 0,
        maxResults: 500,
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
          'customfield_10002',
          'worklog'
        ]
      });
      //console.log(response.data);
      res.status(200);

      const cleanResponse = getIssues(response.data.issues);
      res.json(cleanResponse);

      //res.json(response.data);
      //res.send('jql route');
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error - Jira search issues with JQL');
    }
  }
);

module.exports = router;
