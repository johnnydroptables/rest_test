const request = require('request');

const url = 'http://resttest.bench.co/transactions';  // leave off trailing '/'
const pageLimit = 100; // safety margin

// --- HELPERS

/*
 * Floats are bad for money - especially in javascript. Last time I checked
 * there weren't too many transactions with 12.0000000000001 dollars.
 * this is actually fucking hard and i'm totally aware this doesn't handle all
 * of the use cases and that this could be faster.
 * this should handle
 * 0.00
 * 0.0
 * 0.01
 * 0.10
 * 0
 * patterns... I think.
 */
function parseCurrency(currency = '') {
  let [d, n] = currency.split(/\./);
  if (n == undefined) {
    n = "00";
  }

  if (n && n.length === 1) {
    n = n + "0";
  }

  if (n && n.length > 2) {
    throw new Error('unhandled currency format');
  }

  return parseInt(d + n);
}

function toTransaction(trx = {}) {
  return {
    date: trx.Date,
    ledger: trx.Ledger,
    amount: parseCurrency(trx.Amount),
    company: trx.Company
  };
}

function parseTransactions(trx = []) {
  return new Promise((resolve, reject) => {
    let res = [];
    try {
      res = trx.map(toTransaction)
    } catch (e) {
      reject(e);
    }
    resolve(res);
  });
}

function calculateTotal(trx = []) {
  const total = transactions.reduce((acc, val) => {
    return acc + val.amount;
  }, 0);
  
  return (total / 100).toFixed(2);
}

// --- API CLIENT METHODS

function getTransactions() {
  return new Promise((resolve, reject) => {
    let transactions = [];

    function recursiveFetch(page = 1) {
      const uri = `${url}/${page}.json`;

      // if we dont have a safe upper bounds we could go forever
      if (page > pageLimit) {
        const e = new Error(`exceeded page limit: ${pageLimit}`);
        reject(e);
      }

      request(uri, (err, res, body) => {
        let data = {};

        if (err) {
          reject(err);
        }
        
        try {
          data = JSON.parse(body);
        } catch (e) {
          reject(e);
        }

        transactions = transactions.concat(data.transactions);

        if (data.totalCount > transactions.length) {
          recursiveFetch(++page)
        } else {
          resolve(transactions);
        }
      });
    }

    recursiveFetch(1); // start process
  });
}

function printTotal() {
  getTransactions()
    .then(parseTransactions)
    .then(calculateTotal)
    .then(console.log)
    .catch(console.error);
};

//--- MAIN
printTotal();
