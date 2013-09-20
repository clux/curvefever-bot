exports.scriptdir = require('path').join(__dirname, 'bot');
exports.files = ['query.js', 'signup.js'];

// exports a ready to make instance of gu that uses the version of gu we require
exports.gu = require('gu').bind(null, exports.scriptdir, exports.files);
