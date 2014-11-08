module.exports = function (app) {

    return {
        register: function (app) {
            app.module('a', function () {
                return 'this is moduleA.subModule.a';
            });
        },

        eager: false,

        name: "subModule"
    };
};
