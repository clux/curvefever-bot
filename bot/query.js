var cfgPath = require('confortable')('.curvebot.json', process.cwd())
  , cfg = require(cfgPath)
  , link = 'http://curvefever.com/play2.php'
  , room = cfg.room
  , admins = cfg.admins || [];

var saveFn = function (res) {
  cfg.cache = JSON.parse(res);
  var newVal = JSON.stringify(cfg, null, "");
  console.log('saveFn with', newVal);  
  //fs.writeFile(cfgPath, JSON.stringify(cfg, null, ""));
};
var curve = require('curvefever-stats')(cfg.cache, saveFn);

var queryHandlers = function (gu) {

  gu.handle(/^register (\w*) (\w*)$/, function (alias, curveName, say, name) {
    if (!admins.length || admins.indexOf(name) >= 0) {
      curve.addPlayer(alias, curveName);
    }
  });
  gu.handle(/^unregister (\w*)/, function (alias, say, name) {
    if (!admins.length || admins.indexOf(name) >= 0) {
      curve.removePlayer(alias);
    }
  });

  gu.handle(/^buzz/, function (say) {
    say(curve.getPlayers().join(' '));
  });

  gu.handle(/^check (.*)$/, function (aliases, say) {
    aliases = aliases.trim().split(" ").slice(0, 8); // max 8 at a time
    curve.refresh(aliases, function (err, objs) {
      if (err) {
        return console.error(err, objs);
      }
      objs.forEach(function (o) {
        say(o.name + ': ' + o.rank);
      });
    });
  });

  gu.handle(/^top (\d*)$/, function (n, say) {
    var top = curve.getTop(Math.min(n | 0, 15));
    top.forEach(function (p, i) {
      say((i+1) + '. ' + p.name + ' (' + p.score + ')');
    });
  });

  gu.handle(/^teams (\d*) (.*)/, function (num, aliases, say) {
    num = Math.max(Math.min(num | 0, 3), 1);
    aliases = aliases.trim().split(" ");
    var res = curve.fairestMatch(aliases);
    if ('string' === typeof res) {
      say(res); // error message
    }
    else {
      res.slice(0, num).forEach(function (obj) {
        say(obj.teams + ' (difference ' + obj.diff + ')');
      });
    }
  });

  gu.handle(/^code/, function (say) {
    say('https://github.com/clux/curvefever-bot/blob/master/bot/');
  });

  var cmds = {
    'yes'  : 'signs you up, and if needed, advertises a new game starting',
    'no'   : 'removes you from the current signup list',
    'top'  : 'lists the top n players registered',
    'check': 'lists the updated ffa score of the specified player(s)',
    'gogo' : 'generates teams and highlights the signed up players',
    'end'  : 'refreshes the scores of the signed up players and clears signup state',
    'buzz' : 'displays the names of all registered players',
    'where': 'displays the curvefever url + room:password',
    'code' : 'displays the url of the code that powers this bot',
    'help' : 'displays the available help entries or a specific one'
  };
  gu.handle(/^help(\s\w*)?/, function (cmd, say) {
    cmd = cmd.toLowerCase().trim();
    if (cmd && cmds[cmd]) {
      say(cmds[cmd]);
    }
    else {
      var cmdNames = Object.keys(cmds).join(', ');
      say('Available help entries: ' + cmdNames);
    }
  });

};


var signupHandlers = function (gu) {
  var joinReg, leaveReg;
  (function () {
    var positives = [
      'ye*s*h*z*i?r?', 'yu+p*[sz]*', 'ya+r*h*', 'ye+a*h*r*h*',
      'a+y+e*', 'j+a*', 'si', 'oui', 'okay', 'o?k+',
      'a?l?right', 'sure', 'fine', 'jawohl'
    ];
    var negatives = [
      'ne+i+n*', 'na+[hw]*', 'n[ae]+[yi]+h*', 'n[uœ]+h*',
      'no?p?e?', 'nowa[yi]?', 'never', 'later'
    ];
    var straggler = '\\w{0,5}'; // allow some stray characters as well
    var endForReg = straggler + '(?:\\s+fr?o[rm]?\\s*(\\w*))?'; // for|from|fo player
    joinReg = new RegExp('^(' + positives.join('|') + ')' + endForReg, 'i');
    leaveReg = new RegExp('^(' + negatives.join('|') + ')' + endForReg, 'i');
  }());

  // reload state from injected object in case of hot code reload
  var added = [];  // currently signed up people
  var limit = 6;   // current limit

  gu.handle(joinReg, function (sentiment, participant, say, name) {
    var guy = participant || name;
    if (added.length === limit) {
      var hint = limit < 8 ? ' - say "limit 8" to raise the limit' : '';
      say('game is full' + hint);
      return;
    }
    if (added.indexOf(guy) >= 0) {
      return; // no double signups
    }
    added.push(guy);
    if (added.length === 1) {
      say('new curve game starting soon - message me "yes" to join');
      say('register on: ' + link + ' - then join: ' + room);
    }
    say(guy + ' joined (' + added.length + ' / ' + limit + ')');
    if (added.length === limit) {
      gogoFn(say);
    }
  });

  gu.handle(leaveReg, function (sentiment, participant, say, name) {
    var guy = participant || name;
    if (added.indexOf(guy) >= 0) {
      added.splice(added.indexOf(guy), 1);
      say(guy + ' left (' + added.length + ' / ' + limit + ')');
    }
  });

  var gogoFn = function (say) {
    if (added.length) {
      say('curve game starting - ' + added.join(', ') + ' - Go go go!');
      if (added.length >= 4) {
        var res = curve.fairestMatch(added);
        if ('string' === typeof res) {
          say('Not generating teams: ' + res);
        }
        else {
          var r = res[0];
          say('if teams: ' + r.teams + ' (difference ' + r.diff + ')');
        }
      }
    }
  };
  gu.handle(/^gogo/, gogoFn);

  gu.handle(/^where|^link/, function (say) {
    say('register on: ' + link + ' - then join: ' + room);
  });

  gu.handle(/^limit (\d)/, function (n, say) {
    limit = Math.max(added.length, n | 0);
    say(added.length + ' / ' + limit);
    if (limit === added.length) {
      gogoFn(say);
    }
  });

  gu.handle(/^end/, function (say) {
    // TODO: could scrape for last result?
    say('game over' + (added.length ? ' - refreshing stats' : ''));
    curve.refresh(added, function () {});
    added = [];
    limit = 6;
  });

};

module.exports = function (gu) {
  queryHandlers(gu);
  signupHandlers(gu);
};

