const path = require('path');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(path.resolve(__dirname, 'db3.sqlite'));
const router = express.Router();

const getCourses = (queryTitle) => {
  let sql = `SELECT id, title FROM courses`;
  if (queryTitle) {
    sql = `SELECT id, title FROM courses WHERE title like $title`;
    return new Promise((resolve, reject) => {
      db.all(
        sql,
        {
          $title: `%${queryTitle}%`,
        },
        (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        }
      );
    });
  }
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
};

const getCourseByID = (id) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT id, title FROM courses WHERE id=?', id, (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
};

const addCourse = (course) => {
  return new Promise((resolve, reject) => {
    db.run(`INSERT INTO courses(title) VALUES(?)`, course, function (err) {
      if (err) reject(err);
      resolve(this.lastID);
    });
  });
};

const updateCourse = (id, title) => {
  return new Promise((resolve, reject) => {
    db.run('UPDATE courses set title=? WHERE id=?', title, id, function (err) {
      if (err) reject(err);
      resolve(this.changes);
    });
  });
};

const deleteCourse = (id) => {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM courses where id=${id}`, function (err) {
      if (err) reject(err);
      resolve(this.changes);
    });
  });
};

router.use(express.json());

router.get('/', async (req, res, next) => {
  try {
    const titles = req.query.title;

    if (!titles) {
      const courses = await getCourses();
      res.json(courses);
      return;
    }

    const courses = await getCourses(titles);
    res.json(courses);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await getCourseByID(req.params.id);
    if (result) {
      res.json(result);
      return;
    }
    res.status(404).json({ error: '404 Not found' });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const result = await addCourse(req.body.title);
    if (req.body.title.trim() && result) {
      res.status(201).json({ added: req.body.title });
      return;
    }
    res.status(400).json({ error: 'No/Empty title' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const result = await updateCourse(req.params.id, req.body.title);
    if (req.body.title) {
      if (result) {
        res.json({ updated: { id: req.params.id, title: req.body.title } });
        return;
      }
      res.status(404).json({ error: '404 Not found' });
      return;
    }
    res.status(400).json({ error: '400 No/Empty title' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await deleteCourse(req.params.id);
    if (!result) {
      res.status(404).json({ error: '404 Not found' });
      return;
    }
    res.json({ id: req.params.id, status: 'deleted' });
  } catch (err) {
    next(err);
  }
});
router.use('/', (req, res, next) => {
  res.status(404).json({ error: '404 Not found' });
});

module.exports = router;
