module.exports = function (app) {

    return {
        register: function (app) {
            app.module('a', function () {
                return 'this is moduleB.a';
            });
        },

        eager: true,

        name: "moduleB"
    };
};
