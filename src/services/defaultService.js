import { user as User } from '../models';
import { accounts as accountsConfig } from '../../config';

module.exports = async () => {
    let users = await User.findAll();

    if(!users.length) {
        await User.bulkCreate(accountsConfig.users);
    }
};