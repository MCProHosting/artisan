var _ = require('lodash');
var Artisan = require('./lib/artisan');

/**
 * Create a new artisan instance and apply it
 * to a proxy function for `resolve`.
 *
 * @return {function}
 */
module.exports = function () {
    var artisan = new Artisan();

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
