const path = require('path');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(path.resolve(__dirname, 'db3.sqlite'));
const router = express.Router();

const getStudents = () => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT id, name, surname, birthday, email 
    FROM students`,
      (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      }
    );
  });
};

const getStudentById = (id, courses) => {
  if (courses === 'true') {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT s.id, name, surname, birthday, email, 
        GROUP_CONCAT(c.title, ';') courses 
        FROM students s 
        LEFT JOIN students_courses sc
        ON s.id = sc.student_id
        LEFT JOIN courses c
        ON c.id = sc.course_id
        WHERE s.id=$id`,
        { $id: id },
        (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        }
      );
    });
  }
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT id, name, surname, birthday, email FROM students WHERE id=$id`,
      { $id: id },
      (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      }
    );
  });
};

const addStudent = (name, surname, birthday, email) => {
  if (email) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO students(name, surname, birthday, email) VALUES($name, $surname, $birthday, $email)`,
        {
          $name: name,
          $surname: surname,
          $birthday: birthday,
          $email: email,
        },
        (err) => {
          if (err) reject(err);
          resolve();
        }
      );
    });
  }
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO students(name, surname, birthday) VALUES($name, $surname, $birthday)`,
      {
        $name: name,
        $surname: surname,
        $birthday: birthday,
      },
      (err) => {
        if (err) reject(err);
        resolve();
      }
    );
  });
};

const updateStudentById = (id, name, surname, birthday, email) => {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE students set name=$name, surname=$surname, birthday=$birthday, email=$email WHERE id=$id`,
      {
        $id: id,
        $name: name,
        $surname: surname,
        $birthday: birthday,
        $email: email,
      },
      (err) => {
        if (err) reject(err);
        resolve();
      }
    );
  });
};

const deleteStudent = (id) => {
  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM students WHERE id=$id`,
      {
        $id: id,
      },
      (err) => {
        if (err) reject(err);
        resolve();
      }
    );
  });
};

router.use(express.json());

router.get('/', async (req, res, next) => {
  try {
    const courses = await getStudents();
    res.json(courses);
  } catch (err) {
    next(err);
  }
});

/*

Возвращает объект студента с теми же полями, что и предыдущий. 
Если передан GET параметр courses=true, то еще и поле courses, 
которое будет массивом с названиями курсов, 
если студент не записан ни на какой курс, то будет пустой массив. 
Если параметра такого нет или он не равен true, то лишний JOIN делать не нужно.
Если студента нет вернуть 404 с каким-нибудь сообщением.
*/

router.get('/:id', async (req, res, next) => {
  try {
    let result;
    if (req.query.courses !== 'true') {
      result = await getStudentById(req.params.id);
    } else {
      result = await getStudentById(req.params.id, req.query.courses);
    }
    if (result.id) {
      res.json(result);
      return;
    }
    res.status(404).json({ error: '404 Not found' });
  } catch (err) {
    next(err);
  }
});

/*
  Добавляет студента, в теле должны быть поля name, surname, birthday и email,
  все они должны присутствовать и быть непустыми, кроме email, он может быть пустым, может быть null или отсутствовать вовсе. 
  Если придут еще и другие поля, просто их игнорировать. 
  Если email есть, то нужно сделать простую базовую валидацию, что он вида user@host.domain.
  Birthday должен быть датой в формате ISO 
  (например 2023-07-11T14:16:51.891Z, 2023-07-11 и прочие, которые при создании через new Date() не дадут Invalid Date),
  если у даты будет задано что-то кроме года, месяца и дня (часы, минуты, секунды), то их нужно отбросить.
  Если валидации прошли, то добавить запись в базу, вернуть статус 201 и что-нибудь в ответ.
  Если валидации не прошли, то вернуть статус 400 с описанием того, что не так.
*/

router.post('/', async (req, res, next) => {
  try {
    const { name, surname, birthday, email } = { ...req.body };

    if (isNaN(Date.parse(birthday))) {
      res.status(400).json({ error: 'Incorrect date' });
      return;
    }

    if (!(name && surname)) {
      res.status(400).json({ error: 'Name/Surname should not be empty' });
      return;
    }

    if (!(/^\w+@\w+\.\w+$/.test(email) || email == null)) {
      res.status(400).json({ error: 'Invalid email adress' });
      return;
    }

    await addStudent(name, surname, birthday, email);
    res.status(201).json({
      added: {
        name,
        surname,
        birthday,
        email,
      },
    });
  } catch (err) {
    next(err);
  }
});

/*

  Обновляет данные о студенте по id. 
  Валидации те же, что и при добавлении, в случае успеха 200, 
  в случае неправильных данных 400. 
  Если студента с таким id нет, вернуть 404.

*/

router.put('/:id', async (req, res, next) => {
  try {
    let { name, surname, birthday, email } = { ...req.body };
    const student = await getStudentById(req.params.id);
    if (!name) {
      name = student.name;
    }

    if (!birthday) {
      birthday = student.birthday;
    }

    if (!surname) {
      surname = student.surname;
    }

    if (isNaN(Date.parse(birthday))) {
      res.status(400).json({ error: 'Incorrect date' });
      return;
    }
    if (!(name && surname)) {
      res.status(400).json({ error: 'Name/Surname should not be empty' });
      return;
    }
    if (!(/^\w+@\w+\.\w+$/.test(email) || email == null)) {
      res.status(400).json({ error: 'Invalid email adress' });
      return;
    }

    await updateStudentById(req.params.id, name, surname, birthday, email);
    res.status(201).json({
      updated: {
        name,
        surname,
        birthday,
        email,
      },
    });
  } catch (err) {
    next(err);
  }
});

/*
  Удаляет студента. 
  Если студента с таким id нет, вернуть 404. 
  При успехе вернуть 200.
*/

router.delete('/:id', async (req, res, next) => {
  try {
    await deleteStudent(req.params.id);
    res.json({ id: req.params.id, status: 'deleted' });
  } catch (err) {
    next(err);
  }
});
router.use('/', (req, res, next) => {
  res.status(404).json({ error: '404 Not found' });
});

module.exports = router;
