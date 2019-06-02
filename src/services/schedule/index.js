import schedule from 'node-schedule';
import getMedia from './getMedia';
import processMedia from './processMedia';

export default (() => {
    schedule.scheduleJob('*/30 * * * *', getMedia);
    schedule.scheduleJob('*/7 * * * * *', processMedia);
})();
