import _ from "lodash";
import pgPromise from "pg-promise";
import Money from "../shared/Money";
import * as settings from "../shared/settings";
import {
  Charge,
  Friend,
  GroupId,
  Payment,
  User,
  UserId,
  UserSettings,
} from "../shared/types";
import db from "./db";
import * as payments from "./payments";

export function getGroups(
  user: User | UserId,
  t?: pgPromise.ITask<{}>,
): Promise<GroupId[]> {
  return t ? getGroupsInner(user, t) : db.task((t) => getGroupsInner(user, t));
}

function getGroupsInner(
  user: User | UserId,
  t: pgPromise.ITask<{}>,
): Promise<GroupId[]> {
  const uid = typeof user == "string" ? user : user.uid;
  return t.many("select gid from membership where uid=$1", [uid]).then((rows) => {
    return rows.map((row) => row.gid as GroupId);
  });
}

export function getDefaultGroup(
  user: User | UserId,
  t?: pgPromise.ITask<{}>,
): Promise<GroupId> {
  return getGroups(user, t).then((groups) => groups[0]);
}

export function isUserInGroup(
  user: User,
  group: GroupId,
  t: pgPromise.ITask<{}>,
): Promise<boolean> {
  return t
    .oneOrNone(
      "select count(*) > 0 as exists from membership where uid = $1 and gid = $2",
      [user.uid, group],
    )
    .then((row) => {
      return !!row;
    });
}

export async function getUserByEmail(
  email: string,
  t: pgPromise.ITask<{}>,
): Promise<UserId | null> {
  const row = await t.oneOrNone("select * from users where email = $1", [
    email,
  ]);
  console.log("get user by email " + email + " yields " + (row || {}).uid);
  return row ? row.uid : null;
}

export async function getFriendByEmail(
  email: string,
  t: pgPromise.ITask<{}>,
): Promise<Friend | null> {
  const row = await t.oneOrNone(
    "select U.uid, U.name, M.gid from users U left join membership M on U.uid = M.uid where U.email = $1",
    [email],
  );
  return row ? { uid: row.uid, gid: row.gid, email, name: row.name } : null;
}

export async function getFriend(
  uid: UserId,
  t: pgPromise.ITask<{}>,
): Promise<Friend | null> {
  const row = await t.oneOrNone(
    "select U.email, U.name, M.gid from users U left join membership M on U.uid = M.uid where U.uid = $1",
    [uid],
  );
  return row ? { uid, gid: row.gid, email: row.email, name: row.name } : null;
}

export async function getEmail(
  user: UserId,
  t: pgPromise.ITask<{}>,
): Promise<string> {
  const row = await t.one("select email from users where uid = $1", [user]);
  return row.email;
}

export async function getEmails(
  users: UserId[],
  t: pgPromise.ITask<{}>,
): Promise<string[]> {
  // how..?
  // const rows = await t.many("select email from users where uid in ($1)", [users]);
  return await t.batch(users.map((u) => getEmail(u, t)));
}

export async function setName(
  user: UserId,
  name: string,
  t: pgPromise.ITask<{}>,
): Promise<void> {
  return await t.none("update users set name = $1 where uid = $2", [
    name,
    user,
  ]);
}

export async function addFriend(
  actor: UserId,
  friend: UserId,
  t: pgPromise.ITask<{}>,
) {
  const [u1, u2] = [actor, friend].sort();
  const existing = await t.oneOrNone(
    "select * from friendship where u1 = $1 and u2 = $2",
    [u1, u2],
  );
  if (existing) {
    if (actor == u1) {
      await t.none(
        "update friendship set u1_accepted = true where u1 = $1 and u2 = $2",
        [u1, u2],
      );
    } else {
      await t.none(
        "update friendship set u2_accepted = true where u1 = $1 and u2 = $2",
        [u1, u2],
      );
    }
  } else {
    const u1_accepted = u1 == actor;
    const u2_accepted = u2 == actor;
    await t.none(
      "insert into friendship (u1, u2, u1_accepted, u2_accepted, balance, alive) values ($1, $2, $3, $4, $5, true)",
      [u1, u2, u1_accepted, u2_accepted, "0"],
    );
  }
}

export async function deleteFriendship(
  u1: UserId,
  u2: UserId,
  t: pgPromise.ITask<{}>,
): Promise<void> {
  return t.none(
    "delete from friendship where u1 = $1 and u2 = $2",
    [u1, u2].sort(),
  );
}

export async function softDeleteFriendship(
  u1: UserId,
  u2: UserId,
  t: pgPromise.ITask<{}>,
): Promise<void> {
  return t.none(
    "update friendship set alive = false where u1 = $1 and u2 = $2",
    [u1, u2].sort(),
  );
}

// Only gets friendships that have been accepted both ways.
export async function getFriends(
  user: UserId,
  t: pgPromise.ITask<{}>,
): Promise<Friend[]> {
  const rows = await t.manyOrNone(
    `select U.uid, U.email, U.name, G.gid from friendship F
        left join users U on (
            (F.u1 = U.uid and F.u2 = $1)
         or (F.u2 = U.uid and F.u1 = $1))
        left join membership G on U.uid = G.uid
        where (u1 = $1 or u2 = $1) and u1_accepted and u2_accepted and F.alive`,
    [user],
  );
  return rows || [];
}

export async function getPendingFriends(
  user: UserId,
  t: pgPromise.ITask<{}>,
): Promise<Friend[]> {
  const rows = await t.manyOrNone(
    `select U.uid, U.email, '' as name, G.gid from friendship F
        left join users U on (
            (F.u1 = U.uid and F.u2 = $1)
         or (F.u2 = U.uid and F.u1 = $1))
        left join membership G on U.uid = G.uid
        where ((u1 = $1 and not u2_accepted)
           or (u2 = $1 and not u1_accepted))
           and F.alive`,
    [user],
  );
  return rows || [];
}

export async function getFriendInvites(
  user: UserId,
  t: pgPromise.ITask<{}>,
): Promise<Friend[]> {
  const rows = await t.manyOrNone(
    `select U.uid, U.email, '' as name, G.gid from friendship F
        left join users U on (
            (F.u1 = U.uid and F.u2 = $1)
         or (F.u2 = U.uid and F.u1 = $1))
        left join membership G on U.uid = G.uid
        where ((u1 = $1 and not u1_accepted)
           or (u2 = $1 and not u2_accepted))
           and F.alive`,
    [user],
  );
  return rows || [];
}

export async function isFriend(
  u1: UserId,
  u2: UserId,
  t: pgPromise.ITask<{}>,
): Promise<boolean> {
  const row = await t.oneOrNone(
    `select count(*) > 0 as exists from friendship where
        u1 = $1 and u2 = $2 and u1_accepted and u2_accepted and alive`,
    [u1, u2].sort(),
  );
  return !!row;
}

/** Amounts that user owes each friend. Negative means the friend owes the user. */
export async function getDebts(
  user: UserId,
  t: pgPromise.ITask<{}>,
): Promise<{
  [email: string]: { balance: Money; payments: Array<Payment | Charge> };
}> {
  const uidToDebts = _.mapValues(
    await payments.getBalances(user, t),
    (amount, u2) => {
      const u1 = [user, u2].sort()[0];
      return u1 == user ? amount : amount.negate();
    },
  );
  const uids = _.keys(uidToDebts);
  const emails = await getEmails(uids, t);
  const ret: {
    [email: string]: { balance: Money; payments: Array<Payment | Charge> };
  } = {};
  for (let i = 0; i < uids.length; i++) {
    ret[emails[i]] = {
      balance: uidToDebts[uids[i]],
      payments: await payments.getPayments(user, uids[i], t),
    };
  }
  return ret;
}

// Doesn't have defaults applied. Prefer getSettingOrDefault to read a particular value.
export async function getRawSettings(
  user: UserId,
  t: pgPromise.ITask<{}>,
): Promise<UserSettings> {
  const row = await t.one("select settings from users where uid = $1", [user]);
  // Exclude keys that aren't in settings
  return _.pick(row.settings, Object.keys(settings.getDefaultSettings()));
}

export async function getSettingOrDefault(
  user: UserId,
  field: keyof UserSettings,
  t: pgPromise.ITask<{}>,
): Promise<boolean> {
  return settings.getWithDefault(await getRawSettings(user, t), field);
}

// XXX gets the user settings for the first user in the group
async function getRawGroupSettings(
  group: GroupId,
  t: pgPromise.ITask<{}>,
): Promise<UserSettings> {
  const row = await t.one(
    `select U.settings from users U
        left join membership M on U.uid = M.uid
        where M.gid = $1 limit 1`,
    [group],
  );
  // Exclude keys that aren't in settings
  return _.pick(row.settings, Object.keys(settings.getDefaultSettings()));
}

// XXX gets the user settings for the first user in the group
export async function getGroupSettingOrDefault(
  user: UserId,
  field: keyof UserSettings,
  t: pgPromise.ITask<{}>,
): Promise<boolean> {
  return settings.getWithDefault(await getRawGroupSettings(user, t), field);
}

export async function setSettings(
  user: UserId,
  userSettings: UserSettings,
  t: pgPromise.ITask<{}>,
): Promise<void> {
  return t.none("update users set settings = $1 where uid = $2", [
    userSettings,
    user,
  ]);
}
