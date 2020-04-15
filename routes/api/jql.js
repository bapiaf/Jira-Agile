//BACKUP/TEST ROUTE
//Returns Jira tickets associated to a JQL query with the attributes
// key:
//summary:
//status:
//issuetype:
//created:
//reporter:
//affectsVersion:
//fixVersion:
//epicLink:
//epicSummary:
//SP:
//SP_FE:
//SP_BE:
//qatime:
//devtime
//worklog
// NO priority, no components

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
  'yhoptyan',
];

// instanciate jira request
const axios = require('axios');
const jira = axios.create({
  baseURL: domain + '/rest/api/2',
  timeout: 2000,
  auth: {
    username: jirausername,
    password: jirapassword,
  },
  headers: {
    'Content-Type': 'application/json',
    //Authorization: 'Basic YmlhZnJhdGU6UkJsYW51aXRkZXN0ZW1wczc1Jg=='
  },
});

// Extract QA & Dev time from the issue's worklog
// used in issue extractor (getIssues)
const getQADev = (worklogs) => {
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

//check if the author of a new worklog is already present in the consolidated worklog
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
const getWorklog = (worklogs) => {
  var cleanWorklog = [];
  for (const worklog of worklogs) {
    var index = checkAuthor(worklog.author.name, cleanWorklog);
    if (index == -1) {
      cleanWorklog.push({
        name: worklog.author.name,
        timeSpentHours: worklog.timeSpentSeconds / 3600,
      });
    } else {
      cleanWorklog[index].timeSpentHours += worklog.timeSpentSeconds / 3600;
    }
  }
  return cleanWorklog;
};

// version [] cleaner. Gets the last (most relevant) fix version or affected version
// used in issue extractor (getIssues)
const getVersion = (version) => {
  var cleanVersion = '';
  if (version.length > 0) {
    cleanVersion = version[version.length - 1].name;
  }
  return cleanVersion;
};

// extracts a list of linked (parent) epics from a set of issues (e.g. from Jira's response to /search)
// used in the jql route to extract linked epics using the epic link custom field
const getEpicLinks = (issues) => {
  var epicsJQL = '';
  for (const issue of issues) {
    if (issue.fields.customfield_10006 != null) {
      epicsJQL += issue.fields.customfield_10006.toString() + ',';
    }
  }
  console.log(epicsJQL);
  return epicsJQL.slice(0, epicsJQL.length - 1);
};

// extract clean array of issues in the {key:,summary:} format from Jira's response to /search
// used in getIssueSummaries
const getKeySummary = (issues) => {
  const cleanIssues = [];
  for (const issue of issues) {
    cleanIssues.push({
      key: issue.key,
      summary: issue.fields.summary,
    });
  }
  return cleanIssues;
};

// get (key,summary) attributes from a set of issues using Jira /search/
// used in jql route to transform the list of epic links (keys) in an array of epics in the {key:,summary:} format
async function getIssueSummaries(issues) {
  try {
    //console.log('issuekey in ' + issues);
    const response = await jira.post('/search', {
      jql: 'issuekey in (' + issues + ')',
      startAt: 0,
      maxResults: 500,
      fields: ['summary'],
    });
    //console.log(response.data);
    const cleanResponse = getKeySummary(response.data.issues);
    //console.log('got my epics linked key/summary array');
    //console.log(cleanResponse);
    return cleanResponse;
  } catch (err) {
    //console.error(err.message);
    res.status(500).send('Server error - get Issue Names');
  }
}

// finds the summary of an issue using the issue key, in an array of issues in the {key:,summary:} format
const findIssueSummary = (issueKey, keySummaryArray) => {
  for (const keySummary of keySummaryArray) {
    if (keySummary.key == issueKey) {
      console.log('found linked epic summary for' + issueKey);
      return keySummary.summary;
    }
  }
  return '';
};

// extracts a clean, BI-ready set of issues from Jira's response to /search
// used in the jql route to prepare the response body
const getIssues = (issues, epicsLinkedSummaries) => {
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
      epicSummary: findIssueSummary(
        issue.fields.customfield_10006,
        epicsLinkedSummaries
      ),
      SP: issue.fields.customfield_10002,
      SP_FE: issue.fields.customfield_10700,
      SP_BE: issue.fields.customfield_10701,
      worklog: getWorklog(issue.fields.worklog.worklogs),
      qatime: getQADev(issue.fields.worklog.worklogs)[0],
      devtime: getQADev(issue.fields.worklog.worklogs)[1],
    });
  }
  return cleanIssues;
};

//@route POST api/jql
//@ desc searches Diabolocom jira for tickets matching jql query
// & returns a clean and BI-ready set of issues
// @access Public. (Server is using Jira auth from config)
router.post(
  '/',
  [check('jql', 'JQL is required').not().isEmpty()],
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
          'worklog',
        ],
      });
      //console.log(response.data);
      res.status(200);

      //extract list of linked epics for a jql query
      const epicsLinked = getEpicLinks(response.data.issues);
      console.log(epicsLinked);
      // obtain array of {key:, name:} of all linked epics
      const epicsLinkedSummaries = await getIssueSummaries(epicsLinked);
      console.log('will prepare response');
      console.log(epicsLinkedSummaries);

      const cleanResponse = getIssues(
        response.data.issues,
        epicsLinkedSummaries
      );
      res.json(cleanResponse);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error - Jira search issues with JQL');
    }
  }
);

module.exports = router;
