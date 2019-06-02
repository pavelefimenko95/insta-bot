import Instagram from 'instagram-web-api';
import FileCookieStore from 'tough-cookie-filestore2';
import Promise from 'bluebird';
import moment from 'moment';
import { Sequelize, media as Media, user as User } from '../../models';
import { media as mediaConfig, accounts as accountsConfig, RANDOM_LIKES_DELAY_RANGE } from '../../../config';

const Op = Sequelize.Op;

let isProcessing = false;
let clients = null;
let loginTimeout = +(Math.random() * accountsConfig.RANDOM_LOGIN_DELAY_RANGE).toFixed(0) + 1000;
let likeTimeout = +(Math.random() * RANDOM_LIKES_DELAY_RANGE).toFixed(0) + 1000;

export const loginAccounts = async () => {
    let users = await User.findAll();

    clients = (await Promise.map(users, user => new Promise(resolve => {
        setTimeout(async () => {
            try {
                const cookieStore = new FileCookieStore(`./src/cookies/user-account-cookies/${user.username}.json`);

                let client = new Instagram({
                    username: user.username,
                    password: accountsConfig.common.password,
                    cookieStore
                });

                await client.login();
                client.id = user.id;
                client.processedMediaCount = user.processedMediaCount;

                resolve(client);
            } catch(e) {
                console.log(e);
                resolve(null);
            }
        }, loginTimeout);
    }), { concurrency: 1 })).filter(val => val);
};

export default () => {
    if(!isProcessing && clients) {
        try {
            isProcessing = true;

            let awaitTimeout = setTimeout(() => {
                isProcessing = false;
            }, 60000);

            setTimeout(async () => {
                let client = await (() => new Promise(async resolve => {
                    for(let i = 0; i < clients.length; i++) {
                        let currentClient = clients[i];

                        let todayMedia = await Media.findAll({
                            where: {
                                processedBy: currentClient.credentials.username,
                                processDate: {
                                    [Op.gte]: moment().startOf('day').format()
                                }
                            }
                        });

                        let lastProcessedMedia = await Media.findOne({
                            where: {
                                processedBy: currentClient.credentials.username,
                                processDate: {
                                    [Op.gte]: moment().subtract(60, 'seconds').format()
                                }
                            }
                        });

                        if(todayMedia.length < mediaConfig.LIKES_DAY_LIMIT && !lastProcessedMedia) {
                            resolve(currentClient);
                            break;
                        }
                    }

                    resolve(null);
                }))();

                if(client) {
                    let media = await Media.findOne({
                        where: {
                            processedBy: null
                        }
                    });

                    if(media) {
                        try {
                            await client.like({ mediaId: media.id });
                        } catch(e) {
                            await Media.update({
                                processedBy: 'missing media',
                                processDate: new Date()
                            }, {
                                where: {
                                    id: media.id
                                }
                            });

                            throw e;
                        }

                        await Media.update({
                            processedBy: client.credentials.username,
                            processDate: new Date()
                        }, {
                            where: {
                                id: media.id
                            }
                        });

                        await User.update({
                            processedMediaCount: ++client.processedMediaCount
                        }, {
                            where: {
                                id: client.id
                            }
                        });
                    }
                }

                isProcessing = false;
                clearTimeout(awaitTimeout);
            }, likeTimeout);
        } catch(e) {
            console.log(e);
            clearTimeout(awaitTimeout);
            isProcessing = false;
        }
    }
};