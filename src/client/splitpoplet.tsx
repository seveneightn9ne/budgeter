
import * as React from 'react';
import Poplet from './components/poplet';
import {Transaction, UserId, Share} from '../shared/types';
import { cc, apiPost } from './util';
import Money from '../shared/Money';

interface Props {
    //me: UserId;
    transaction: Transaction;
    onUpdateTransaction: (t: Transaction) => void;
}
interface State {
    total: string;
    totalErr: boolean;
    yourShare: string;
    yourErr: boolean;
    theirShare: string;
    theirErr: boolean;
    settled: boolean;
    youPaid: boolean;
}
export default class SplitPoplet extends React.Component<Props, State> {
    private poplet: React.RefObject<Poplet>;
    constructor(props: Props) {
        super(props);
        this.state = initialState(props.transaction);
        this.poplet = React.createRef();
    }

    /*componentDidUpdate(prevProps: Props) {
        if (prevProps.transaction.amount != this.props.transaction.amount ||
            prevProps.transaction.split.otherAmount != this.props.transaction.split.otherAmount) {
            this.setState(initialState(this.props))
        }
    }*/
    
    handleSubmit(event: React.FormEvent): void {
        event.preventDefault();
        const total = new Money(this.state.total);
        const totalErr = !total.isValid(false);
        const myShare = new Share(this.state.yourShare);
        const yourErr = !myShare.isValid(false);
        const theirShare = new Share(this.state.theirShare);
        const theirErr = !theirShare.isValid(false);
        const iPaid = this.state.youPaid;
        if (totalErr || yourErr || theirErr) {
            this.setState({totalErr, yourErr, theirErr});
            return;
        }
        const yourAmount = youPay(this.state);
        apiPost({
            path: '/api/transaction/split',
            body: {
                tid: this.props.transaction.id,
                sid: this.props.transaction.split.id,
                total, myShare, theirShare, iPaid,
            },
        }).then(() => {
            const newTransaction = {...this.props.transaction};
            newTransaction.split = {...this.props.transaction.split, myShare, theirShare,
                // XXX: using "0" because I don't know my own uid.
                payer: iPaid ? "0" : this.props.transaction.split.with.uid,
            };
            newTransaction.amount = yourAmount;
            // onUpdateTransaction will unmount this component
            this.props.onUpdateTransaction(newTransaction);
            this.setState(initialState(newTransaction));
            if (this.poplet.current) this.poplet.current.close();
        });
    }

    render() {
        return <Poplet className="txentry" text="shared" ref={this.poplet}>
            <h2>Split with {this.props.transaction.split.with.email}</h2>
            <form onSubmit={this.handleSubmit.bind(this)}>
            <label>Total: <input className={cls(this.state.totalErr)} type="text"
                value={this.state.total} onChange={cc(this, 'total')} /></label>
            <label className="first half">
                Your share: <input className={cls(this.state.yourErr)} type="number"
                    value={this.state.yourShare} onChange={cc(this, 'yourShare')} /> 
            </label><label className="half">
                Their share: <input className={cls(this.state.theirErr)} type="number"
                    value={this.state.theirShare} onChange={cc(this, 'theirShare')} /></label>
            <div className="section" style={{clear: 'both'}}>
                <label className="nostyle"><input type="radio" name="payer" value="0" checked={this.state.youPaid}
                    onChange={(e) => this.setState({youPaid: e.target.checked})} /> You paid</label>
                <label className="nostyle"><input type="radio" name="payer" value="1" checked={!this.state.youPaid} 
                    onChange={(e) => this.setState({youPaid: !e.target.checked})} /> They paid</label>
            </div>
            <div className="section">You spent {youPay(this.state).string()}.</div>
            <input className="button" type="submit" value="Save" />
            </form>
        </Poplet>;
    }
}

function initialState(transaction: Transaction): State {
    const yourAmount = transaction.amount;
    const yourShare = transaction.split.myShare;
    const theirShare = transaction.split.theirShare;
    const theirAmount = transaction.split.otherAmount;
    return {
        total: yourAmount.plus(theirAmount).string(),
        totalErr: false,
        yourShare: yourShare.string(),
        yourErr: false,
        theirShare: theirShare.string(),
        theirErr: false,
        settled: false,
        youPaid: transaction.split.payer != transaction.split.with.uid,
    }
}

function cls(isError: boolean): string {
    return isError ? 'error' : '';
}

function youPay(state: State): Money {
    const [yourShare, _] = Share.normalize(new Share(state.yourShare), new Share(state.theirShare));
    return yourShare.of(new Money(state.total));
}