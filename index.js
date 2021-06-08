// Required External Modules

const express = require("express");
const cors = require("cors");
const axios = require("axios");

// App Vars

const normalizePort = (port) => parseInt(port, 10);
const port = normalizePort(process.env.PORT || "8000");

const app = express();
const dev = app.get("env") !== "production";

if (!dev) {
  app.disable("x-powered-by");
  app.use(cors());
} else {
  app.use(
    cors({
      origin: ["http://localhost:3000", "http://192.168.68.56:3000"],
    })
  );
}

app.listen(port, () => {
  console.log("Server started on port: " + port);
});

// Api Tokens

const cmcHeaderToken = [
  "cd9a397f-6f4f-4de7-9051-95286826b9c2",
  "0fc2b9f7-8a89-4b5e-970a-887f69efa87c",
];
const newsHeaderToken = "440d84d389b84571a1a0b2644c9bcafd";
const twitterBearerToken =
  "AAAAAAAAAAAAAAAAAAAAAFiMQAEAAAAAA2sVImd%2B0uOH7mpj0NYMEmejCRU%3De4wrdHT9wX5ElfV5ZYJXpoWApb7L0VWXI0z9t2oExPrWaTYDw6";

const vader = require("vader-sentiment");

// Oldest date

let startDate = new Date();
startDate.setDate(startDate.getDate() - 1.5);

// save

let newsData = {};
let cmcTickerData = {};
let cmcLatestData = [];

let newsCurrentToken = Math.random();
let cmcCurrentToken = Math.random();

setInterval(() => (newsCurrentToken = Math.random()), 3600000);
setInterval(() => (cmcCurrentToken = Math.random()), 600000);

// Math functions

const e = 2.718281828459045235360287471352662497757247093699959574966967;

const activationFunc = (x) => {
  return x / Math.sqrt(x * x + 15);
};

const activationFuncInv = (x) => {
  return (Math.sqrt(15) * x) / Math.sqrt(1 - x * x);
};

const pricePercentSentimence = (x) => {
  if (x < 0) {
    return Math.log((-1 - x) / (x - 1)) / e;
  } else {
    return (Math.pow(e, 2 * x) - 1) / Math.pow(e, 2 * x);
  }
};

const dataSort = (list, targetSentiment) => {
  const mergeSort = (array) => {
    if (array.length <= 1) {
      return array;
    }

    const middleIndex = Math.floor(array.length / 2);
    const leftArray = array.slice(0, middleIndex);
    const rightArray = array.slice(middleIndex);

    return merge(mergeSort(leftArray), mergeSort(rightArray));
  };

  const merge = (leftArray, rightArray) => {
    let temp = [];
    let leftIndex = 0;
    let rightIndex = 0;

    while (leftIndex < leftArray.length && rightIndex < rightArray.length) {
      if (
        Math.abs(leftArray[leftIndex].sentiment - targetSentiment) <
        Math.abs(rightArray[rightIndex].sentiment - targetSentiment)
      ) {
        temp.push(leftArray[leftIndex]);
        leftIndex++;
      } else {
        temp.push(rightArray[rightIndex]);
        rightIndex++;
      }
    }

    return temp
      .concat(leftArray.slice(leftIndex))
      .concat(rightArray.slice(rightIndex));
  };

  return mergeSort(list);
};

// Api Functions

const cmcLatestResponse = async (start, end) => {
  try {
    let url =
      "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest";
    url += "?start=" + start;
    url += "&limit=" + (end - start + 1);
    const response = await axios.get(url, {
      headers: {
        "X-CMC_PRO_API_KEY": cmcHeaderToken[0],
      },
    });
    return response.data;
  } catch (e) {
    console.log(e.response.data);
  }
};

const filterCmcLatestResponse = (data) => {
  try {
    const array = [
      {
        total: data.status.total_count,
      },
      {
        data: data.data.map((coin) => {
          return {
            id: coin.id,
            rank: coin.cmc_rank,
            name: coin.name,
            symbol: coin.symbol,
            price: coin.quote.USD.price,
            pc_hour: coin.quote.USD.percent_change_1h,
            pc_day: coin.quote.USD.percent_change_24h,
            pc_week: coin.quote.USD.percent_change_7d,
          };
        }),
      },
    ];
    return array;
  } catch (e) {
    console.log(e);
  }
};

const cmcTickerResponse = async (ticker) => {
  try {
    let url =
      "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest";
    url += "?symbol=" + ticker;
    const response = await axios.get(url, {
      headers: {
        "X-CMC_PRO_API_KEY": cmcHeaderToken[1],
      },
    });
    return response.data.data[ticker];
  } catch (e) {
    try {
      let url =
        "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest";
      url += "?slug=" + ticker.toLowerCase();
      const response = await axios.get(url, {
        headers: {
          "X-CMC_PRO_API_KEY": cmcHeaderToken[1],
        },
      });
      return response.data.data[Object.keys(response.data.data)[0]];
    } catch (e) {}
  }
};

const filterCmcTickerResponse = (data) => {
  try {
    const array = {
      id: data.id,
      cmc_rank: data.cmc_rank,
      name: data.name,
      symbol: data.symbol,
      date_added: data.date_added,
      max_supply: data.max_supply,
      circulating_supply: data.circulating_supply,
      platform: data.platform,
      price: data.quote.USD.price,
      volume_day: data.quote.USD.volume_24h,
      market_cap: data.quote.USD.market_cap,
      pc_hour: data.quote.USD.percent_change_1h,
      pc_day: data.quote.USD.percent_change_24h,
      pc_week: data.quote.USD.percent_change_7d,
      pc_month: data.quote.USD.percent_change_30d,
      tags: data.tags.map((index) => {
        return index;
      }),
    };
    return array;
  } catch (e) {}
};

const getNews = async (keyword) => {
  try {
    let url =
      "https://newsapi.org/v2/everything?language=en&pageSize=100&sortBy=relevancy&domains=abcnews.go.com,afr.com,axios.com,bbc.co.uk/news,bloomberg.com,cbc.ca/news,cbsnews.com,us.cnn.com,ccn.com,business.financialpost.com,fortune.com,foxnews.com,news.google.com,news.ycombinator.com,msnbc.com,nationalreview.com/,nbcnews.com,nymag.com";
    url += "&qInTitle=" + keyword;
    url += "&q=+" + keyword + " OR crypto";
    url += "&from=" + startDate.toISOString();
    const response = await axios.get(url, {
      headers: {
        "X-Api-Key": newsHeaderToken,
      },
    });
    return response.data;
  } catch (e) {
    console.log(e);
  }
};

const getNewsSentiment = (data, delta) => {
  let articleCount = 0;
  let sentimentCount = 0;
  try {
    const array = {
      articles: dataSort(
        data.articles.map((article) => {
          articleCount++;
          sentimentCount += activationFuncInv(
            vader.SentimentIntensityAnalyzer.polarity_scores(
              article.description + " " + article.content
            ).compound
          );
          return {
            source: article.source.name,
            title: article.title,
            author: article.author,
            description: article.description,
            url: article.url,
            image: article.urlToImage,
            date: article.publishedAt,
            content: article.content,
            sentiment:
              vader.SentimentIntensityAnalyzer.polarity_scores(
                article.description + " " + article.content
              ).compound * 100,
          };
        }),
        delta
      ),
      sentiment: activationFunc(sentimentCount / articleCount) * 100,
      total_count: data.totalResults,
      res_count: articleCount,
    };
    return array;
  } catch (e) {
    console.log(e);
  }
};

const getTwitter = async (keyword) => {
  try {
    let url =
      "https://api.twitter.com/2/tweets/search/recent?&max_results=100 -%23crypto -%23cryptocurrency";
    url += "&query=" + keyword + " %23" + keyword + " -is:retweet lang:en";
    if (keyword.toUpperCase() !== "BITCOIN") {
      url += " -%23bitcoin";
    }
    if (keyword.toUpperCase() !== "DOGECOIN") {
      url += " -%23dogecoin";
    }
    if (keyword.toUpperCase() !== "ETHEREUM") {
      url += " -%23ethereum";
    }
    if (keyword.toUpperCase() !== "CARDANO") {
      url += " -%23cardano";
    }
    url += "&start_time=" + startDate.toISOString();

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${twitterBearerToken}` },
    });
    const array = {
      sentiment: getTwitterSentiment(response.data.data),
      res_count: response.data.meta.result_count,
      tweets: response.data.data
        .map((tweet) => {
          return { id: tweet.id };
        })
        .splice(1, 20),
    };
    return array;
  } catch (e) {
    //console.log(e);
  }
};

const getTwitterSentiment = (data) => {
  let val = 0;
  let count = 0;

  for (i in data) {
    val += activationFuncInv(
      vader.SentimentIntensityAnalyzer.polarity_scores(data[i].text).compound
    );
    count++;
  }

  return activationFunc(val / count) * 100;
};

// Route Definitions

app.get("/data/latest", async (req, res) => {
  const start = req.query.start;
  const end = req.query.end;
  const index = Math.floor(start / 100);
  try {
    if (cmcLatestData[index].token == cmcCurrentToken) {
    } else {
      cmcLatestData[index] = {
        token: cmcCurrentToken,
        data: filterCmcLatestResponse(await cmcLatestResponse(start, end)),
      };
    }
  } catch (e) {
    cmcLatestData[index] = {
      token: cmcCurrentToken,
      data: filterCmcLatestResponse(await cmcLatestResponse(start, end)),
    };
  }
  res.status(200).send(cmcLatestData[index].data);
});

app.get("/data/ticker", async (req, res) => {
  const ticker = req.query.ticker.toUpperCase();
  try {
    if (cmcTickerData[ticker].token == cmcCurrentToken) {
    } else {
      const data = filterCmcTickerResponse(
        await cmcTickerResponse(ticker.toUpperCase())
      );
      cmcTickerData[data.name.toUpperCase()] = {
        token: cmcCurrentToken,
        data: data,
      };
      cmcTickerData[data.symbol.toUpperCase()] = {
        token: cmcCurrentToken,
        data: data,
      };
    }
  } catch (e) {
    const data = filterCmcTickerResponse(await cmcTickerResponse(ticker));
    cmcTickerData[data.name.toUpperCase()] = {
      token: cmcCurrentToken,
      data: data,
    };
    cmcTickerData[data.symbol.toUpperCase()] = {
      token: cmcCurrentToken,
      data: data,
    };
  }
  res.status(200).send(cmcTickerData[ticker.toUpperCase()].data);
});

app.get("/rtdata/news", async (req, res) => {
  const keyword = req.query.keyword;
  let delta = 0;
  if (req.query.delta !== undefined) {
    delta = pricePercentSentimence(req.query.delta) * 100;
  }
  try {
    if (newsData[keyword].token == newsCurrentToken) {
    } else {
      newsData[keyword] = {
        token: newsCurrentToken,
        data: {
          news: getNewsSentiment(await getNews(keyword), delta),
          twitter: await getTwitter(keyword),
        },
      };
    }
  } catch (e) {
    newsData[keyword] = {
      token: newsCurrentToken,
      data: {
        news: getNewsSentiment(await getNews(keyword), delta),
        twitter: await getTwitter(keyword),
      },
    };
  }
  res.status(200).send(newsData[keyword].data);
});
