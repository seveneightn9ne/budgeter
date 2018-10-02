
import {Request, Response} from 'express';
import {User} from '../../shared/types';
import * as user from '../user';
import {wrap} from '../api';
import db from '../db';


export const handle_auth_redirect_get = function(req: Request, res: Response) {
    res.send({error: 'reauth', redirectTo: req.query.redirectTo});
}

export const handle_add_friend_post = wrap(async function(req: Request, res: Response) {
    if (!req.body.email) {
        res.sendStatus(400);
        return;
    }
    await db.tx(async t => {
        const friend = await user.getFriendByEmail(req.body.email, t);
        if (!friend) {
            res.sendStatus(404);
            return;
        }
        await user.addFriend(req.user.uid, friend.uid, t);
        res.send({friend});
    });
});

export const handle_reject_friend_post = wrap(async function(req: Request, res: Response) {
    if (!req.body.email || (req.body.email == req.user.email)) {
        res.sendStatus(400);
        return;
    }
    await db.tx(async t => {
        const uid = await user.getUserByEmail(req.body.email, t);
        if (!uid) {
            res.sendStatus(404);
            return;
        }
        await user.deleteFriendship(req.user.uid, uid, t);
        res.sendStatus(200);
    });
});