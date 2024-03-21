const fs = require('fs');
const path = require('path');
const bytes = require('bytes');

const fileIcon = fs
  .readFileSync(path.join(__dirname, 'static', 'file.png'))
  .toString('base64');

const folderIcon = fs
  .readFileSync(path.join(__dirname, 'static', 'folder.png'))
  .toString('base64');

const express = require('express');
const app = express();

app.use('/', (req, res, next) => {
  req.decodedPath = decodeURIComponent(req.path);
  req.basePath = path.join(__dirname, 'public');
  req.entityPath = path.join(req.basePath, req.decodedPath);

  next();
});

app.use('/', async (req, res, next) => {
  const basePath = req.basePath;
  const entityPath = req.entityPath;

  if (!entityPath.startsWith(basePath)) {
    res.status(403);
    res.render('error.pug', {
      httpText: 'Forbidden',
      message: 'This path is not allowed',
    });
    res.end();
    return;
  }

  const stats = await fs.promises.stat(entityPath);
  if (stats.isDirectory()) {
    const childrenNames = await fs.promises.readdir(entityPath);

    if (req.path !== '/') {
      childrenNames.push('..');
    }

    const promises = await Promise.allSettled(
      childrenNames.map(async (child) => {
        const childStats = await fs.promises.stat(path.join(entityPath, child));

        return {
          name: child,
          href: path.posix.join(req.path, encodeURIComponent(child)),
          size: childStats.isDirectory() ? null : bytes(childStats.size),
          icon: `data:image/png;base64,${
            childStats.isDirectory() ? folderIcon : fileIcon
          }`,
          lastModified: childStats.mtime.toLocaleString('ru'),
        };
      })
    );

    const children = promises
      .filter(({ status }) => status === 'fulfilled')
      .map(({ value }) => value);

    children.sort((x, y) => {
      if (x.name === '..') return -1;
      if (y.name === '..') return 1;
      if (!x.size && y.size) return -1;
      if (x.size && !y.size) return 1;

      return x.name.localeCompare(y.name);
    });

    res.render('folder.pug', { pathname: req.decodedPath, children });
    return;
  }
  next();
});

app.use('/', express.static(path.join(__dirname, 'public')));

app.use('*', function (req, res, next) {
  res.status(404).send('Sorry cant find that!');
  next();
});

app.use((err, req, res, next) => {
  if (err.code === 'ENOENT') {
    res.status(404);
    res.render('error.pug', {
      httpText: 'Not found',
      message: 'No such file or directory',
    });
    return;
  }
  if (err instanceof URIError) {
    res.status(400);
    res.render('error.pug', {
      httpText: 'Bad request',
      message: 'URI malformed',
    });
    return;
  }
  res.status(500);
  res.render('error.pug', {
    httpText: 'Internal error',
    message: err.message,
  });
  if (res.headersSent) {
    return next(err);
  }
  res.status(500);
  res.render('error', { error: err });
});

app.listen(3001);
