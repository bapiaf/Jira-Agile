const express = require('express');

const app = express();

app.get('/', (req, res) => res.send('API running'));

// Init Middleware
app.use(express.json({ extended: false }));

// Define Routes
app.use('/api/jql', require('./routes/api/jql'));
app.use('/api/worklog', require('./routes/api/worklog'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
