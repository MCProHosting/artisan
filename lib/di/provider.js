var path = require('path');

/**
 * Base "module loader" system
 * @param {Artisan} artisan
 * @param {string} filePath
 * @param {string=} slugBase
 */
function Provider (artisan, filePath, slugBase) {
    this.artisan = artisan;
    this.filePath = filePath;
    this.loaded = false;

    this.data = this.withContext(require(filePath));
    this.slug = [slugBase, this.data.name].join('.').replace(/^\./, '');

    // Load the module if eager loading is on.
    if (this.data.eager) {
        this.load();
    }
}

/**
 * Loads modules of the provider.
 */
Provider.prototype.load = function () {
    if (this.loaded) {
        return;
    }

    this.withContext(this.data.register);
    this.loaded = true;
};

/**
 * Sets the currentProvider of artisan to be `this` around the function.
 * @param {function} fn
 * @return {*} [description]
 */
Provider.prototype.withContext = function (fn) {
    var oldProvider = this.artisan.currentProvider;
    this.artisan.currentProvider = this;
    var output = fn(this.artisan);
    this.artisan.currentProvider = oldProvider;

    return output;
};

module.exports = Provider;
