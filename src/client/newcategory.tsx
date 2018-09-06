import * as React from 'react';
import {RouteComponentProps} from 'react-router';
import {Frame as FrameType, Money, FrameIndex, Category } from '../shared/types';
import TxEntry from './txentry'
import {fromSerialized} from '../shared/categories';

interface NewCategoryProps {
    frame: FrameIndex;
    onAddCategory: (category: Category) => void;
}
interface NewCategoryState {
    expanded: boolean;
    value: string;
}

export default class NewCategory extends React.Component<NewCategoryProps, NewCategoryState> {

    state = {expanded: false, value: ''};

    expand(): boolean {
        this.setState({expanded: true});
        return true; // stop propagation
    }

    updateValue(event: React.ChangeEvent<HTMLInputElement>): void {
        this.setState({value: event.target.value});
    }

    submit(event: React.FormEvent): void {
        fetch('/api/category', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
            body: JSON.stringify({
                frame: this.props.frame,
                name: this.state.value,
            }),
        }).then(response => {
            return response.json();
        }).then(response => {
            this.props.onAddCategory(fromSerialized(response.category));
            this.setState({expanded: false, value: ""});
        });
        event.preventDefault();
    }

    render() {
        if (!this.state.expanded) {
            return <span onClick={() => this.expand()} className="clickable new-category"><span className="fa-plus-circle fas"></span> Category</span>;
        }
        return <form onSubmit={this.submit.bind(this)} onBlur={() => this.setState({expanded: false})}>
            <input type="text" placeholder="New Category" autoFocus
                value={this.state.value} onChange={(e) => this.updateValue(e)} />
            <input type="submit" disabled={!this.state.value} value="Add" />
        </form>;
    }
}
