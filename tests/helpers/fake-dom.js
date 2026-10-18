// SPDX-License-Identifier: GPL-3.0-or-later
// KI-generiert: Minimal DOM test double for unit tests without extra dependencies.
'use strict';

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attributes = new Map();
    this.listeners = new Map();
    this.textContent = '';
    this.className = '';
    this.hidden = false;
    this.disabled = false;
    this.checked = false;
    this.value = '';
    this.src = '';
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  replaceChildren(...nodes) {
    this.children.forEach((child) => {
      child.parentNode = null;
    });
    this.children = [];
    nodes.forEach((node) => this.appendChild(node));
  }

  replaceWith(node) {
    const parent = this.parentNode;
    const index = parent.children.indexOf(this);
    parent.children[index] = node;
    node.parentNode = parent;
    this.parentNode = null;
  }

  remove() {
    if (this.parentNode) {
      const siblings = this.parentNode.children;
      siblings.splice(siblings.indexOf(this), 1);
      this.parentNode = null;
    }
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(listener);
  }

  dispatch(type, extra = {}) {
    const event = { type, target: this, defaultPrevented: false, ...extra };
    event.preventDefault = () => {
      event.defaultPrevented = true;
    };
    (this.listeners.get(type) || []).forEach((listener) => listener(event));
    return event;
  }

  click() {
    return this.dispatch('click');
  }

  /** Recursively finds all descendants matching the predicate. */
  findAll(predicate) {
    return this.children.flatMap((child) => [
      ...(predicate(child) ? [child] : []),
      ...child.findAll(predicate),
    ]);
  }

  findByTag(tagName) {
    return this.findAll((node) => node.tagName === tagName.toUpperCase());
  }

  findByClass(className) {
    return this.findAll((node) => node.className.split(' ').includes(className));
  }

  /** Entire text of the subtree (for simple assertions). */
  allText() {
    return [this.textContent, ...this.children.map((child) => child.allText())].join(' ');
  }
}

class FakeDocument {
  constructor() {
    this.registry = new Map();
    this.documentElement = new FakeElement('html');
    this.title = '';
  }

  createElement(tagName) {
    return new FakeElement(tagName);
  }

  register(id, tagName = 'div') {
    if (this.registry.has(id)) {
      return this.registry.get(id);
    }
    const element = new FakeElement(tagName);
    this.registry.set(id, element);
    return element;
  }

  getElementById(id) {
    return this.registry.get(id) || null;
  }
}

module.exports = { FakeElement, FakeDocument };
