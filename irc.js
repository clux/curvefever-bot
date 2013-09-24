#!/usr/bin/env node
var cfgPath = require('confortable')('.curvebot.json', process.cwd());
if (!cfgPath) {
  throw new Error("When loading curvefever-bot externally, a local config is required");
}
var cfg = require(cfgPath);

var ircStream = require('irc-stream')(cfg.server, cfg.name, {
  userName: 'curver',
  realName: 'curvefever bot',
  debug: false,
  channels: [cfg.chan]
});

var curve = require('./');

ircStream.pipe(curve.gu()).pipe(ircStream);
