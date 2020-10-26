import * as React from "react";
import { Link, RouteComponentProps } from "react-router-dom";
import { Action, AI, getAIs } from "../shared/ai";
import { Income } from "../shared/api";
import * as frames from "../shared/frames";
import Money from "../shared/Money";
import { Category, CategoryId, Frame as FrameType } from "../shared/types";
import AIComponent, { CategoryAI } from "./ai";
import CategorySection from "./CategorySection";
import { BlobOp } from "./components/blob";
import { ClickToEditMoney } from "./components/clicktoedit";
import { ProgressBar } from "./components/progressbar";
import NewCategory from "./newcategory";

interface Props extends RouteComponentProps<{ month: number; year: number }> {
  month: number;
  year: number;
  frame: FrameType;
  onAddCategory: (c: Category) => void;
  onChangeCategory: (c: Category) => void;
  onDeleteCategory: (c: CategoryId) => void;
  onNewIncome: (newIncome: Money) => void;
  onAddToSavings: (amt: Money) => void;
}
interface State {
  budgeted?: Money;
  setIncome: string;
  setIncomeErr?: boolean;
  newCat?: CategoryId;
}

/** shows the categories list on the home page */
export default class Categories extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      setIncome: "",
    };
  }
  public render() {
    const cs = this.props.frame.categories.map((c) => (
      <CategorySection
        key={c.id}
        category={c}
        categories={this.props.frame.categories}
        newCat={this.state.newCat}
        match={this.props.match}
        budgetLeftover={frames.unbudgeted(this.props.frame)}
        onDeleteCategory={this.props.onDeleteCategory}
        onChangeCategory={this.props.onChangeCategory}
      />
    ));

    const ais = this.getAIs().map((ai) => {
      if (ai.action && ai.action.type === "choose-category") {
        return (
          <CategoryAI
            ai={ai}
            categories={this.props.frame.categories}
            onChangeCategory={this.props.onChangeCategory}
            onAddToSavings={this.props.onAddToSavings}
            key={ai.message()}
          />
        );
      }
      if (ai.action) {
        throw Error("AI has unexpected action");
      }
      return <AIComponent ai={ai as AI<null>} key={ai.message()} />;
    });
    // income - spent = balance;
    // spent = income - balance;
    const income = (
      <ClickToEditMoney
        api={Income}
        size={6}
        value={this.props.frame.income}
        onChange={this.props.onNewIncome}
        postData={{ frame: this.props.frame.index }}
        postKey="income"
      />
    );

    const transactionLink = (
      <Link
        className="spent"
        to={`/app/${this.props.month + 1}/${this.props.year}/transactions`}
      >
        {this.props.frame.spending.formatted()}
      </Link>
    );

    const [savingsTxnOp, savingsTxns] = this.renderSavingsTransactions();

    return (
      <div>
        <div className="blobs summary">
          <div className="savings">
            <span className="fas fa-university" />
            <span className="title">Savings</span>
            <span className="amount">
              {this.props.frame.savings.formatted()}
            </span>
          </div>

          <div className="income">
            <span className="fas fa-money-check-alt" />
            <span className="title">Income</span>
            <span className="amount">{income}</span>
          </div>

          <BlobOp op="-" />

          <div className="spent">
            <span className="far fa-credit-card" />
            <span className="title">Spent</span>
            <span className="amount">{transactionLink}</span>
          </div>

          {savingsTxnOp}
          {savingsTxns}

          <BlobOp op="=" />

          <div className="balance">
            <span className="fas fa-coins" />
            <span className="title">Balance</span>
            <span className="amount">
              {this.props.frame.balance.formatted()}
            </span>
          </div>
        </div>

        <ProgressBar
          frame={this.props.frame.index}
          amount={this.props.frame.spending}
          total={this.props.frame.balance.plus(this.props.frame.spending)}
          className="overall-progress"
        />

        {ais}
        <table className="categories" cellPadding={0} cellSpacing={0}>
          <tbody>
            <tr>
              <th />
              <th className="stretch">Category</th>
              <th className="progress-td" />
              <th>Budget</th>
              <th>Spending</th>
              <th>Balance</th>
            </tr>
            <tr>
              <td />
              <td colSpan={4}>
                <NewCategory
                  frame={this.props.frame.index}
                  onAddCategory={this.onAddCategory}
                />
              </td>
            </tr>
            {cs}
          </tbody>
        </table>
      </div>
    );
  }

  private renderSavingsTransactions(): [JSX.Element, JSX.Element] {
    if (this.props.frame.savingsTransactions.length === 0) {
      return [null, null];
    }

    const sum = Money.sum(
      this.props.frame.savingsTransactions.map((s) => s.amount),
    );
    if (sum.cmp(Money.Zero) === 0) {
      return [null, null];
    }

    // if sum < 0, money was taken out of savings, so we get a +
    const op = sum.cmp(Money.Zero) < 0 ? "+" : "-";
    const amount = sum.cmp(Money.Zero) < 0 ? sum.negate() : sum;
    const toFrom = sum.cmp(Money.Zero) < 0 ? "From" : "To";

    return [
      <BlobOp op={op} key="op" />,
      <div className="netSavings" key="savings">
        <span className="fas fa-piggy-bank" />
        <span className="title">{toFrom} savings</span>
        <span className="amount">{amount.formatted()}</span>
      </div>,
    ];
  }

  private onAddCategory = (c: Category) => {
    this.setState({ newCat: c.id });
    this.props.onAddCategory(c);
    setTimeout(() => this.setState({ newCat: undefined }), 1000);
  };

  private getAIs(): Array<AI<Action>> {
    return getAIs(this.props.frame);
  }
}
