var util = require('util');

module.exports.ModuleOverwriteError = function (name) {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);

    this.name = 'Module Overwrite Error';
    this.message = '`' + name + '` was provided as both a module and a provider.';
};
util.inherits(module.exports.ModuleOverwriteError, Error);

module.exports.ModuleNotFoundError = function (name) {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);

    this.name = 'Module Not Found Error';
    this.message = 'Tried to get module `' + name + '` but it was not registered.';
};
util.inherits(module.exports.ModuleNotFoundError, Error);

module.exports.ModuleExistsError = function (name) {
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);

    this.name = 'Module Exists Error';
    this.message = 'The module `' + name + '` was loaded twice!';
};
util.inherits(module.exports.ModuleExistsError, Error);
