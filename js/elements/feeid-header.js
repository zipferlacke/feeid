/**
 * <feeid-header> Custom Element
 *
 * Attribute:
 *   subtitle – optionaler Untertitel (z.B. '/ Entdecken')
 */

export class FeeidHeader extends HTMLElement {

  connectedCallback() {
    this.id = 'feeid-header';
    this._render();
  }

  static get observedAttributes() {
    return ['subtitle'];
  }

  attributeChangedCallback() {
    if (this.isConnected) this._render();
  }

  _render() {
    const subtitle = this.getAttribute('subtitle') || '';
    this.innerHTML = `
      <span class="logo">feeid</span>
      ${subtitle ? `<span class="feeid-header__subtitle">${subtitle}</span>` : ''}`;
  }
}

customElements.define('feeid-header', FeeidHeader);