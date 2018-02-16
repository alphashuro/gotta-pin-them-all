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

process.chdir("quiz");

getImages("**/*.*")
  .mergeAll()
  .do(console.log)
  .mergeMap(async path => {
    const image_base64 = await readFile(path, "base64");
    const [role, question, answer, description] = path.split("/");

    const pin = {
      board: `${user}/${question.replace(/ /g, "-")}`,
      note: description.replace(/\^/g, ":"),
      link: "http://www.tedbaker.com/",
      image_base64
    };

    console.log(pin.board);

    try {
      const { data } = await axios.post(
        `https://api.pinterest.com/v1/pins/?access_token=${accessToken}`,
        pin
      );

      return {
        [`${role}/${question}/${answer}`]: [data.data.id]
      };
    } catch (e) {
      console.log(e.response.data);
    }
  })
  .filter(Boolean)
  .reduce(R.mergeWith(R.compose(R.join(","), R.concat)))
  .mergeMap(async pins => {
    await writeFile("../result.json", JSON.stringify(pins, null, " "));
    return pins;
  })
  .subscribe(console.log, console.error);
