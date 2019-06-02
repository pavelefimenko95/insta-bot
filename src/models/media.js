module.exports = (sequelize, Sequelize) =>
     sequelize.define('media', {
        id: {
            type: Sequelize.STRING,
            primaryKey: true,
            notEmpty: true,
            allowNull: false
        },
        shortcode: {
            type: Sequelize.STRING,
            notEmpty: true,
            allowNull: false
        },
         processedBy: {
            type: Sequelize.STRING
         },
         processDate: {
            type: Sequelize.DATE,
             defaultValue: null
         }
    });