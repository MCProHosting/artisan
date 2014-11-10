var _ = require('lodash');

// Placeholder object to use until we actually need to run the module.
function ModulePlaceholder () {}

/**
 * Represents an artisan module.
 * @param {Artisan} artisan
 * @param {string} slug
 * @param {Array|function} module
 */
function Module (artisan, slug, module) {
    this.artisan = artisan;
    this.slug = slug;
    this.module = module;
    this.reset();
}

/**
 * Loads the module, or returns the results a loaded module.
 * @return {*}
 */
Module.prototype.run = function () {
    if (this.result instanceof ModulePlaceholder) {
        var func;
        var inject = [];
        var module = this.module;

        // If we were given an array, the function should be the last item
        // and dependencies are the preceding elements.
        if (_.isArray(module)) {
            // Clone the array
            module = module.slice();
            func = module.pop();
            inject = module;
        } else {
            func = module;
        }

        // Resolve every dependency we need.
        inject = inject.map(this.artisan.resolve.bind(this.artisan));
        // The inject em into the function and save the results.
        this.result = func.apply(null, inject);
        // Place this "active" module in the cache.
        this.artisan.moduleCache[this.slug] = this.result;
    }

    return this.result;
};

/**
 * Restores the placeholder into the results.
 */
Module.prototype.reset = function () {
    this.result = new ModulePlaceholder();
    delete this.artisan.moduleCache[this.slug];
};

module.exports = Module;
