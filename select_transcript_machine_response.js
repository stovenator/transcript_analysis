#!/usr/bin/env node 

'use strict';

const Epiquery = require('./epi.js');
const through       = require('through');
const byline       = require('byline');
const _            = require('lodash');
const Promise = require('bluebird');
const fs = require('fs');

const epi = new Epiquery();
const pathName = 'downloads/'

const fetch = function(args) {
  let ids = {cpids: []};
  for (let arg in args){
    if (args[arg].length == 2){
      // We already have a transcript from both google and voicebase
      ids.cpids.push(arg);
    }
  }
  return epi.query('select_transcripts_machine_response', ids)
    .catch(err => console.error(err));
};

const mkdir = () => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(pathName)){
        fs.mkdirSync(pathName);
    }
    resolve('');
  });
}

const getExistingFiles = () => {
  return new Promise((resolve, reject) => {
    var results = [];
    fs.readdir(pathName, function(err, items) {
        for (let filename of items) {
          let split = filename.substring(0, filename.length - 4).split('_');
          let provider = split[0];
          let cpid = split[1];
          let transcript_id = split[2];

          if (results[cpid]){
            results[cpid].push({provider: provider});
          }
          else{
            results[cpid] = [{provider: provider}];
          }
        }
        resolve(results)
    });
  });

}

const transform = (data) => {
  for (let row of data){
      row.transcript = '';
      let content = JSON.parse(row.content);
      if (row.provider == 'google'){
        for (let googleTranscript of content.results){
           row.transcript = row.transcript + ' ' + googleTranscript.alternatives[0].transcript;
           //console.log(googleTranscript.alternatives[0].transcript)
        }
      }
      else if (row.provider == 'voicebase'){
        for (let word of content.transcripts.latest.words){
           row.transcript = row.transcript + ' ' + word.w;      
           //console.log(word.w)
        }
      }
  }

  return data;
}

const out = (data) => {
  for (let row of data){
    let filename = row.provider + '_' + row.cpid + '_' + row.transcriptId + '.txt';
    var transcript = row.transcript;
    fs.writeFile(pathName + filename, transcript, function(err) {
        if(err) {
            return console.log(err);
        }
    }); 
  }
  return data;

}

const getFullTranscripts = (data) => {
  let ids = {cpids: []};
  for (let row of data){
    ids.cpids.push(row.cpid);
  }
  return epi.query('select_transcripts_final', ids)
    .catch(err => console.error(err));
}

const writeFullTranscript = (data) => {
  for (let row of data){
    let filename = 'full_' + row.cpid + '_' + row.transcriptId + '.txt';
    var transcript = row.transcript;
    fs.writeFile(pathName + filename, transcript, function(err) {
        if(err) {
            return console.log(err);
        }
    }); 
  }
  return data;
}
const transformFinal = (data) => {
  for (let row of data){
      row.transcript = '';
      let content = JSON.parse(row.content);
      for (let paragraph of content.timestampedParagraphs){
        for (let snippet of paragraph){
          //console.log("Snippet: ", snippet);
          row.transcript = row.transcript + ' ' + snippet.text;
        }
      }
  }

  return data;
}


Promise.resolve('')
  .then(mkdir)
  .then(getExistingFiles)
  .then(fetch)
  .then(transform)
  .then(out)
  .then(getFullTranscripts)
  .then(transformFinal)
  .then(writeFullTranscript);
