export const addClass = (element: HTMLElement, ...rest: string[]) => rest.forEach(x => element.classList.add('DT_' + x.toUpperCase())),
makeButton = (name: string, action: () => any, parent: HTMLElement, classname = '') => {
  const button = document.createElement('button');
  button.innerHTML = name;
  addClass(button, classname || name.toUpperCase(), 'BUTTON');
  button.addEventListener('click', action);
  parent.appendChild(button);
  return button;
}, makeNode = (tag: string, ...classname: string[]) => {
  const node = document.createElement(tag);
  addClass(node, ...classname);
  return node;
}, makeSpan = (parent: HTMLElement, content: string, ...classname: string[]) => {
  const span = document.createElement('span');
  addClass(span, ...classname);
  span.innerHTML = content;
  parent.appendChild(span);
};
