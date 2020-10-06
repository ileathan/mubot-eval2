// Description:
//  evaluate commands against live code. (No need to hotreload)
//
// Commands:
//  !always [on/off] - Allows execution of code placed anywhere in text like `bot.name`
//  \`\`\`'Hello, World!'\`\`\` - Executes the command against the bots live code.
//
(function(){
// Delarations
let bot = null;
const l = {};
// Imports.
const myEval = require('eval'); // '_' just to not overwrite this.eval.
const {inspect} = require('util');
// Show our imports.
l.exports = _bot => {
  bot = _bot;
  //l.utils.preventHacks();
  // Load evals and config from brain.
  bot.brain.on('all loaded', () => {
    Object.assign(l, bot.brain.data.eval || (
      bot.brain.data.eval = {
        log: {},
        saved: {},
        always: {},
        config: { maxCmdLen: 20, maxMsgLen: 1917, sudoers: ['183771581829480448', 'U02JGQLSQ'] }
      }
    ))
    ;
    // Export to mubot.
    bot.mubot.eval = l;
  });
  // Capture all markdown formatted code.
  bot.hear(
    RegExp('^(?:[!]|(?:[@]?'+(bot.name||bot.alias)+'\s*[:,]?\s*[!]))(.+)', 'i'),
    _=>l.utils.processMessage(_)
  );
  bot.respond(/`((?:\\.|[^`])+)`|```((?:.|\n)+)\n?```/i, res => {
    res.match[1] = res.match[1] || res.match[2];
    l.always[res.message.user.id] ||
      l.create(res)
    ;
  });

  bot.hear(/^(?![!])[^!]*?(?:`((?:\\.|[^`])+)`|```((?:.|\n)+)\n?```)/i, res => {
    res.match[1] = res.match[1] || res.match[2];
    l.always[res.message.user.id] &&
      l.create(res)
    ;
  })
  ;
}
;
l.imports = { eval: myEval, inspect };
Object.defineProperties(l, {
  exports: {enumerable: false},
  imports: {enumerable: false}
})
;
module.exports = l.exports
;
// API
l.create = (res = {send: _=>_}) => {
  let cmd = res.match[1], evalCmd = cmd,
      id = res.message.user.id,
      userOpts = (res.match.input||"").split('`').pop(),
      // Remove sensitive data from bot.
      opts = [], o = ""
  ;
  // Set command options.
  if(l.config.sudoers.includes(id)) {
     opts = [{bot, res, http: bot.http, mubot: bot.mubot, leat: bot.leat, bitmark: bot.bitmark}, true];
  } else {
     opts = [{http: bot.http}, false];
  }
  // Sanitize the command. 
  if(!/module[.]exports\s*=/.test(cmd)) {
    !/return .+/.test(cmd) && (
      evalCmd = evalCmd.replace(/(?:\n(.+)|(.+))$/, 'return $2$1')
    );
    evalCmd = 'module.exports=(()=>{' + evalCmd + '})()';
  }
  // filename is the second param.
  try {
    o = myEval(evalCmd, bot.name + "_" + res.message.user.name, ...opts);
  } catch(e) {
    e.stack = e.stack.split('\n').slice(1, 7).join('\n');
    o = e;
  }
  // Reuse opts variable for the formating options.
  if(userOpts) {
    try { userOpts = JSON.parse(userOpts) }
    catch(e) {
      let rjson = require('relaxed-json');
      try { userOpts = rjson.parse('{'+userOpts+'}') }
      catch(e) {
        try { userOpts = rjson.parse(userOpts) }
        catch(e) { userOpts = "" }
      }
    }
  }
  Object.assign(res, {o, userOpts, cmd})
  bot.mubot.inspect.run(res);
  l.utils.addToLog(res);
}
;
l.length = (res = {send: _=>_}) => {
  let mode = res.match[1];
      id = res.message.user.id, r = ""
  ;
  r += mode && !/all/i.test(mode) ?
    format(l.utils.isModeSave(mode))
  :
    format(1) + ' ' + format(0)
  ;
  return res.send(r);
  //
  function format(mode) {
    let obj = mode ? l.saved[id] || {} : l.log[id] || {},
        cmds = mode ? Object.values(obj) : Object.keys(obj),
        amnt = cmds.length, last = cmds.pop()
    ;
    return (
      `${amnt} ${mode ? 'saved' : 'logged'} eval(s).${amnt ? " Last: "+l.utils.formatCmd(last) : ""}`
    );
  }
}
;
l.deleteAll = (res = {send: _=>_}) => {

  let id = res.message.user.id,
      mode = res.match[1] || "all",
      [saved = {}, log = {}] = [l.saved[id], l.log[id]]
  ;
  if(mode === 'all') {
    let amntDelS = Object.keys(saved).length,
        amntDelL = Object.keys(log).length
    ;
    for(let key in log)
       delete log[key]
    ;
    for(let key in saved)
       delete saved[key]
    ;
    return res.send(
      `Deleted ${amntDelL} logged evals and ${amntDelS} saved evals.`
    );
  }
  let evals = l.utils.isModeSave(mode) ? saved : log;
  let delAmnt = Object.keys(evals).length;
  for(let cmd in evals)
    delete evals[cmd]
  ;
  return res.send(
    `Deleted ${delAmnt} ${mode ? "saved" : "log"} evals.`
  );
}
;
l.delete = (res = {send: _=>_}) => {
  let id = res.message.user.id,
      [saved, log] = [l.saved[id]||"", l.log[id]||""]
  ;
  if(!saved && !log) {
    return res.send("No log found");
  }
  let [, mode, ignore, cmd ] = res.match;
  mode = l.utils.isModeSave(mode);
  let startAt, endAt, r = "Deleted ";
  if(saved[cmd]) {
    r += l.utils.formatCmd(saved[cmd]);
    delete saved[cmd];
  }
  else if(Object.keys(log)[cmd]) {
    r += l.utils.formatCmd(log[cmd]);
    delete log[cmd];
  }
  else if(/[!]|last/i.test(cmd)) {
    let obj;
    if(mode) {
      obj = saved;
      cmd = Objet.values(saved).pop();
    } else {
      obj = log;
      cmd = Object.keys(log).pop()
    }
    r += l.utils.formatCmd(obj[cmd]);
    delete obj[cmd];
  } else {
    let obj = mode ? saved : log,
        keys = Object.keys(obj)
    ;

    cmd = cmd.split(/\s*-\s*/);

    if(cmd.length === 1) {
      let i = +cmd[0];
      keys = i > 0 ? keys.slice(-i) : keys.slice(0, i);
      for(let key in keys)
        delete obj[key]
      ;
      r += keys.length + " evals";
    }
    else if(cmd.length === 2) {
      let [startAt, endAt] = cmd;

      if(startAt > 0) {
        --startAt;
        endAt || (endAt = keys.length);
      } else {
        endAt = void 0;
      }
      ignore ?
        keys.splice(startAt, endAt)
      :
        keys = keys.slice(startAt, endAt)
      ;
      for(let key in keys)
        delete obj[key]
      ;
      r += keys.length + " evals.";
     }
    else r = "Could not parse request";
   }
  bot.brain.save();

  return res.send(r + "." || "No Command(s) found.");
}
;
l.viewFull = res => {
  let id = res.message.user.id,
      [, cmdIndxOrName] = res.match
  ;

  let cmd;

  if((l.saved[id]||"")[cmdIndxOrName]) {
    cmd = l.saved[id][cmdIndxOrName];
  }
  else if(Object.keys(l.log[id]||{})[cmdIndxOrName]) {
    cmd = l.log[id][Object.keys(l.log[id]||{})[cmdIndxOrName]]
  }
  else {
    cmd = Object.keys(l.log[id]).pop() || "No commands.";
  }

  res.send('Command ' + cmdIndxOrName + ': ```' + cmd + '```')
}
;
l.runLast = res => {
  let id = res.message.user.id,
      [mode, userOpts = ""] = (res.match[1]||"").split(' ');
  ;
  mode = l.utils.isModeSave(mode)
  let obj = (mode ? l.saved[id] : l.log[id]) || {},
      last = mode ? Object.values(obj).pop() : Object.keys(obj).pop()
  ;
  if(!last)
    return res.send(`There is no last ${mode?"saved":"logged"} command.`)
  ;
  res.match[1] = last;
  res.match.index = "`" + userOpts;
  l.create(res);
}
;
l.run = (res = {send: _=>_}) => {
  let id = res.message.user.id,
      tag = res.match[1],
      cmd = "",
      log = l.log[id] || "",
      saved = l.saved[id] || ""
  ;
  if(!saved && !log) {
    return res.send("No log found")
  }
  cmd = saved[tag] ?
    saved[tag]
  :
    Object.keys(log)[tag]
  ;
  if(!cmd)
    return res.send("Command not found.")
  ;
  (res.match||"")[1] = cmd;
  l.create(res);
}
;
l.save = (res = {send: _=>_}) => {
  let id = res.message.user.id,
      log = l.log[id],
      saved = l.saved[id] || (l.saved[id] = {})
  ;
  if(!log) {
    return res.send("No log found")
  }
  var [, cmdIndx, tag ] = res.match;
  if(!cmdIndx) {
    cmdIndx = Object.keys(log).length - 1;
  }

  const cmd = Object.keys(log)[cmdIndx];
   ;
  if(!cmd)
    return res.send("No command found.")
  ;

  res.match = [, tag];

  delete saved[tag]; // in case its already saved (to not match the saved command)
  if(l.utils.processMessage(res))
    return res.send("Cannot save, your name is a reserved command.")
  ;

  saved[tag] = cmd;
  bot.brain.save();
  res.send("Saved " + l.utils.formatCmd(cmd) + ' as ' + tag + '.');
}
;
l.view = (res = {send: _=>_}) => {

debugger;

  let id = res.message.user.id,
      [, mode, values, ignore, indexes = ""] = res.match,
      [startAt, endAt] = indexes.split(/\s*[-]\s*/).map(_=>_|0)
  ;
  mode = l.utils.isModeSave(mode);
  let cmds = values ?
    mode ? Object.keys(l.saved[id] || {}) : Object.values(l.log[id] || {})
  :
    mode ? Object.values(l.saved[id] || {}) : Object.keys(l.log[id] || {})
  ;
  if(startAt === '!') {
    let remove = startAt.slice(1),
        removeIndx = mode ? cmds.indexOf(remove) : remove,
        cmd = cmds[removeIndx]
    ;
    return  res.send("(1) " + i + ': ' + l.utils.formatCmd(cmd));
  }
  startAt > 0 ? --startAt : endAt = void 0;

  if(startAt > cmds.length || endAt > cmds.length || startAt > endAt)
     return res.send("Your startAt and endAt parameters are invalid.")
  ;

  let allLen = cmds.length;
  let oldCmds = Object.assign([], cmds)

  ignore ? cmds.splice(startAt, endAt) : cmds = cmds.slice(startAt, endAt);

  //let viewLen = cmds.length;

  cmds = cmds.slice(-l.config.maxCmdLen);
  res.send(`(${cmds.length}/${allLen}) ` + cmds.map(_=>
    `${mode?Object.keys(l.saved[id]||{})[oldCmds.indexOf(_)]:oldCmds.indexOf(_)}: ` + l.utils.formatCmd(_).replace('\n','')
  ).join(', '))
}
;
l.setAlways = (res = {send: _=>_}) => {
  let isSettingAlways = !/off|false|0|no|x/i.test(res.match[1]),
      id = res.message.user.id,
      always = l.always
  ;
  isSettingAlways ?
    always[id] ?
      res.send("Eval mode already set to always.")
    :
      (()=>{
        always[id] = 1;
        bot.brain.save();
        res.send("Eval mode set to always.");
      })()
    //
  :
    always[id] ?
      (()=>{
        delete always[id];
        res.send("Eval mode set to trigger only.");
        bot.brain.save();
      })()
    :
      res.send("Eval mode already set to trigger only.")
    //
   ;
  //
}
;
// Utils
l.utils = {}
;
// Should never need to rely on this, but in. case of mistype.
l.utils.preventHacks = (res = {send: _=>_}) => {
  Object.defineProperties(bot.server, {
    ca: { enumerable: false },
    cert: { enumerable: false },
    key: { enumerable: false },
    _sharedCreds: { enumerable: false }
  });
  Object.defineProperty(bot.leat, 'cookieToUsername', {enumerable: false});
  Object.defineProperties(bot.leat.config, {
    secret: { enumerable: false },
    encryption_key: { enumerable: false }
  });
  return res.send("Sucess.");
}
;
l.utils.processMessage = res => {
  let cmd = res.match[1];
  // ||"" throughout so we dont undefined vars for props.
  if(!cmd)
    return "No message to process."
  ;
  let id = res.message.user.id,
      dontRun = res.dontRun,
      fn = null, match = null
  ;
  if(l.saved[id] != null && l.saved[id][cmd] || /^\d+$/.test(cmd)) {
     // --cmd so that !1 runs the 0'th command.
     match = /^\d+$/.test(cmd) ? --cmd : cmd;
     // format it asif it had ben RegExp.exec()'d.
     match = [, match];
     fn = 'run';
  }
  else if(match = cmd.match(/```((?:.|\n)+)\n?```/i)) {
    // We capture always users with a different listener regexp.
    if(l.always[id]) { return; }
    fn = 'create';
  }
  else if(match = cmd.match(/^`((?:\\.|[^`])+)`/i)) {
    // Likewhie.
    if(l.always[id]) { return; }
    fn = 'create';
  }
  // Hack to ensure that mubot-coins (!coins .*) commands dont get processed.
  else if(match = cmd.match(/^coins/i)) {
    fn = '';
  }
  else if(match = cmd.match(/^(?:[!]|last)(?: (.+))?/i)) {
    fn = 'runLast';
  }
  else if(match = cmd.match(/^(?:length|amount|amnt) ?(.*)?/i)) {
    fn = 'length';
  }
  else if(match = cmd.match(/^(list|view|tags?|saved|evals|log?)(?: logs?)?(?: (values?))?(?: (-?i(?:gnore)?))?(?: (.+))?/)) {
    fn = 'view';
  }
  else if(match = cmd.match(/^full (?:view|show)(?: (.+))?/)) {
    fn = 'viewFull';
  }
  else if(match = cmd.match(/^(?:clear|del(?:ete)?) all(?: (.+))?/i)) {
    fn = 'deleteAll';
  }
  else if(match = cmd.match(/^(?:clear|del(?:ete)?)(?: (saved?|evals?|logs?))?(?: -?(i(?:gnore)?))?(?: (.+))?$/i)) {
    fn = 'delete';
  }
  else if(match = cmd.match(/^(?:save|rec(?:ord)?|preserve|tag)(?: (\d+))?(?: (.+))?/i)) {
    fn = 'save';
  }
  else if(match = cmd.match(/^(?:set )?always(?: (.*))?/i)) {
    fn = 'setAlways';
  }
  if(!dontRun && fn) {
    res.match = match;
    l[fn](res);
  }
  return fn;
}
;
l.utils.formatCmd = cmd => {
  let maxLen = l.config.maxCmdLen
  ;
  if(cmd) {
    return "`" +
      (cmd.length > maxLen ?
        cmd.slice(0, (maxLen / 2) - 2) + " .. " + cmd.slice(-((maxLen / 2 - 2)))
      :
        cmd
      )
     + "`";
  }
  return null;
}
;
l.utils.isModeSave = str =>
  /\s*-?(s(aved?)|tag(ged|s)?|recorded)\s*/.test(str)
;
l.utils.addToLog = (res = {send: _=>_}) => {
  try {
    let id = res.message.user.id,
        cmd = res.cmd,
        log = l.log[id] || (l.log[id] = {})
    ;
    // We want our object to be ordered, but numbers are automatically first in js obj enumeration.
    if(Number.isInteger(cmd)) {
      cmd = ' ' + cmd
    }
    delete log[cmd];
    log[cmd] = res.o;
    bot.brain.save();
  } catch(e) {
    return res.send(
      "Parameter must look like {message:{user:{id: <USER_ID>}}, cmd: <COMMAND>, o: <OUTPUT>}"
    )
  }
}
;
// Export.
module.exports = l.exports
;
//End file.
}).call(this);