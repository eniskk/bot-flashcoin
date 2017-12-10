/*
    Defining dependencies
*/

var Discord = require('discord.js');
var client = new Discord.Client();
var moment = require('moment');
var jsonfile = require('jsonfile');
var request = require('request');
var schedule = require('node-schedule');


/*
    Defining files
*/

var currencydb = './currencies.json';
var serverdb = './servers.json';
var credentials = require('./credentials.json');


/*
    Setting required variables
*/

var prefix = '/';
var delay = 60000;
var currencies;
var currencies_converted = [];
var found;


/*
    Request arguments (temporarily stored here)
*/

var translate = "EUR";
var limit = "10";


/*
    Beginning of the actual script
*/

allCrypto(translate, limit);

function allCrypto(translate, limit) {
  var requestMap = 'https://api.coinmarketcap.com/v1/ticker/?convert=' + translate + '&limit=' + limit;
  request(requestMap, function(error, response, body) {
    var info = JSON.parse(body);

    // Reading in current currencies
    var currencies = jsonfile.readFileSync(currencydb);

    info.forEach(function(entry) {

      // Removing previous crypto data from list
      var temp_currencies = [];
      for (var i in currencies)
        if (currencies[i].name != entry.name)
          temp_currencies[temp_currencies.length] = currencies[i];
      currencies = temp_currencies;

      // Adding new crypto data to list
      var name = entry.name;
      var symbol = entry.symbol;
      var rank = entry.rank;
      var perc_1h = entry.percent_change_1h;
      var perc_24h = entry.percent_change_24h;
      var perc_7d = entry.percent_change_7d;
      var amount = Math.round(entry.price_eur * 100) / 100;

      currencies = [...currencies, {
        name,
        symbol,
        rank,
        perc_1h,
        perc_24h,
        perc_7d,
        amount,
        translate
      }]

      // Writing out updated currencies
      jsonfile.writeFileSync(currencydb, currencies, {
        spaces: 2
      });

    })

    //console.log(crypto + ': ' + info[translate] + " " + translate)
    sortCrypto();
  });
}

function sortCrypto() {

  var currencies = jsonfile.readFileSync(currencydb);
  currencies.sort(sortNumber);
  jsonfile.writeFileSync(currencydb, currencies, {
    spaces: 2
  });

}

function sortNumber(a, b) {
  return b.amount - a.amount;
}

function status() {
  client.user.setGame('Write "/crypto" to get started!');
}

var j = schedule.scheduleJob('00 * * * * *', function() {
  // Refreshing all crypto information exactly on the minute
  // in order to sync with the API
  allCrypto(translate, limit);
});

client.on('message', msg => {

  if (msg.author.id == "329331452040708096") {
    return;
  }

  if (msg.content.toLowerCase() == prefix + "crypto") {

    // Checking server database if there's a special currency set for the server
    servers = jsonfile.readFileSync(serverdb);

    for (var i in servers) {
      if (servers[i].serverId == msg.guild.id) {
        // If there was one found, we're sending a special message

        // We take the currency out of the serverdb
        var translate = servers[i].currency_converted;

        // we put the currency to lowercase in order for the api to recognize it
        var translated_currency = "price_" + translate.toLowerCase();

        var requestMap = 'https://api.coinmarketcap.com/v1/ticker/?convert=' + translate + '&limit=' + limit;
        request(requestMap, function(error, response, body) {

          var info = JSON.parse(body);
          var currencies_special = info;

          info.forEach(function(entry) {

            var emoji;

            if (entry.percent_change_24h >= 0) {
              emoji = ":chart_with_upwards_trend:";
              indicator = '+';
            } else {
              emoji = ":chart_with_downwards_trend:";
              indicator = '';
            }

            var amount_rounded = Math.round(entry[translated_currency] * 100) / 100;

            currencies_converted.push({
              name: emoji + ' __' + entry.name + ':__',
              value: 'Current exchange for ' + entry.symbol + ':\n**' + entry[translated_currency] + ' ' + translate + '** (' + indicator + entry.percent_change_24h + '% in 24h)',
              inline: true
            });

          }); // End ForEach

          var embed = {
            color: 0xFFFFFF,
            // author: {
            //   name: "Current Crypto Currency Exchange Rates",
            //   icon_url: 'https://i.4da.ms/Bitcoin-icon.png'
            // },
            title: "Crypto Currency Exchange Rates",
            url: "https://crypto.4da.ms/",
            description: '\n» Data gets updated **every minute**.\n» Source code and more: **[crypto.4da.ms](https://crypto.4da.ms)**!',
            footer: {
              text: 'Via "/crypto" | CryptoCurrency Bot @ ' + moment().format('LTS'),
              icon_url: client.user.avatarURL
            },
            fields: currencies_converted,
          }

          console.log('| Crypto status requested                            |');
          console.log('|----------------------------------------------------|');

          msg.channel.send('[<@' + msg.author.id + '>] Here are your requested exchange rates!')
          msg.channel.send({
            embed
          });

          currencies_converted = [];
        });

      } else {
        // If there wasn't anything found, we're gonna send a default "EUR" message

        // Here follows the default process of sending a message
        currencies = jsonfile.readFileSync(currencydb);
        currencies.forEach(function(entry) {

          var emoji;

          if (entry.perc_24h >= 0) {
            emoji = ":chart_with_upwards_trend:";
            indicator = '+';
          } else {
            emoji = ":chart_with_downwards_trend:";
            indicator = '';
          }

          currencies_converted.push({
            name: emoji + ' __' + entry.name + ':__',
            value: 'Current exchange for ' + entry.symbol + ':\n**' + entry.amount + ' ' + entry.translate + '** (' + indicator + entry.perc_24h + '% in 24h)',
            inline: true

          });

        });

        var embed = {
          color: 0xFFFFFF,
          // author: {
          //   name: "Current Crypto Currency Exchange Rates",
          //   icon_url: 'https://i.4da.ms/Bitcoin-icon.png'
          // },
          title: "Crypto Currency Exchange Rates",
          url: "https://crypto.4da.ms/",
          description: '\n» Data gets updated **every minute**.\n» Source code and more: **[crypto.4da.ms](https://crypto.4da.ms)**!',
          footer: {
            text: 'Via "/crypto" | CryptoCurrency Bot @ ' + moment().format('LTS'),
            icon_url: client.user.avatarURL
          },
          fields: currencies_converted,
        }

        console.log('| Crypto status requested                            |');
        console.log('|----------------------------------------------------|');

        msg.channel.send('[<@' + msg.author.id + '>] Here are your requested exchange rates!')
        msg.channel.send({
          embed
        });

        currencies_converted = [];

      }

    }
  };

  if (msg.content.toLowerCase().startsWith(prefix + "setcurrency")) {
    var split = msg.content.split(' ');

    // Defining the specified currency
    var currency = split[1];

    if (currency) { // Checking if a currency has been specified (true if currency is not null, undefined, 0, NaN...)

      var currency_converted = currency.toUpperCase(); // Converting the currency to all uppercase
      msg.channel.send('This server\'s default currency has been set to **' + currency_converted + '**!');

      var servers = jsonfile.readFileSync(serverdb);

      var serverId = msg.guild.id

      // Removing old server settings if there are any
      var temp_servers = [];
      for (var i in servers)
        if (servers[i].serverId != msg.guild.id)
          temp_servers[temp_servers.length] = servers[i];
      servers = temp_servers;

      // Adding new server settings
      servers = [...servers, {
        serverId,
        currency_converted
      }]

      // Writing out the new settings
      jsonfile.writeFileSync(serverdb, servers, {
        spaces: 2
      });

    } else { // If no currency has been specified
      msg.channel.send('**You have to specify a currency!**\nType "/currencies" for a list of all available currencies!');
    }
  };

  if (msg.content.toLowerCase() == prefix + "currencies") {
    msg.channel.send('Here\'s a list of all available currencies:\n```USD, DKK, JPY, PLN, AUD, EUR, KRW, RUB, BRL, GBP, MXN, SEK, CAD, HKD, MYR, SGD, CHF, HUF, NOK, THB, CLP, CLP, IDR, NZD, TRY, CNY, ILS, PHP, TWD, CZK, INR, PKR and ZAR```');
  };

});

client.on('ready', function() {
  console.log('|----------------------------------------------------|');
  console.log('|                                                    |');
  console.log('|   CryptoCurrency(-Bot) online and ready to use!    |');
  console.log('|         - Current Verison: 3.0 by 4dams -          |');
  console.log('|                Contact: 4dams#0001                 |');
  console.log('|                                                    |');
  console.log('|----------------------------------------------------|');
  console.log('| Currencies updating every minute.                  |');
  console.log('|----------------------------------------------------|');

  status();

  setInterval(function() {
    status();
  }, delay);

});

client.login(credentials.discord.token);
