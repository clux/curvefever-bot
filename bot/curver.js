var cfgPath = require('confortable')('.curvebot.json', process.cwd())
  , cfg = require(cfgPath)
  , link = 'http://curvefever.com/play2.php'
  , room = cfg.room
  , fs = require('fs')
  , admins = cfg.admins || [];

var saveFn = function (res) {
  cfg.cache = JSON.parse(res);
  fs.writeFile(cfgPath, JSON.stringify(cfg, null, " "));
};
var curve = require('curvefever-stats')(cfg.cache, saveFn);

var queryHandlers = function (gu) {
  gu.handle(/^register (\w*) (\w*)$/, function (say, alias, curveName, name) {
    if (!admins.length || admins.indexOf(name) >= 0) {
      curve.addPlayer(alias, curveName);
    }
  });
  gu.handle(/^unregister (\w*)/, function (say, alias, name) {
    if (!admins.length || admins.indexOf(name) >= 0) {
      curve.removePlayer(alias);
    }
  });

  gu.handle(/^buzz/, function (say) {
    say(curve.getPlayers().join(' '));
  });

  gu.handle(/^check (.*)$/, function (say, aliases) {
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

  gu.handle(/^top (\d*)$/, function (say, n) {
    var top = curve.getTop(Math.min(n | 0, 15));
    top.forEach(function (p, i) {
      say((i+1) + '. ' + p.name + ' (' + p.score + ')');
    });
  });

  gu.handle(/^teams (\d*) (.*)/, function (say, num, aliases) {
    num = Math.max(Math.min(num | 0, 3), 1);
    aliases = aliases.trim().split(" ");
    var res = curve.fairestMatch(aliases);
    if ('string' === typeof res) { // TODO: ditto
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
    'help' : 'this is the help for help'
  };
  gu.handle(/^help(\s\w*)?/, function (say, cmd) {
    cmd = (cmd || "").toLowerCase().trim();
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
      'ye*s*h*z*i?r?', 'y[ue]+p*[sz]*', 'ya+r*h*', 'ye+a*h*r*h*',
      'a+y+e*', 'j+a*', 'si', 'oui', 'okay', 'o?k+',
      'a?l?right', 'sure', 'fine', 'jawohl'
    ];
    var negatives = [
      'n[ea]+i+n*', 'na+[hw]*', 'n[ae]+[yi]+h*', 'nu+h*',
      'no?p?e?', 'nowa[yi]?', 'never', 'later'
    ];
    var endForReg = '(?:\\s+for\\s+(\\w*))?$'; // for player
    joinReg = new RegExp('^(' + positives.join('|') + ')' + endForReg, 'i');
    leaveReg = new RegExp('^(' + negatives.join('|') + ')' + endForReg, 'i');
  }());

  // reload state from injected object in case of hot code reload
  var added = [];  // currently signed up people
  var limit = 6;   // current limit

  gu.handle(joinReg, function (say, sentiment, participant, name) {
    var guy = participant || name;
    if (added.indexOf(guy) >= 0) {
      return; // no double signups
    }
    if (added.length === limit) {
      var hint = limit < 8 ? ' - say "limit n" to change the limit' : '';
      say('game is full' + hint);
      return;
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

  gu.handle(leaveReg, function (say, sentiment, participant, name) {
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
        if ('string' === typeof res) { // TODO: string as error..
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

  gu.handle(/^limit (\d)/, function (say, n) {
    limit = Math.max(added.length, n | 0);
    say(added.length + ' / ' + limit);
    if (limit === added.length) {
      gogoFn(say);
    }
  });

  gu.handle(/^end(?:\s+(silent|quiet))?/, function (say, silent, name) {
    //if (added.indexOf(name) < 0 && (admins.length && admins.indexOf(name) < 0)) {
    //  return; // only added players or admins can end the game
    //}
    var refresh = added.length > 1 && !silent;
    say('game over' + (refresh ? ' - refreshing stats' : ''));
    if (refresh) {
      curve.refresh(added, function () {});
      curve.getLastMatch(added, function (err, res) {
        if (err) {
          return console.error(err);
        }
        if (res.teamData) {
          var w = res.teamData.winners;
          var l = res.teamData.losers;
          var wTeam = w.names.join(',') + ' [' + w.score + ' (' + w.sum + ')]';
          var lTeam = l.names.join(',') + ' [' + l.score + ' (' + l.sum + ')]';
          say(wTeam + ' >> ' + lTeam);
        }
        else {
          var scrs = res.scores;
          var margin = scrs[0].score - scrs[1].score;
          var tbLen = scrs[0].score - (scrs.length-1)*10;
          var wasTb = (tbLen > 0 && scrs[1].score >= (scrs.length-1)*10);
          var tbStr = wasTb ?
            ' after ' + tbLen + ' points of tiebreakers':
            '';
          say(scrs[0].name + ' won with a ' + margin + ' point margin' + tbStr);
        }
        var mc = res.maxChange;
        if (mc !== '0') {
          say('Biggest rank shift: ' + mc.name + ' with ' + mc.rankChange + 'p');
        }
        say("http://curvefever.com/achtung/match/" + res.id);
      });
    }
    added = [];
    limit = 6;
  });
};

module.exports = function (gu) {
  queryHandlers(gu);
  signupHandlers(gu);
};
