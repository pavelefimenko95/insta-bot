import { IgApiClient } from 'instagram-private-api';
import Promise from 'bluebird';
import moment from 'moment';
import { Sequelize, person as Person, user as User } from '../../models';
import { media as mediaConfig, accounts as accountsConfig, RANDOM_LIKES_DELAY_RANGE } from '../../../config';

const Op = Sequelize.Op;

let isProcessing = false;
let clients = null;
let loginTimeout = +(Math.random() * accountsConfig.RANDOM_LOGIN_DELAY_RANGE).toFixed(0) + 1000;
let sendMessageTimeout = +(Math.random() * RANDOM_LIKES_DELAY_RANGE).toFixed(0) + 1000;

export const loginAccountsForSendingMessage = async () => {
	let users = await User.findAll();

	clients = (await Promise.map(users, user => new Promise(resolve => {
		const ig = new IgApiClient();
		ig.state.generateDevice(user.username);

		setTimeout(async () => {
			try {
				await ig.simulate.preLoginFlow();

				let client = await ig.account.login(user.username, accountsConfig.common.password);
				client.ig = ig;
				client.processedSendMessageCount = user.processedSendMessageCount;

				console.log('resolve')
				resolve(client);
			} catch(e) {
				console.log(e);
				resolve(null);
			}
		}, loginTimeout);
	}), { concurrency: 1 }))


	console.log('accounts',clients.length)
};

export default () => {
	console.log('clients',clients)
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

						let todayPerson = await Person.findAll({
							where: {
								processedBy: currentClient.username,
								processDate: {
									[Op.gte]: moment().startOf('day').format()
								}
							}
						});

						let lastProcessedPerson = await Person.findOne({
							where: {
								processedBy: currentClient.username,
								processDate: {
									[Op.gte]: moment().subtract(60, 'seconds').format()
								}
							}
						});

						if(todayPerson.length < mediaConfig.SEND_MESSAGE_DAY_LIMIT && !lastProcessedPerson) {
							resolve(currentClient);
							break;
						}
					}

					resolve(null);
				}))();

				if(client) {
					let person = await Person.findOne({
						where: {
							processedBy: null
						}
					});

					if(person) {
						try {
							const thread = client.ig.entity.directThread(person.userId);
							await thread.broadcastText('Hey there! 😊\n' +
								'How are you? We are looking for Ambassador to represent our brand Worldwide\n' +
								'I am a Brand Manager of a Tech Company called @sliminia.official⌚️\n' +
								'\n' +
								'You caught my attention! 😍 You look really great and a perfect addition to our team!\n' +
								'\n' +
								'I would like to offer you one item for free ⌚️ ( AirPod, Smart Watch or Speaker )\n' +
								'Would you like to get your Ambassador code ? 🥰');
							console.log('send')
						} catch(e) {
							await Person.update({
								processedBy: 'missing person',
								processDate: new Date()
							}, {
								where: {
									id: person.id
								}
							});

							throw e;
						}

						await Person.update({
							processedBy: client.username,
							processDate: new Date()
						}, {
							where: {
								id: person.id
							}
						});

						await User.update({
							processedSendMessageCount: ++client.processedSendMessageCount
						}, {
							where: {
								id: client.id
							}
						});
					}
				}

				isProcessing = false;
				clearTimeout(awaitTimeout);
			}, sendMessageTimeout);
		} catch(e) {
			console.log(e);
			clearTimeout(awaitTimeout);
			isProcessing = false;
		}
	}
};