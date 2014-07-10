var botdir = process.env.CURVEFEVER_BOT_COV ? 'bot-cov' : 'bot';
exports.scriptdir = require('path').join(__dirname, botdir);
exports.files = ['curver.js'];

// exports a ready to make instance of gu that uses the version of gu we require
exports.gu = require('gu').bind(null, exports.scriptdir, exports.files);
