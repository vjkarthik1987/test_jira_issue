const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
require('dotenv').config(); // Load environment variables from .env
const port = process.env.PORT || 4000;

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

let ticketStore = {};

// Serve the form to raise a ticket
app.get('/', (req, res) => {
  res.send(`
    <form action="/create-ticket" method="POST">
      <label>Title: </label><input type="text" name="title" required/><br/>
      <label>Description: </label><textarea name="description" required></textarea><br/>
      <input type="submit" value="Submit"/>
    </form>
  `);
});

// Create a ticket in JIRA
app.post('/create-ticket', async (req, res) => {
  const { title, description } = req.body;
  const jiraIssue = {
    fields: {
      project: { key: 'SSP' },
      summary: title,
      description: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: description }
            ]
          }
        ]
      },
      issuetype: { name: 'Functional Component' },
      customfield_10195: 'New Work Item which is not Considered in Baselined Core Service Design',
      customfield_10190: 'Business Process',
      customfield_10192: 'Random Text',
      customfield_10193: 'Platform'
    }
  };  

  try {
    const auth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
    const response = await fetch('https://myorgsite.atlassian.net/rest/api/3/issue', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jiraIssue),
    });
    const data = await response.json();
    console.log(data);

    // Store the ticket information (for display purposes)
    ticketStore[data.key] = { title, description, status: 'Created' };
    

    res.send(`Ticket created with JIRA Key: ${data.key}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error creating the ticket');
  }
});

// Webhook to receive updates from JIRA
app.post('/jira-webhook', (req, res) => {
  const issueKey = req.body.issue.key;
  const status = req.body.issue.fields.status.name;

  if (ticketStore[issueKey]) {
    ticketStore[issueKey].status = status;
  }

  res.status(200).send('Webhook received');
});

// View all tickets
app.get('/tickets', (req, res) => {
  const ticketList = Object.keys(ticketStore).map(key => {
    return `<li>${key}: ${ticketStore[key].title} - ${ticketStore[key].status}</li>`;
  }).join('');

  res.send(`<ul>${ticketList}</ul>`);
});

app.listen(port, () => console.log('Server is running'));