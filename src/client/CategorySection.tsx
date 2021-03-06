import * as React from "react";
import { Category } from "../shared/types";
import CategoryRow, { CategoryRowProps } from "./categoryrow";

export default class CategorySection extends React.Component<
  CategoryRowProps,
  {}
> {
  private children = (): Category[] => {
    return this.props.categories.filter(
      (c) => c.parent === this.props.category.id,
    );
  };

  public render() {
    const children = this.children();
    if (children.length === 0) {
      return <CategoryRow {...this.props} />;
    }

    return (
      <React.Fragment>
        <CategoryRow {...this.props} />
        {this.renderChildren()}
      </React.Fragment>
    );
  }

  private renderChildren() {
    const children = this.children()
      .map((c) => ({
        ...this.props,
        category: c,
        key: c.id,
        depth: this.props.depth + 1,
      }))
      .map((props) => <CategoryRow key={props.key} {...props} />);
    return <React.Fragment>
      {children}
      {this.renderOtherRow()}
    </React.Fragment>;
  }

  private renderOtherRow() {
    return <CategoryRow 
      key="other"
      category={this.props.category}
      categories={this.props.categories}
      budgetLeftover={this.props.budgetLeftover}
      depth={this.props.depth + 1}
      onDeleteCategory={this.props.onDeleteCategory}
      onChangeCategory={this.props.onChangeCategory}
      match={this.props.match}
      isOther={true}
    />
  }
}
