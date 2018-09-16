import {Frame, FrameIndex} from './types';
import Money from './Money';
import * as categories from './categories';

export function index(month: number, year: number): FrameIndex {
    return (year - 1970) * 12 + month;
}

export function month(frame: FrameIndex): number {
    return frame % 12;
}

export function year(frame: FrameIndex): number {
    return Math.floor(frame / 12) + 1970;
}

export function updateBalanceWithIncome(balance: Money, income: Money, newIncome: Money): Money {
return balance.minus(income).plus(newIncome);
}

/** Works with a DB row or a JSON parsed object */
export function fromSerialized(row: any): Frame {
    if (!row) {
        return null;
    }
    const frame: Frame = {...row};
    if (row.income) {
        frame.income = new Money(row.income);
    }
    if (row.balance) {
        frame.balance = new Money(row.balance);
    }
    if (row.categories) {
        frame.categories = row.categories.map(categories.fromSerialized);
    }
    if (row.spending) {
        frame.spending = new Money(row.spending);
    }
    return frame;
}