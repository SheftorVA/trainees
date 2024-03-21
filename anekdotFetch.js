const fetch = require('node-fetch').default;

function fetchAnekdot() {
  fetch('https://www.anekdot.ru/random/anekdot/')
    .then((response) => response.text())
    .then((htmlText) => {
      const divs = htmlText.match(
        /<div class="topicbox".+?<\/div><\/div><\/div>/g
      );

      const jokesData = divs.map((divElement) => {
        const id = +divElement.match(/data-id="(-?\d+)">/)[1];

        const text = divElement
          .match(/<div class="text">(.+?)<\/div>/)[1]
          .replace(/<br>/g, '\n');

        const dates = divElement
          .match(
            /<p class="title"><a href=".+">(\d{2}\.\d{2}\.\d{4})<\/a><\/p>/
          )[1]
          .replace(/(\d{2})\.(\d{2})\.(\d{4})/, '$3-$2-$1');

        const date = new Date(dates);

        const rating = +divElement.match(/data-r="(\d+);/)[1];

        let tags =
          divElement
            .match(/<div class="tags">.+?<\/div>/)?.[0]
            .split(',')
            .map((tag) => tag.match(/<a href=".+?">(.+)<\/a>/)[1]) || [];

        let author =
          divElement.match(
            /<a class="auth" href=".+">([^\u2605]+)<\/a>/u
          )?.[1] || null;

        return {
          id,
          text,
          date,
          rating,
          tags,
          author,
        };
      });
      console.log(jokesData);
    });
}

fetchAnekdot();
