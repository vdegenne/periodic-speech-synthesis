import { LitElement, html, css, PropertyValueMap } from 'lit'
import { customElement, property, query, state } from 'lit/decorators.js'
import '@material/mwc-snackbar'
import '@material/mwc-button'
import '@material/mwc-textarea'
import { TextArea } from '@material/mwc-textarea'
// import '@material/mwc-icon-button'
import '@material/mwc-dialog'
import { Dialog } from '@material/mwc-dialog'
import '@material/mwc-slider'
import { Slider } from '@material/mwc-slider'
// import '@material/mwc-textfield'
// import '@material/mwc-checkbox'
import { isFullJapanese } from "asian-regexps";
import { speakJapanese } from './speech'
import copyToClipBoard from "@vdegenne/clipboard-copy";
import { getExactSearch } from 'japanese-data-module';
import { playJapaneseAudio } from './util'

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
  private _historyList: string[] = []
  @state() pauseTimeS = 20
  private _timeout?: NodeJS.Timeout;

  @query('mwc-textarea') textarea!: TextArea;
  @query('mwc-slider') slider!: Slider;
  @query('mwc-dialog') dialog!: Dialog;

  static styles = css`
  #startButton {
    --mdc-theme-primary: green;
  }
  :host([running]) #startButton {
    --mdc-theme-primary: red;
  }
  mwc-textarea {
    width: 100%;
    margin-bottom: 12px;
    --mdc-text-field-fill-color: #222;
    --mdc-text-field-ink-color: white;
  }

  mwc-dialog mwc-button {
    --mdc-theme-primary: black;
  }
  `

  render () {
    return html`
    <mwc-textarea rows=12
      @keyup=${(e) => {this.onTextAreaKeyup(e)}}></mwc-textarea>

    <mwc-button id=startButton raised
      @click=${()=>{this.toggleStart()}}>${this.running ? 'stop' : 'start'}</mwc-button>
    <mwc-button outlined @click=${()=>{this.onFetchRemoteButtonClick()}}>remote data</mwc-button>
    <mwc-button outlined @click=${()=>{this.onCopyListButtonClick()}}>copy list</mwc-button>
    <mwc-button outlined @click=${() => { window.open('https://github.com/vdegenne/periodic-speech-synthesis/blob/master/docs/data.json', '_blank')}}>github</mwc-button>


    <mwc-dialog style="--mdc-dialog-min-width:calc(100vw - 24px)"
        @opened=${e=>{this.slider.layout()}}>
      <p>pause between (seconds)</p>
      <mwc-slider
        discrete
        withTickMarks
        min=5
        max=100
        value=${this.pauseTimeS}
        @change=${e=>{this.pauseTimeS = e.detail.value}}
      ></mwc-slider>

      <mwc-button unelevated slot=primaryAction
        @click=${()=>{this.toggleStart()}}>start</mwc-button>
    </mwc-dialog>
    `
  }
  protected async firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    this.getWordsList().then(result => {
      this._wordsList = result
      this.textarea.value  = this._wordsList.join('\n')
    })

    await this.textarea.updateComplete
    // this.textarea.shadowRoot?.querySelector('textarea')?.style.backgroundColor = 'black'
  }

  onCopyListButtonClick () {
    copyToClipBoard(JSON.stringify(this._wordsList))
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
      this.clearTimeout()
      this.running = false
    }
    else {
      if (this.dialog.open) {
        this.running = true
        this.playOneWord()
        this.runTimeout()
        this.dialog.close()
      }
      else {
        this.dialog.show()
      }
      // this.running = true
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

  runTimeout () {
    if (!this.running) { return }

    this._timeout = setTimeout(async () => {
      if (this.running) {
        await this.playOneWord()
        if (this.running) {
          this.runTimeout()
        }
      }
    }, this.pauseTimeS * 1000)
  }

  clearTimeout () {
    if (this._timeout) {
      clearTimeout(this._timeout)
      this._timeout = undefined
    }
  }

  async playOneWord () {
    let candidates = this._wordsList.filter(w=>!this._historyList.includes(w))
    if (candidates.length == 0) {
      this._historyList = []
      candidates = this._wordsList
    }
    const word = candidates[~~(Math.random() * candidates.length)]
    if (word && isFullJapanese(word)) {
      document.title = word
      await playJapaneseAudio(word)
    }
    this._historyList.push(word)
  }
}
