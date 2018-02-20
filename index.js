const fs = require("fs");
const glob = require("glob");
const Rx = require("rxjs");
const axios = require("axios");
const util = require("util");
const R = require("ramda");

require("dotenv").config();

const user = process.env.PINTUSER;
const accessToken = process.env.TOKEN;

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

const getImages = Rx.Observable.bindNodeCallback(glob);

function pint(endpoint, method = "get", data) {
  const url = `https://api.pinterest.com/v1/${endpoint}/?access_token=${accessToken}`;

  return axios({
    method,
    url,
    data
  });
}

async function addPin(data) {
  const { role, question, answer, description, image_base64 } = data;

  const pin = {
    board: `${user}/${question.replace(/ /g, "-")}`,
    note: description.replace(/\^/g, ":"),
    link: "http://www.tedbaker.com/",
    image_base64
  };

  try {
    const { data } = await pint("pins", "post", pin);

    return {
      [`${role}/${question}/${answer}`]: [data.data.id]
    };
  } catch (e) {
    console.log(e.response.data);

    return addPin(data);
  }
}

async function pinData(path) {
  const image_base64 = await readFile(path, "base64");
  const [role, question, answer, description] = path.split("/");

  return {
    role,
    question,
    answer,
    description,
    image_base64
  };
}

const csv = R.pipe(R.concat, R.join(","));

async function writeResults(data) {
  await writeFile("../result.json", JSON.stringify(data, null, " "));
  return data;
}

process.chdir("quiz");

getImages("**/*.*")
  .do(console.log)
  .mergeAll()
  .mergeMap(pinData)
  .mergeMap(addPin)
  .filter(Boolean)
  .reduce(R.mergeWith(csv))
  .mergeMap(writeResults)
  .subscribe(console.log, console.error);
