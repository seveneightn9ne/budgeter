import {GroupId, Money, FrameIndex, CategoryId} from '../shared/types';
import pgPromise from 'pg-promise';
export * from '../shared/categories';

export const DEFAULT_CATEGORIES = [
    "Rent",
    "Gas",
    "Electric",
    "Internet",
    "Cell Phone",
    "Transportation",
    "Debt Payments",
    "Groceries",
    "Clothing",
    "Charity",
    "Gifts",
    "Vacation & Travel",
    "Shopping",
    "Restaurants",
    "Stuff I Forgot To Budget For",
];

export function getNextOrdinal(gid: GroupId, frame: FrameIndex, t: pgPromise.ITask<{}>): Promise<number> {
    return t.oneOrNone("select ordering from categories where gid = $1 and frame = $2 order by ordering desc limit 1",
        [gid, frame]).then(row => row ? row.ordering + 1 : 0);
}

export function getSpending(id: CategoryId, frame: FrameIndex, t: pgPromise.ITask<{}>): Promise<Money> {
    return t.manyOrNone("select amount from transactions where category = $1 and frame = $2 and alive = true", [id, frame]).then(rows => {
        if (!rows) {
            return Money.Zero;
        }
        return rows.reduce((a: Money, row: any) => a.plus(new Money(row.amount)), Money.Zero);
    });
}

export function getBudget(id: CategoryId, frame: FrameIndex, t: pgPromise.ITask<{}>): Promise<Money> {
    return t.one("select budget from categories where id = $1 and frame = $2", [id, frame]).then(row => {
        return new Money(row.budget);
    });
}
