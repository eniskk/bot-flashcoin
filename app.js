/*
    Defining dependencies
*/

var Discord = require('discord.js');
var client = new Discord.Client();
var moment = require('moment');
var jsonfile = require('jsonfile');
var request = require('request');


/*
    Defining files
*/

var file = './currencies.json';
var credentials = './credentials.json';


/*
    Setting required variables
*/

var delay = 60000;
var currencies;
var currencies_converted = [];


/*
    Beginning of the actual script
*/

allCrypto();

function allCrypto() {
  var currencies = jsonfile.readFileSync(file);
  currencies.forEach(function(entry) {
    requestCrypto(entry.name, entry.translate, entry.amount);
  });
}

function requestCrypto(crypto, translate, amount) {
  var requestMap = 'https://min-api.cryptocompare.com/data/price?fsym=' + crypto + '&tsyms=' + translate;
  request(requestMap, function(error, response, body) {
    var info = JSON.parse(body);

    // Reading in current currencies
    var currencies = jsonfile.readFileSync(file);

    // Removing previous crypto data from list
    var temp_currencies = [];
    for (var i in currencies)
      if (currencies[i].name != crypto)
        temp_currencies[temp_currencies.length] = currencies[i];
    currencies = temp_currencies;

    // Adding new crypto data to list
    var name = crypto;
    var amount = info[translate];
    currencies = [...currencies, {
      name,
      translate,
      amount
    }]

    // Writing out updated currencies
    jsonfile.writeFileSync(file, currencies, {
      spaces: 2
    });

    //console.log(crypto + ': ' + info[translate] + " " + translate)
    sortCrypto();
  });
}

function sortCrypto() {

  var currencies = jsonfile.readFileSync(file);
  currencies.sort(sortNumber);
  jsonfile.writeFileSync(file, currencies, {
    spaces: 2
  });

}

function sortNumber(a, b) {
  return b.amount - a.amount;
}

function status() {

}

client.on('message', msg => {

  if (msg.author.id == "329331452040708096") {
    return;
  }

  if (msg.content.toLowerCase() == prefix + "crypto") {

    currencies = jsonfile.readFileSync(file);
  currencies.forEach(function(entry) {

    // var emoji;
    //
    // var cryptoOld = entry.amount
    //
    // var cryptoNew;
    //
    // if (cryptoNew >= cryptoOld) {
    //   emoji = ":chart_with_upwards_trend:";
    // }
    //    // if (cryptoNew < cryptoOld) {
    //   emoji = ":chart_with_downwards_trend:";
    // }

    currencies_converted.push({
      name: ":chart_with_upwards_trend:" + ' __' + entry.name + ':__',
      value: 'Current exchange rate for ' + entry.name + '\n**' + entry.amount + ' ' + entry.translate + '!**',
      inline: true

    });

  });

  var embed = {
    color: 0xFFFFFF,
    author: {
      name: "Current Crypto Currency Exchange Rates",
      icon_url: 'https://i.4da.ms/Bitcoin-icon.png'
    },
    //title: "",
    description: '\n» Data gets updated **every minute**.\n» Source code available on **[GitHub](https://github.com/4dams)**!',
    footer: {
      text: 'Source code on GitHub.com/4dams | CryptoCurrency Bot @ ' + moment().format('LTS'),
      icon_url: client.user.avatarURL
    },
    fields: currencies_converted,
  }

  console.log('Crypto Currency Stats requested.')

  msg.channel.send({embed});

  currencies_converted = [];

  }

});

client.on('ready', function() {
  status(); // Sets the bot status
  console.log('|----------------------------------------------------|');
  console.log('|                                                    |');
  console.log('|   CryptoCurrency(-Bot) online and ready to use!    |');
  console.log('|         - Current Verison: 2.6 by 4dams -          |');
  console.log('|                Contact: 4dams#3082                 |');
  console.log('|                                                    |');
  console.log('|----------------------------------------------------|');
  console.log('| Autoupdater requested.                             |');
  console.log('|----------------------------------------------------|')

  setInterval(function() {
    status();
  }, delay);

});

client.login(credentials.discord.token);
