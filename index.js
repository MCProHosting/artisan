var _ = require('lodash');
var Artisan = require('./lib');
var Command = require('./lib/command');

/**
 * Create a new artisan instance and apply it
 * to a proxy function for `resolve`.
 *
 * @param {Object} options
 * @return {function}
 */
module.exports = function (options) {
    var artisan = new Artisan(options);

    // Define the "app" function.
    var app = function app () {
        return artisan.resolve.apply(artisan, arguments);
    };

    // Loop through every method in the artisan and bind it to the app.
    for (var key in artisan) {
        if (_.isFunction(artisan[key])) {
            app[key] = artisan[key].bind(artisan);
        }
    }

    return app;
};
