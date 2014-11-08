// This would be "require('node-artisan')" in your package.
var app = require('../../index')();

app.register('./');

module.exports = app;
