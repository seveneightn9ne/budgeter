import Money from "./Money";

export type UserId = string;
export type GroupId = string;
export type CategoryId = string;
export type FrameIndex = number;
export type TransactionId = string;
export type SplitId = string;
export type PaymentId = string;
export type SavingsTransactionId = string;

// Corresponds to `users` db table
export interface User {
  uid: UserId;
  name: string | null;
  email: string;
  password_hash: string;
  settings: UserSettings;
}
export interface UserSettings {
  emailNewTransaction?: boolean;
  emailNewPayment?: boolean;
}

// Corresponds to `categories` db table, plus `balance`
export interface Category {
  id: CategoryId;
  gid: GroupId;
  frame: FrameIndex;
  alive: boolean;
  name: string;
  ordering: number;
  budget: Money;
  ghost: boolean;
  parent?: CategoryId;
  balance?: Money;
  ctime?: Date;
}

// Corresponds to `frames` db table joined on `categories`, plus `balance`, `spending`, and `savings`
export interface Frame {
  gid: GroupId;
  index: FrameIndex;
  income: Money;
  ghost: boolean;
  categories: Category[];
  balance: Money;
  spending: Money;
  savings: Money;
  savingsTransactions: SavingsTransaction[];
}

// Corresponds to `transactions` db table plus shared_transaction data
export interface Transaction {
  id: TransactionId;
  gid: GroupId;
  frame: FrameIndex;
  category: CategoryId | null;
  amount: Money;
  description: string;
  alive: boolean;
  date: Date;
  split?: {
    id: SplitId;
    with: Friend;
    payer: UserId;
    settled: boolean;
    myShare: Share;
    theirShare: Share;
    otherAmount: Money;
  };
}

export interface Friend {
  uid: UserId;
  gid: GroupId;
  email: string;
  name: string | null;
}

export interface InitState {
  frame?: Frame;
  friends?: Friend[];
  pendingFriends?: Friend[];
  invites?: Friend[];
  transactions?: Transaction[];
  debts?: {
    [email: string]: {
      balance: Money;
      payments: Array<Payment | Charge>;
    };
  };
  me?: Friend;
  history?: {
    [categoryId: string]: Array<{
      budget: Money;
      spending: Money;
    }>;
  };
  settings?: UserSettings;
}

export interface Payment {
  type: "payment";
  id: PaymentId;
  payer: UserId;
  payee: UserId;
  amount: Money;
  date: Date;
  memo: string;
  frame: FrameIndex;
}

export interface Charge {
  type: "charge";
  id: PaymentId;
  debtor: UserId;
  debtee: UserId;
  amount: Money;
  date: Date;
  memo: string;
  frame: FrameIndex;
}

export interface SavingsTransaction {
  id: SavingsTransactionId;
  gid: GroupId;
  amount: Money;
  frame: FrameIndex;
  ctime?: Date;
}

export class Share extends Money {
  public static normalize(...shares: Share[]): NormalizedShare[] {
    const total = shares.reduce((a, b) => a.plus(b), Share.Zero);
    return shares.map(s => new NormalizedShare(s.dividedBy(total).num));
  }
  public asNumber(): number {
    return this.num.toNumber();
  }
  public static fromMoney(m: Money) {
    return new Share(m.num);
  }
  public string(): string {
    return this.num.toString();
  }
  public toJSON(): string {
    return this.string();
  }
  public formatted() {
    return this.string();
  }
}
export class NormalizedShare extends Share {
  public of(money: Money): Money {
    return new Money(this.num.times(money.num));
  }
}

// db: email_resets
export interface EmailReset {
  uid: UserId;
  token: string;
  expires: Date;
}
