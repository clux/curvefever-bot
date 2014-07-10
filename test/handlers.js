var Gu = require('gu')
  , guParams = require('../');

exports.signups = function (t) {
  var curve = new Gu(guParams.scriptdir, guParams.files, {noReload: true});
  var xs = [
    {user: '#chan:clux', name: 'clux', message: 'buzz'},
    {user: '#chan:clux', name: 'clux', message: 'yes'},
    {user: '#chan:clux', name: 'clux', message: 'link'},
    {user: '#chan:aa', name: 'aa', message: 'k for uu'},
    {user: '#chan:uu', name: 'uu', message: 'yes for aa'},
    {user: '#chan:aj', name: 'aj', message: 'yarrr'},
    {user: '#chan:annoy', name: 'annoy', message: 'limit 3'},
    {user: '#chan:clux', name: 'clux', message: 'limit 5'},
    {user: '#chan:jo', name: 'jo', message: 'fine'},
    {user: '#chan:phil', name: 'phil', message: 'ok for ob'},
    {user: '#chan:aa', name: 'aa', message: 'end quietly'},
    {user: '#chan:ob', name: 'ob', message: 'ja'},
    {user: '#chan:aa', name: 'aa', message: 'end'}
  ];
  var ys = [];
  curve.on('data', function (y) {
    ys.push(y);
  });
  xs.forEach(function (x) {
    curve.write(x);
  });

  setTimeout(function () {
    t.equal(ys[0].message, 'clux uu aj aa', 'buzz message');
    t.equal(ys[1].message, 'clux joined (1 / 6)', 'first join msg');
    // TODO: server/room check for this message
    t.equal(ys[2].message.slice(0, 16), 'CurveFever2! Reg', 'register message');
    t.equal(ys[3].message, 'uu joined (2 / 6)', '2nd join msg');
    t.equal(ys[4].message, 'aa joined (3 / 6)', '3rd join msg');
    t.equal(ys[5].message, 'aj joined (4 / 6)', '4th join msg');
    t.equal(ys[6].message, '4 / 4', 'limit set below number of players');
    t.equal(ys[7].message, 'curve game starting - clux, uu, aa, aj - Go go go!', 'limit forces gogo');
    t.equal(ys[8].message.slice(0, 9), 'if teams:', 'should generate teams');
    t.equal(ys[9].message, '4 / 5');
    t.equal(ys[10].message, 'jo joined (5 / 5)', '5th join msg');
    t.equal(ys[11].message, 'curve game starting - clux, uu, aa, aj, jo - Go go go!', 'full => gogo');
    t.equal(ys[12].message, 'Not generating teams: No player information for jo', 'jo not registered');
    t.equal(ys[13].message, 'game is full - say "limit n" to change the limit', 'failed signup');
    t.equal(ys[14].message, 'game over', 'end message');
    t.equal(ys[15].message, 'ob joined (1 / 6)', 'new game counter reset');
    t.equal(ys[16].message, 'game over'); // no refresh, only one player
    //t.ok(!ys[16], 'no response to disallowed end found');
    t.done();
  }, 10);
};
