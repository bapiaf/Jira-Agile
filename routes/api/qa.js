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

//@route GET api/qa
//@ desc gets Diabolocom QA members
// @access Public. (Server is using Jira auth from config)
router.get('/', async (req, res) => {
  try {
    const response = await jira.get(
      '/group/member?groupname=qa&includeInactiveUsers=true'
    );
    var QAteam = [];
    for (const value of response.data.values) {
      QAteam.push(value.name);
    }
    console.log(QAteam);
    res.json(QAteam);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error - QA member request to Jira');
  }
});

module.exports = router;
