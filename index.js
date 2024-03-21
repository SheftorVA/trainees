const express = require('express');
const students = require('./students');
const courses = require('./courses');

const app = express();
app.use('/students', students);
app.use('/courses', courses);
app.use('/', (req, res, next) => {
  res.status(404).json({ error: '404 Not found' });
  next();
});
app.use(function (err, req, res, next) {
  res.status(500).json({ error: err });
});
app.listen(3000);
