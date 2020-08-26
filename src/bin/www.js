require('babel-register')({
    presets: [ 'env', 'es2015' ],
    plugins: ['transform-object-rest-spread']
});
require('babel-polyfill');

let models = require('../models');
let defaultService = require('../services/defaultService');
let loginAccounts = require('../services/schedule/processMedia').loginAccounts;

models.sequelize.sync({force: true}).then(() => {
    console.log('sequelize initialized');
    defaultService();
    // loginAccounts();
});

require('../services/schedule');