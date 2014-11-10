var path = require('path');
var fs = require('fs');
var glob = require('glob');
var _  = require('lodash');

var getCaller = require('./di/caller');
var errors = require('./di/errors');

var Provider = require('./di/provider');
var Module = require('./di/module');
var Command = require('./command');

/**
 * A DI container!
 *
 * @param {Object} options
 */
function Artisan (options) {
    // Keep the path this was instantiated in to serve as the root.
    this.base = path.dirname(getCaller(2));
    this.providers = [];
    this.modules = [];
    // Temp variable to allow for nicer loading of provider data. Set to
    // be a provider object during loading of its modules.
    this.currentProvider = null;
    // List of registrations so we can reset and mock/unmock things...
    this.registrations = [];
    // List of modules that have been "pulled out" and swapped with mocks.
    this.pulledMocks = [];
    // Object that holds base "slugs" in which we can look up items in O(1) time.
    this.moduleCache = {};
}

/**
 * Loads a new provider or set of providers via minimatch.
 * @param {string} target
 * @param {string=} caller
 */
Artisan.prototype.register = function (target, caller) {
    // The 3rd caller is where this is called from: caller.js < artisan.js
    // < *someModule.js*. We want to get its path.
    caller = caller || path.dirname(getCaller(2));
    var search = path.join(caller, target);

    // If we're just point to a file, load it directly.
    var stats = fs.statSync(search);
    if (stats.isFile()) {
        return this.addProvider(search);
    }

    // Otherwise, it must be a path! Find all providers in there.
    glob.sync('*/index.js', { cwd: search })
        .map(function (p) {
            // Fix all providers we found to be relative to the app root.
            return  path.join(caller, p);
        })
        .forEach(this.addProvider.bind(this));

    this.registrations.push([target, caller]);
};

/**
 * Adds a generic component to the ioc container.
 * @param  {string} name
 * @param  {Array|function} module
 */
Artisan.prototype.component = function (name, fn, generator) {
    // If we're inside a provider, make it relative to that slug.
    if (this.currentProvider) {
        name = [this.currentProvider.slug, name].join('.');
    }

    var module = generator.call(this, name, fn);

    // Don't load modules twice, this could make some funky stuff happen.
    var existing = _.find(this.modules, { slug: name });
    if (typeof existing !== 'undefined') {
        // But if it's a mock, that's okay, just make this an "original".
        if (existing.isMock) {
            this.pulledMocks.push(module);
        } else {
            throw new errors.ModuleExistsError(name);
        }
    } else {
        this.modules.push(module);
    }
};

/**
 * Adds a module to the ioc container.
 *
 * @param  {string} name
 * @param  {Array|function} module
 */
Artisan.prototype.module = function (n, f) {
    this.component(n, f, function (name, fn) {
        return new Module(this, name, fn);
    });
};

/**
 * Registers a new command - a module with a factor function to generate
 * new commands when it is called.
 *
 * @param  {string} name
 * @param  {Array|function} module
 */
Artisan.prototype.command = function (name, fn) {
    this.component(name, fn, function (name, fn) {
        return function () {
            return new Command(this, name, fn);
        };
    });
};

/**
 * Runs a command from the container.
 *
 * @param {string} name
 * @param {...}    args Arguments to pass to the command.
 * @return {Bluebird}
 */
Artisan.prototype.dispatch = function (name) {
    var cmd = this.resolve(name)();

    return cmd.run.apply(cmd, [].slice.call(args, 1));
};

/**
 * Adds a module to the app. Expects a path relative to the base.
 *
 * @param {string} filePath
 */
Artisan.prototype.addProvider = function (filePath) {
    // Don't re-define providers
    var existing = _.find(this.providers, { filePath: filePath });
    if (typeof existing !== 'undefined') {
        return;
    }

    // If this provider has the same slug
    // as an existing module, that's an error!
    var slugBase = this.currentProvider ? this.currentProvider.slug : '';
    var provider = new Provider(this, filePath, slugBase);
    if (typeof _.find(this.modules, { slug: provider.slug }) !== 'undefined') {
        throw new errors.ModuleOverwriteError(provider.slug);
    }

    this.providers.push(provider);
};

/**
 * Tries to load and return a module by name.
 * @param  {string} name
 * @return {*}
 */
Artisan.prototype.resolve = function (name) {
    // First, try to see if we have the module in the cache already.
    var cached = this.moduleCache[name];
    if (typeof cached !== 'undefined') {
        return cached;
    }

    // If we're loading things relatively and are inside a provider,
    // prepend that provider's slug to what we want to get.
    if (name.slice(0, 2) === './' && this.currentProvider) {
        name = [this.currentProvider.slug, name.slice(2)].join('.');
    }

    // If the module was already resolved, just return it.
    var module = _.find(this.modules, { slug: name });
    if (module) {
        return module.run();
    }

    // Otherwise, try to find the provider that loads it.
    var provider = this.grabProvider(name.slice(0, name.lastIndexOf('.')));
    // If there's no provider *or* it's already loaded (must not have given
    // the module we were looking for), raise an error.
    if (typeof provider === 'undefined' || provider.loaded) {
        throw new errors.ModuleNotFoundError(name);
    }

    provider.load();

    // Now, recurse once and we should have the module available (or an error
    // will be thrown).
    return this.resolve(name);
};

/**
 * Tries to "walk" to the provider by name, loading parent providers in
 * hopes that it's registered somewhere in there.
 * @param  {string} name
 * @return {Provider|undefined}
 */
Artisan.prototype.grabProvider = function (name) {
    var parts = name.split('.');
    var provider;

    // Iterate through the parts until we get to the end...
    for (var module = parts.shift();
         parts.length > 0;
         module += '.' + parts.shift()
    ) {
        provider = _.find(this.providers, { slug: module });
        if (typeof provider === 'undefined') {
            return;
        }

        provider.load();
    }

    // There's one last part left in parts at this point. Find the
    // provider if we have one.
    return _.find(this.providers, {
        slug: [module, parts[0]].join('.').replace(/^\.|\.$/g, '')
    });
};

/**
 * Helper function (mainly for unit testing) to see if a module is loaded.
 * @param  {string}  slug
 * @return {Boolean}
 */
Artisan.prototype.isLoaded = function (slug) {
    var provider = _.find(this.providers, { slug: slug });

    return !!provider && provider.loaded;
};

/**
 * Wipes the application and reloads everything. Note that `require` will
 * cache the object literal outputs of submodules.
 */
Artisan.prototype.reset = function () {
    this.providers = [];
    this.modules = [];
    this.pulledMocks = [];
    this.moduleCache = {};

    var registrations = this.registrations;
    this.registrations = [];

    var self = this;
    registrations.forEach(function (args) {
        self.register.apply(self, args);
    });
};

/**
 * Swaps out an instance in the IoC with a mock object.
 * @param  {string}   name
 * @param  {Function} fn
 */
Artisan.prototype.mock = function (name, fn) {
    // First reset all modules so that when they're used, they'll load a mock.
    _.invoke(this.modules, 'reset');

    // Remove the module if it's registered and, if it wasn't a mock, save
    // it to be restored later.
    var module = _.remove(this.modules, { slug: name });
    if (typeof module !== 'undefined' && !module.isMock) {
        this.pulledMocks = this.pulledMocks.concat(module);
    }

    // Create a new mock and put it on the collection.
    var mock = new Module(this, name, fn);
    mock.isMock = true;
    this.modules.push(mock);
};

/**
 * Removes the mock object by name, or if a name is not passed, all
 * mock objects will be removed and the originals restored.
 *
 * @param  {string} name
 */
Artisan.prototype.unmock = function (name) {
    // Reset modules so they'll pull the unmocked versions when used.
    _.invoke(this.modules, 'reset');

    if (typeof name === 'undefined') {
        this.pulledMocks.forEach(restore.bind(this));
        _.remove(this.modules, { isMock: true });
    } else {
        restore(name);
    }

    // Helper function to restore an original moduke.
    function restore (original) {
        _.remove(this.modules, { slug: original.slug });
        this.modules.push(original);
    }
};

module.exports = Artisan;
