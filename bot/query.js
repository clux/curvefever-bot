var curve = require('curvefever-stats');
var cfgPath = require('confortable')('.curvebot.json', process.cwd());
var cfg = require(cfgPath);
var admins = cfg.admins || [];
Object.keys(cfg.players).forEach(function (alias) {
  curve.addPlayer(alias, cfg.players[alias]);
});

module.exports = function (gu) {

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

  gu.handle(/^help (\w*)?/, function (cmd, say) {
    cmd = cmd.toLowerCase();
    var cmds = {
      'yes'  : 'signs you up, and if needed, advertises a new game starting',
      'no'   : 'removes you from the current signup list',
      'top'  : 'lists the top n players registered',
      'check': 'lists the updated ffa score of the specified player(s)',
      'gogo' : 'generates teams and highlights the signed up players',
      'end'  : 'clears the sign-up list and refreshes the scores of the signed up players',
      'buzz' : 'displays the names of all registered players',
      'where': 'displays the curvefever url + room:password',
      'code' : 'displays the url of the code that powers this bot',
      'help' : 'displays the available help entries or a specific one'
    };
    if (cmd && cmds[cmd]) {
      say(cmds[cmd]);
    }
    else {
      var cmdNames = Object.keys(cmds).join(', ');
      say('Available help entries: ' + cmdNames)
    }
  });

  gu.handle(/^help/, function (say) {
    say('Commands: yes, no, buzz, top n, where, check nick, gogo, end, help command');
  });

};
