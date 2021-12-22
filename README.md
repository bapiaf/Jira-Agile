# Jira-agile
Jira-based SCRUM/Sprint planning tool. 
  exposes a route to POST a JQL query
  returns a JSON ticket set that aggregates SCRUM data points (epics, versions, work logs for DEV and QA groups, etc.) by polling Jira's API
  requires a config file with Jira credentials and the members of the QA team (array of Jira usernames)
