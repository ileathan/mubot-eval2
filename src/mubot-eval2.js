'use strict'

// Description:
//   Evaluates text against bots live code.
//
// Commands:
//   hubot eval me <text> - evaluate the text.


const _eval = require('eval');
const inspect = require('util').inspect;
const { curry, always, append, concat, ifElse, isEmpty, join, map, mergeAll, pipe, reject, test, repeat } = require('ramda');

const repeatStr = pipe(repeat, join(''))

const S = require('sanctuary');
const R = require('ramda');
const RF = require('ramda-fantasy');
const vm = require('vm');
const treisInit = require('treis').__init;


const wrap = curry((x, s) => x + s + x);
const mdLink = curry((text, url) => `[${text}](${url})`);
const mdBold = wrap('**');
const mdStrike = wrap('~~');
const mdPre = wrap('`');
const mdCode = curry((lang, str) => '```' + lang + '\n' + str + '\n```');
const mdHeader = (n, text) => [ '#'.repeat(n), text ].join(' ');



//module.exports = (robot) => {
//  robot.respond(/test/i, (msg) => {
//    msg.send('Working.')
//  })
//}
