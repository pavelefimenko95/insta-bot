module.exports = (sequelize, Sequelize) =>
    sequelize.define('user', {
        username: {
            type: Sequelize.STRING
        },
        address: {
            type: Sequelize.STRING
        },
        processedMediaCount: {
            type: Sequelize.INTEGER,
            defaultValue: 0
        }
    });