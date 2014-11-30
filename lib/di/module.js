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
 * @param {Object} mocks
 * @return {*}
 */
Module.prototype.run = function (mocks) {
    if (this.result instanceof ModulePlaceholder || mocks) {
        var func;
        var inject = [];
        var module = this.module;
        if (mocks) { debugger; }
        mocks = mocks || {};

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
        // Examine our inject array in reverse - this is important! We'll
        // go through and splice out things we'll go back back and inject
        // later.
        var swaps = [];
        for (var i = inject.length - 1; i > -1; i--) {
            var mock = mocks[inject[i]];

            if (typeof mock !== 'undefined') {
                swaps.push({ index: i, module: mock });
                inject.splice(i, 1);
            }
        }

        // Resolve every dependency we need.
        inject = inject.map(this.artisan.resolve.bind(this.artisan));

        // Then go back through "swaps" and put back in everything
        // we took out of the injections.
        for (var i = swaps.length - 1; i > -1; i--) {
            var swap = swaps[i];
            inject.splice(swap.index, 0, swap.module);
        }

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
