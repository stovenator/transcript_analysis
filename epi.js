'use strict';

let _ = require('lodash');
let Promise = require('bluebird');
let request = Promise.promisifyAll(require('request'), {mulitArgs: true});


class Epiquery {
  constructor(options = {verbose: true}) {
    this.glglive = this.mysql
    this.host = process.env['EPIQUERY_STREAMING'] || 'http://localhost:9730/epiquery1/glglive';
  }

  query(template, params) {
    let opts = {
      url: `${this.host}/transcripts/consultations/v2/${template}.mustache`,
      body: params,
      json: true
    }
    return request.postAsync(opts)
      .then((response, body) => {
        if (response.statusCode != 200) {
          console.error(response.body);
          console.error((response.body.error || 'error calling epi-query') + '[statusCode:' + response.statusCode + '][template:' + template + ']' );
          return [];
        }
        return response.body || [];
      })
      .map(row => {
        return _.reduce(row, (result, value, key) => {
          if (_.isString(value)) {
            value = value.trim();
          }
          result[_.camelCase(key)] = value;
          return result
        }, {});
      });
  }

  mysql(arr) { 
    _.reduce(arr, (acc, col) => {
    }, {});
  }
}

module.exports = Epiquery;

