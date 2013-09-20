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


  gu.handle(/^help/, function (say) {
    say('Create or join a game with "yes", to sign up for someone else "yes for nick"');
    say('"gogo" to generate, and "end" to clear state');
    say('Extras: "buzz", "top n", "check nick1 ..", "teams n nick1 .."');
  });

};
