const express = require('express');
const app = express();
app.get('/', (req, res) => {
    res.redirect('/backend/public');
});

app.listen(3000);