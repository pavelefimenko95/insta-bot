module.exports = (sequelize, Sequelize) =>
    sequelize.define('person', {
      userId: {
        type: Sequelize.STRING,
      },
      processedBy: {
        type: Sequelize.STRING
      },
      processDate: {
        type: Sequelize.DATE,
        defaultValue: null
      }
    });