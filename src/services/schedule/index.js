import schedule from 'node-schedule';
import getMedia from './getMedia';
import processMedia from './processMedia';
import sendDirectMessage from './sendDirectMessage';

export default (() => {
   schedule.scheduleJob('*/30 * * * * *', getMedia);
   schedule.scheduleJob('*/7 * * * * *', processMedia);
   schedule.scheduleJob('*/7 * * * * *', sendDirectMessage);
})();
