var curve = require('curvefever-stats');
var cfgPath = require('confortable')('.curvebot.json', process.cwd());
var cfg = require(cfgPath);

var link = 'http://curvefever.com/play2.php';
var room = cfg.room;

// TODO: decide on whether to nevere persist and have config declare
// or to not declare in config and use curve un/register player curvenick
// former => can't properly use register because it isn't saved
// latter better for module users

// join/leave code
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

module.exports = function (gu) {

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
