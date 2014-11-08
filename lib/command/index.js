function Command (artisan, name, bootstrap) {

}

/**
 * Starts the command running - hits the bootstrap function and start it off.
 *
 * @return {Bluebird}
 */
Command.prototype.run = function () {
    this.bootstrap.apply(this, args);
};
