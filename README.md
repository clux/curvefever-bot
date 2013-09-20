# curvefever-bot
Curvefever-bot is a bot interface for the [curvefever-stats](https://npmjs.org/package/curvefever-stats) package. You can hook this up to [irc-stream](http://npmjs.org/package/irc-stream) (say), and use it to sign up to games on IRC, as well as having it auto-generate fair teams for you, provided you have associated the player IRC nicknames with their curvefever nicknames.

## Usage
The library exposes a [gu](https://npmjs.org/package/gu) instance that you can create by just passing in the missing gu options. Then pipe your transports into it:

```javascript
var curveBot = require('curvefever-bot').gu({});
var ircStream = require('irc-stream')(ircServer, ircName, ircOpts);

ircStream.pipe(curveBot).pipe(ircStream);
```

Alternatively, change the config file directly and run `npm start` for IRC mode.

## License
MIT-Licensed. See LICENSE file for details.
