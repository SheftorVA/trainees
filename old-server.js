const fs = require('fs');
const http = require('http');
const path = require('path');
const url = require('url');
const mime = require('mime-types');
const bytes = require('bytes');
const pug = require('pug');
const express = require('express');

const app = express();

const renderError = pug.compile(
  fs.readFileSync(path.join(__dirname, 'views', 'error.pug'), 'utf8')
);

const fileIcon = fs
  .readFileSync(path.join(__dirname, 'static', 'file.png'))
  .toString('base64');

const folderIcon = fs
  .readFileSync(path.join(__dirname, 'static', 'folder.png'))
  .toString('base64');

const port = 3001;

const server = app.get('/', async (req, res) => {
  try {
    const originalPathname = url.parse(req.url).pathname;
    const pathname = decodeURIComponent(originalPathname);
    const basePath = path.join(__dirname, 'public');
    const entityPath = path.join(basePath, pathname);

    if (!entityPath.startsWith(basePath)) {
      res.sendStatus(403);
      res.render('error.pug', {
        httpText: 'Forbidden',
        message: 'This path is not allowed',
      });
      return;
    }

    const stats = await fs.promises.stat(entityPath);
    if (stats.isDirectory()) {
      const childrenNames = await fs.promises.readdir(entityPath);

      if (pathname !== '/') {
        childrenNames.push('..');
      }

      const promises = await Promise.allSettled(
        childrenNames.map(async (child) => {
          const childStats = await fs.promises.stat(
            path.join(entityPath, child)
          );

          return {
            name: child,
            href: path.posix.join(originalPathname, encodeURIComponent(child)),
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

      res.render('folder.pug', { pathname, children });
      return;
    }
    res.sendFile(entityPath, (err) => {
      res.sendStatus(500);
      res.render('error.pug', {
        httpText: 'Internal error',
        message: err.message,
      });
      res.end()
    });
    // file.on('error', (err) => {
    //   res.statusCode = 500;
    //   res.end(
    //     renderError({
    //       httpText: 'ReadableStream error',
    //       message: err.message,
    //     })
    //   );
    // });
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.statusCode = 404;
      res.end(
        renderError({
          httpText: 'Not found',
          message: 'No such file or directory',
        })
      );
      return;
    }
    if (err instanceof URIError) {
      res.statusCode = 400;
      res.end(
        renderError({
          httpText: 'Bad request',
          message: 'URI malformed',
        })
      );
      return;
    }
    res.statusCode = 500;
    res.end(
      renderError({
        httpText: 'Internal error',
        message: err.message,
      })
    );
  }
});
server.listen(port, () => {
  console.log(`server started at port ${port}`);
});
