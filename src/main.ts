import { LitElement, html, css, PropertyValueMap } from 'lit'
import { customElement, property, query, state } from 'lit/decorators.js'
import '@material/mwc-snackbar'
import '@material/mwc-button'
import '@material/mwc-textarea'
import { TextArea } from '@material/mwc-textarea'
// import '@material/mwc-icon-button'
// import '@material/mwc-dialog'
// import '@material/mwc-textfield'
// import '@material/mwc-checkbox'

declare global {
  interface Window {
    app: AppContainer;
    toast: (labelText: string, timeoutMs?: number) => void;
  }
}

@customElement('app-container')
export class AppContainer extends LitElement {
  @property({ type: Boolean, reflect: true }) running = false

  @state() private _wordsList: string[] = []

  @query('mwc-textarea') textarea!: TextArea;

  static styles = css`
  #startButton {
    --mdc-theme-primary: green;
  }
  :host([running]) #startButton {
    --mdc-theme-primary: red;
  }
  mwc-textarea {
    width: 100%;
  }
  `

  render () {
    return html`
    <mwc-textarea rows=12
      @keyup=${(e) => {this.onTextAreaKeyup(e)}}></mwc-textarea>
    <mwc-button id=startButton raised
      @click=${()=>{this.toggleStart()}}>${this.running ? 'stop' : 'start'}</mwc-button>
    <mwc-button @click=${()=>{this.onFetchRemoteButtonClick()}}>remote data</mwc-button>
    `
  }
  protected firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    this.getWordsList().then(result => {
      this._wordsList = result
      this.textarea.value  = this._wordsList.join('\n')
    })
  }
  onTextAreaKeyup(e: KeyboardEvent) {
    if (this.running && this.textarea.value.length == 0) {
      this.toggleStart()
    }

    this.buildWordsListFromTextArea()
    this.saveWordsList()
  }

  toggleStart() {
    if (this.running) {
      this.running = false
    }
    else {
      this.running = true
    }
  }

  buildWordsListFromTextArea () {
    const value = this.textarea.value
    if (value) {
      this._wordsList = value.split('\n')
    }
  }

  async getWordsList () {
    let list = []
    if (localStorage.getItem('periodic-speech-synthesis:data')) {
      list = JSON.parse(localStorage.getItem('periodic-speech-synthesis:data')!)
    }

    if (!list || list.length == 0) {
      try {
        list = await this.getDataFromRemote()
      } catch (e) {
        // something went wrong during the fetch
        // ignore
      }
    }

    return list
  }

  saveWordsList () {
    localStorage.setItem('periodic-speech-synthesis:data', JSON.stringify(this._wordsList))
  }

  async getDataFromRemote () {
    const response = await fetch('./data.json')
    if (response.status !== 200) { throw new Error }
    return await response.json()
  }

  async onFetchRemoteButtonClick () {
    try {
      this._wordsList = await this.getDataFromRemote()
      this.textarea.value = this._wordsList.join('\n')
      // this.saveWordsList()
    } catch (e) {}
  }
}
