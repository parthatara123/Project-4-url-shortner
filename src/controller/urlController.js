const UrlModel = require("../models/urlModel");
const shortid = require("shortid");
const redis = require("redis");
const { promisify } = require("util");
// const { REDIS_HOST_URL } = require('../config');

const isValid = function (value) {
  if (typeof value === "undefined" || typeof value === null) return false;
  if (typeof value === "string" && value.trim().length > 0) return true;
};

const isValidRequest = function (value) {
  return Object.keys(value).length > 0;
};

const isValidUrl = function (value) {
  let regexForUrl =
    /(:?^((https|http|HTTP|HTTPS){1}:\/\/)(([w]{3})[\.]{1})?([a-zA-Z0-9]{1,}[\.])[\w]*((\/){1}([\w@?^=%&amp;~+#-_.]+))*)$/;
  return regexForUrl.test(value);
};

//----------------------------------------Connect to redis-----------------------------------------------------

const redisClient = redis.createClient(
    13382,
  "redis-13382.c17.us-east-1-4.ec2.cloud.redislabs.com",
  { no_ready_check: true }
);

redisClient.auth("rLxkeq17soj8XM7QMQIHqwt4a2TIoOv4", function (err) {
  if (err) throw err;
});

redisClient.on("connect", async function () {
  console.log("connected to Redis..");
});

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);

//--------------------------------Function to create short URL-------------------------------------------------

const createShortUrl = async function (req, res) {
  const inputBody = req.body;
  const longUrl = req.body.longUrl;
  const inputQuery = req.query;
  const base = "htt://localhost:3000/";
  //Long URL Input must be given in request body
  if (!isValidRequest(inputBody)) {
    return res
      .status(400)
      .send({ status: false, message: "Please provide long url in input" });
  }
  // Only one input is valid
  if (Object.keys(inputBody).length > 1) {
    return res.status(400).send({ status: false, message: "invalid request" });
  }
  //Query params must be empty
  if (isValidRequest(inputQuery)) {
    return res.status(400).send({ status: false, message: "Invalid request" });
  }
  //Validation of provided long URL
  if (!isValid(longUrl)) {
    return res
      .status(400)
      .send({ status: false, message: "Please provide long url in input" });
  }

  if (!isValidUrl(longUrl)) {
    return res
      .status(400)
      .send({ status: false, message: "Provided Url is invalid" });
  }

  try {
    // first lets check catch memory has any data related to input longUrl

    const cacheURLData = await GET_ASYNC(longUrl); // longUrl must be in string, validation already done in above codes
    console.log(cacheURLData);

    if (cacheURLData) {
      const data = {
        urlCode: cacheURLData,
        longUrl: longUrl,
        shortUrl: base + cacheURLData,
      };
      res
        .status(200)
        .send({
          status: true,
          message: "Short Url created successfully",
          data: data,
        });
    } else {
      //As data is not available in cache memory, so lets check if data in available in DB
      const url = await UrlModel.findOne({ longUrl: longUrl }).select({
        shortUrl: 1,
        longUrl: 1,
        urlCode: 1,
        _id: 0,
      });
      // if data is present in DB, lets add this data in cache memory
      if (url) {
        const addingUrlInCacheByLongUrl = await SET_ASYNC(
          url.longUrl,
          url.urlCode
        );
        const addingUrlInCacheByUrlCode = await SET_ASYNC(
          url.urlCode,
          url.longUrl
        );

        res
          .status(201)
          .send({
            status: true,
            message: "Short Url created successfully",
            data: url,
          });
        //else we will create a new document in DB. Also add same data inside cache memory for future call
      } else {
        const urlCode = shortid.generate();
        const shortUrl = `${base} / ${urlCode}`;
        

        const urlData = {
          urlCode: urlCode,
          longUrl: longUrl,
          shortUrl: shortUrl,
        };

        const addingUrlInCacheByLongUrl = await SET_ASYNC(
          url.longUrl,
          url.urlCode
        );
        const addingUrlInCacheByUrlCode = await SET_ASYNC(
          url.urlCode,
          url.longUrl
        );

        const newUrl = await UrlModel.create(urlData);
        res
          .status(201)
          .send({
            status: true,
            message: "Short Url created successfully",
            data: newUrl,
          });
      }
    }
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};


const getOriginalUrl = async function (req, res) {
  const inputBody = req.body;
  const urlCode = req.params.urlCode;
  const inputQuery = req.query;

  if (isValidRequest(inputBody)) {
    return res.status(400).send({ status: false, message: "Invalid request" });
  }

  if (isValidRequest(inputQuery)) {
    return res.status(400).send({ status: false, message: "Invalid request" });
  }

  if (!isValid(urlCode)) {
    return res
      .status(400)
      .send({ status: false, message: "Please provide url code in input" });
  }

  try {

    //Check if data is available in cache memory
    const dataInCache = await GET_ASYNC(urlCode)

    if(dataInCache){
        console.log(dataInCache)
        return res.redirect(dataInCache)
    }else{

    const urlByUrlCode = await UrlModel.findOne({ urlCode: urlCode });
    console.log(urlByUrlCode);
    if (!urlByUrlCode) {
      return res
        .status(404)
        .send({
          status: false,
          message: "Provided url code is not available in DB",
        });
    }

    const addingUrlInCacheByLongUrl = await SET_ASYNC(urlCode, urlByUrlCode.longUrl)
    const addingUrlInCacheByUrlCode = await SET_ASYNC(urlByUrlCode.longUrl, urlCode)
    
    res.redirect(urlByUrlCode.longUrl);

}
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

module.exports.createShortUrl = createShortUrl;
module.exports.getOriginalUrl = getOriginalUrl;
