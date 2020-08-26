import Instagram from 'instagram-web-api';
import FileCookieStore from 'tough-cookie-filestore2';
import Promise from 'bluebird';
import { Sequelize, media as Media, person as Person } from '../../models';
import { media as mediaConfig, accounts as accountsConfig } from '../../../config';

const Op = Sequelize.Op;
const cookieStore = new FileCookieStore('./src/cookies/admin-account-cookies/cookies.json');

let isProcessing = false;

let requestsTimeout = () => +(Math.random() * mediaConfig.RANDOM_REQUESTS_DELAY_RANGE).toFixed(0) + 1000;
let cronTimeout = () => +(Math.random() * mediaConfig.RANDOM_CRON_DELAY_RANGE).toFixed(0);

let locations = mediaConfig.locations.sort(() => .5 - Math.random());
let hashtags = mediaConfig.hashtags.sort(() => .5 - Math.random());

let client = new Instagram({ username: accountsConfig.mediaGainer.username, password: accountsConfig.common.password, cookieStore });

export default () => {
    if(!isProcessing) {
        isProcessing = true;

        setTimeout(async () => {
          await client.login();
          console.log('logged in');
            try {
                let locationResponses = (await Promise.map([], locationId => new Promise(async resolve => {
                    try {
                        let responses = await client.getMediaFeedByLocation({ locationId });
                        setTimeout(() => resolve(responses), requestsTimeout());
                    } catch(e) {
                        console.log(e);
                        resolve(null);
                    }
                }), { concurrency: mediaConfig.CONCURRENCY })).filter(val => val);
                let hashtagResponses = (await Promise.map(hashtags, hashtag => new Promise(async resolve => {
                    try {
                        let responses = await client.getMediaFeedByHashtag({ hashtag });
                        setTimeout(() => resolve(responses), 600);
                    } catch(e) {
                        console.log(e);
                        resolve(null);
                    }
                }), { concurrency: mediaConfig.CONCURRENCY })).filter(val => val);
                let edges = [];

                locationResponses.forEach(response => {
                    edges = [...edges, ...response.edge_location_to_top_posts.edges];
                });
                hashtagResponses.forEach(response => {
                    edges = [...edges, ...response.edge_hashtag_to_top_posts.edges];
                });

                let createdMediaCount = 0;
                await Promise.map(edges, edge => new Promise(async resolve => {
                    console.log({edge});
                    let { id, shortcode, owner: {id: ownerId} } = edge.node;

                    const duplicatedPerson = !!await Person.findOne({
                      userId: ownerId,
                    });
                    !duplicatedPerson && await Person.create({
                      userId: ownerId,
                    });

                    let duplicatedMedia = await Media.findOne({
                        where: {
                            [Op.or]: [
                                { id },
                                { shortcode }
                            ]
                        }
                    });

                    if(!duplicatedMedia) {
                        createdMediaCount++;

                        await Media.create({
                            id,
                            shortcode
                        });
                    }
                    resolve();
                }), { concurrency: 1 });
                console.log('created media count ', createdMediaCount);
                isProcessing = false;
            } catch(e) {
                isProcessing = false;
                console.log(e);
            }
        }, 0);
    }
};