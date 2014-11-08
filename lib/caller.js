/**
 * Hack to get the file path of the caller function. Adapted from SO:
 * http://stackoverflow.com/questions/16697791/nodejs-get-filename-of-caller-function
 *
 * @param {number} nth The caller to get.
 * @return {String}
 */
module.exports = function (nth) {
    var err = new Error();

    var oldHandler = Error.prepareStackTrace;
    Error.prepareStackTrace = function (err, stack) { return stack; };

    var output = err.stack[nth || 1].getFileName();

    Error.prepareStackTrace = oldHandler;
    return output;
};
