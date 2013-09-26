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
  gu.handle(/^help(\s\w*)?/, function (cmd, say) {
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

  gu.handle(/^limit (\d)/, function (n, say) {
    limit = Math.max(added.length, n | 0);
    say(added.length + ' / ' + limit);
    if (limit === added.length) {
      gogoFn(say);
    }
  });

  gu.handle(/^end/, function (say) {
    say('game over' + (added.length > 1 ? ' - refreshing stats' : ''));
    if (added.length > 1) {
      curve.refresh(added, function () {});
      curve.getLastMatch(added, function (err, scrs) {
        if (err) {
          return console.error(err);
        }
        //console.log('getLastMatch returned:', scrs);
        var isTeam = !!scrs[0].teamScore; // not set in FFAs
        if (!isTeam) {
          var margin = scrs[0].score - scrs[1].score;
          var tbLen = scrs[0].score - (scrs.length-1)*10;
          var wasTb = (tbLen > 0 && scrs[1].score >= (scrs.length-1)*10);
          var tbStr = wasTb ?
            ' after ' + tbLen + ' points of tiebreakers':
            '';
          say(scrs[0].name + ' won with a ' + margin + ' point margin' + tbStr);
        }
        else {
          // isTeam
          // scrs sorted by winning team, then by individual score within teams
          var wScore = scrs[0].teamScore;
          var lScore = scrs[scrs.length-1].teamScore;
          var winners = scrs.filter(function (s) {
            return s.teamScore === wScore;
          });
          var losers = scrs.filter(function (s) {
            return s.teamScore === lScore;
          });
          var wNames = winners.map(function (s) {
            return s.name;
          });
          var lNames = losers.map(function (s) {
            return s.name;
          });
          var wSum = winners.reduce(function (acc, s) {
            return acc + s.score;
          }, 0);
          var lSum = losers.reduce(function (acc, s) {
            return acc + s.score;
          }, 0);
          var wTeam = wNames.join(',') + ' [' + wScore + ' (' + wSum + ')]';
          var lTeam = lNames.join(',') + ' [' + lScore + ' (' + lSum + ')]';

          var resStr = wTeam + ' >> ' + lTeam;
          say(resStr);
        }
        scrs.sort(function (x, y) {
          return Math.abs(Number(y.rankChange)) - Math.abs(Number(x.rankChange));
        });
        if (scrs[0].rankChange !== '0') {
          var maxChange = scrs[0].name + ' with ' + scrs[0].rankChange + 'p';
          say('Biggest rank shift: ' + maxChange);
        }
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
