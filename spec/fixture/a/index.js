module.exports = function (app) {

    return {
        register: function (app) {
            // Test basic module
            app.module('a', function () {
                return 'moduleA.a loaded';
            });
            // Test require module in same service
            app.module('b', ['moduleA.a', function (m) {
                return 'moduleA.b loaded with ' + m;
            }]);
            // Test require module multi
            app.module('c', ['moduleA.b', function (m) {
                return 'moduleA.c loaded with ' + m;
            }]);

            app.register('./');
        },

        eager: false,

        name: "moduleA"
    };
};
