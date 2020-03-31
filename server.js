const express = require('express');

const app = express();

app.get('/', (req, res) => res.send('API running'));

// Init Middleware
app.use(express.json({ extended: false }));

// Define Routes
app.use('/api/jql', require('./routes/api/jql'));
app.use('/api/jql2', require('./routes/api/jql2'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
