const Rx = require("rxjs");
const axios = require("axios");
const querystring = require("querystring");
const R = require("ramda");

require("dotenv").config();

const user = "alphashuro0dev";
const token = process.env.TOKEN;

function getPins() {
  const url =
    "https://api.pinterest.com/v1/me/pins/?" +
    querystring.stringify({
      access_token: token,
      limit: 100,
      fields: "id,note"
    });

  const nextPage = R.path(["data", "page", "next"]);
  const fetchIfNextPage = R.pipe(
    nextPage,
    R.ifElse(Boolean, axios, () => Rx.Observable.empty())
  );

  return Rx.Observable.fromPromise(axios(url))
    .expand(fetchIfNextPage)
    .filter(Boolean)
    .pluck("data", "data")
    .mergeAll();
}

function updateNote({ id, note }) {
  const url =
    `https://api.pinterest.com/v1/pins/${id}/?` +
    querystring.stringify({
      access_token: token
    });

  return axios.patch(url, { note }).then(({ data }) => data);
}

const hasExtention = R.propSatisfies(R.contains(".jpg"), "note");
const underscoreToQuote = R.replace(/_/g, "'");
const removeExtention = R.replace(/\s*.jpg$/, "");
const fixNote = R.pipe(underscoreToQuote, removeExtention);

getPins()
  .filter(hasExtention)
  .map(R.evolve({ note: fixNote }))
  .mergeMap(updateNote)
  .subscribe(console.log);
