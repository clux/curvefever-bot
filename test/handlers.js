var tap = require('tap')
  , test = tap.test
  , stream = require('stream')
  , Gu = require('gu')
  , guParams = require('../');

/*
// basic read stream that will emit data given
function Pumper(objs) {
  stream.Readable.call(this, {objectMode: true});
  this.objs = objs;
}
Pumper.prototype = Object.create(stream.Readable.prototype);
Pumper.prototype._read = function () {
  this.push(this.objs.pop() || null);
};

// collect stream that will buffer on the other end
function Collector(onFinish) {
  stream.Writable.call(this, {objectMode: true});
  this.objs = [];
  this.on('finish', function () {
    onFinish(this.objs);
  });
}
Collector.prototype = Object.create(stream.Writable.prototype);
Collector.prototype._write = function (obj, encoding, cb) {
  console.log('received', obj.message);
  this.objs.push(obj);
  cb(null);
};*/


test("signups", function (t) {
  var curve = new Gu(guParams.scriptdir, guParams.files, {noReload: true});
  var xs = [
    {user: '#chan:clux', name: 'clux', message: "yes"},
    {user: '#chan:aa', name: 'aa', message: 'k for uu'},
    {user: '#chan:uu', name: 'uu', message: 'yes for aa'},
    {user: '#chan:aj', name: 'aj', message: 'yarrr'},
    {user: '#chan:annoy', name: 'annoy', message: 'limit 3'},
    {user: '#chan:clux', name: 'clux', message: 'limit 5'},
    {user: '#chan:jo', name: 'jo', message: 'fine'},
    {user: '#chan:phil', name: 'phil', message: 'ok for ob'},
    // NB: "end" will trigger a HTTP GET, but we won't wait for its results
    {user: '#chan:ob', name: 'ob', message: 'end'},
    {user: '#chan:ob', name: 'ob', message: 'ja'}
  ];
  var ys = [];
  curve.on('data', function (y) {
    ys.push(y);
  });
  xs.forEach(function (x) {
    curve.write(x);
  });

  setTimeout(function () {
    t.equal(ys[0].message.slice(0, 28), 'new curve game starting soon', 'game starting msg');
    t.equal(ys[1].message.slice(0, 11), 'register on', 'register message'); // TODO: server/room?
    t.equal(ys[2].message, 'clux joined (1 / 6)', 'first join msg');
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
    t.equal(ys[14].message, 'game over - refreshing stats', 'end message');
    t.equal(ys[17].message, 'ob joined (1 / 6)', 'new game counter reset');
    t.end();
  }, 10);
});
