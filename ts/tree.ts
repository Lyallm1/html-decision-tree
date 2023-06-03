import * as util from './util.js';

export class Tree {
  jsonStr = '';
  root: Node = null;
  history: number[] = [];
  rootElement: HTMLElement;
  summaryElement = new Summary();
  
  static create(url: string, result: HTMLElement, error?: HTMLElement) {
    const tree = new Tree();
    tree.loadJson(url).then(p => {
      if (error) {
        error.innerHTML = p;
        error.style.display = 'hide';
      }
      tree.toHTML(result);
    }).catch(p => {
      if (!error) throw error;
      error.innerHTML = p;
      error.style.display = 'block';
      error.style.visibility = 'visible';
    });
  }

  loadJson(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const httpRequest = new XMLHttpRequest();
      httpRequest.onreadystatechange = (() => {
        if (httpRequest.readyState === 4) httpRequest.status === 200 ? this._loadJson(httpRequest.responseText, resolve, reject) : reject(httpRequest.statusText);
      }).bind(this);
      httpRequest.onerror = (() => reject(httpRequest.statusText)).bind(this);
      httpRequest.open('GET', url, true);
      httpRequest.send();
    });
  }


  protected _loadJson(json: string, resolve: (text: string) => void, reject: (text: string) => void) {
    try {
      this.jsonStr = json;
      this.fromJson();
      resolve('JSON loaded');
    } catch (err) {
      reject('JSON Parser Error!');
    }
  }

  fromJson() {
    this.root = Node.fromJson(JSON.parse(this.jsonStr));
    new DepthFirst(this, x => x).result.forEach(n => n.tree = this);
    this.summaryElement.parent = this.root;
    this.summaryElement.tree = this;
  }

  toHTML(node: HTMLElement) {
    this.rootElement = node;
    new DepthFirst(this, x=> x).result.forEach(n => {
      node.appendChild(n.toHtml());
      n.hide();
    });
    node.appendChild(this.summaryElement.toHtml());
    this.summaryElement.hide();
    this.root.show();
  }

  summary(node: Node) {
    node.hide();
    this.summaryElement.parent = node;
    this.summaryElement.show();
  }
}
export class DepthFirst {
  result: any[] = [];

  constructor(tree: Tree, private func: (x: Node) => Node) {
    this.visit(tree.root);
  }

  private visit(node: Node) {
    this.result.push(this.func(node));
    node.children.forEach(this.visit);
  }
}
export abstract class Node {
  protected static counter = 0;
  protected static labelCounter = 0;
  kind = '';
  tree: Tree;
  nextName = 'Next';
  previousName = 'Back';
  labels = new Map<number, string>();
  children = new Map<number, Node>();
  parent: Node = null;
  variable = 'dt_variable_' + Node.counter++;
  card = new Card();
  radioButtons: HTMLElement[] = [];

  constructor(public content: string, public title: string = '', public value = 0, labels: { text: string, value: number }[] = []) {
    for (const { text, value } of labels) this.labels.set(value, text);
  }

  private static parseChildren(node: Node, json: any[]) {
    if (!(json && json.length)) return;
    for (const child of json) {
      const childNode = Node.fromJson(child);
      node.children.set(childNode.value, childNode);
      childNode.parent = node;
    }
  }

  static fromJson(json: any): Node {
    let node: Node = null;
    switch (json.type || 'leaf') {
      case 'leaf': node = new Leaf(json.content, json.title, json.value, json.action); break;
      case 'nary': node = new Nary(json.content, json.title, json.value, json.labels || []); Node.parseChildren(node, json.children); break;
      case 'binary': node = new Binary(json.content, json.title, json.value); Node.parseChildren(node, json.children); break;
      default: throw Error('Unknown node type.');
    }
    return node;
  }

  toHtml(): HTMLElement {
    util.addClass(this.card.div, this.kind);
    this.card.title.innerHTML = this.title;
    const content = document.createElement('span');
    util.addClass(content, 'CONTENT');
    content.innerHTML = this.content;
    this.card.content.appendChild(content);
    this.radios();
    this.buttons();
    return this.card.div;
  }

  protected radios() {
    for (const [key, value] of this.labels) {
      const content = util.makeNode('div', 'RADIOBUTTON'), radio = document.createElement('input');
      util.addClass(radio, 'RADIO');
      const radioId = 'dt_id_' + Node.labelCounter++;
      radio.type = 'radio';
      radio.id = radioId;
      radio.name = this.variable;
      radio.value = key.toString();
      this.radioButtons.push(radio);
      const label = document.createElement('label');
      util.addClass(label, 'LABEL');
      label.id = `dt_id_${Node.labelCounter++}`;
      label.setAttribute('for', radioId);
      label.innerHTML = value;
      content.appendChild(radio);
      content.appendChild(label);
      this.card.content.appendChild(content);
    }
  }

  protected buttons() {
    if (this.parent) util.makeButton(this.previousName, this.firePrevious.bind(this), this.card.buttons, 'PREVIOUS');
    util.makeButton(this.nextName, this.fireNext.bind(this), this.card.buttons, 'NEXT');
  }

  protected fireNext() {
    for (const radio of this.radioButtons as HTMLInputElement[]) if (radio.checked) {
      const num = parseInt(radio.value, 10);
      this.tree.history.push(num);
      this.hide();
      this.children.get(num).show();
      return;
    }
  }

  protected firePrevious() {
    if (this.parent) {
      this.hide();
      this.parent.show();
    }
  }

  show() {
    this.card.show();
  }

  hide() {
    this.card.hide();
  }
}
export class Binary extends Node {
  kind = 'binary';

  constructor(public content: string, public title: string, public value = 0) {
    super(content, title, value, [{ text: 'Yes', value: 1 }, { text: 'No', value: 0 }]);
  }
}
export class Nary extends Node {
  kind = 'nary';
}
export class Leaf extends Node {
  kind = 'leaf';
  nextName = 'Restart';
  summaryButton: HTMLElement;
  actionButton: HTMLElement;

  constructor(content: string, title: string, value: number, public action = '') {
    super(content, title, value);
  }

  protected buttons() {
    super.buttons();
    this.summaryButton = util.makeButton('Summary', this.fireSummary.bind(this), this.card.buttons);
    if (this.action) {
      this.actionButton = util.makeButton('Go', this.fireAction.bind(this), this.card.buttons, 'ACTION');
      document.createElement('button');
    }
  }

  protected fireAction() {
    open(this.action, '_blank');
  }

  protected fireSummary() {
    this.tree.summary(this);
  }

  protected fireNext() {
    this.hide();
    this.tree.root.show();
    this.tree.history = [];
  }
}
export class Summary extends Node {
  kind = 'summary';
  nextName = 'Restart';
  summaryElement = util.makeNode('div', 'SUMMARY');
  
  constructor() {
    super('', 'Summary');
    this.card.content.appendChild(this.summaryElement);
  }

  protected fireNext() {
    this.hide();
    this.tree.root.show();
    this.tree.history = [];
  }

  show() {
    super.show();
    let count = 0, node = this.parent;
    const result = [];
    this.summaryElement.innerHTML = '';
    do {
      result.unshift(this.makeSummaryLine(node.content, count ? node.labels.get(this.tree.history[this.tree.history.length - count]) : ''));
      node = node.parent;
      count++;
    } while (node);
    result.forEach(this.summaryElement.appendChild);
  }

  private makeSummaryLine(question: string, answer: string): HTMLElement {
    const div = util.makeNode('div', 'SUMMARYLINE');
    util.makeSpan(div, question, 'QUESTION');
    util.makeSpan(div, answer, 'ANSWER');
    return div;
  }
}
export class Card {
  div = util.makeNode('div', 'NODE');
  title = util.makeNode('h1', 'TITLE');
  content = util.makeNode('div', 'CONTENT')
  buttons = util.makeNode('div', 'BUTTONS');

  constructor() {
    this.div.appendChild(this.title);
    this.title.setAttribute('tabindex', '-1');
    this.div.appendChild(this.content);
    this.content.setAttribute('tabindex', '-1');
    this.div.appendChild(this.buttons);
  }

  show() {
    this.div.style.display = 'block';
    this.title.setAttribute('aria-live', 'polite');
    this.content.setAttribute('tabindex', '0');
    this.title.setAttribute('tabindex', '0');
    this.title.focus();
  }

  hide() {
    this.div.style.display = 'none';
    this.title.removeAttribute('aria-live');
    this.title.setAttribute('tabindex', '-1');
    this.content.setAttribute('tabindex', '-1');
  }
}
