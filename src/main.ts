import { LitElement, html, css, PropertyValueMap, nothing } from 'lit'
import { customElement, property, query, state } from 'lit/decorators.js'
import '@material/mwc-snackbar'
import '@material/mwc-button'
import '@material/mwc-icon-button'
// import '@material/mwc-textarea'
import { TextArea } from '@material/mwc-textarea'
// import '@material/mwc-icon-button'
import '@material/mwc-dialog'
import { Dialog } from '@material/mwc-dialog'
import '@material/mwc-slider'
import { Slider } from '@material/mwc-slider'
// import '@material/mwc-textfield'
// import '@material/mwc-checkbox'
import { isFullJapanese } from "asian-regexps";
import copyToClipBoard from "@vdegenne/clipboard-copy";
import { googleImageSearch, jisho, playJapaneseAudio } from './util'
import '@material/mwc-select'
import '@material/mwc-list'
import { Select } from '@material/mwc-select'

declare global {
  interface Window {
    app: AppContainer;
    toast: (labelText: string, timeoutMs?: number) => void;
  }
}

type Project = {
  name: string,
  wordsList: string[]
}

@customElement('app-container')
export class AppContainer extends LitElement {
  @property({ type: Boolean, reflect: true }) running = false

  @state() private projects: Project[] = [];
  @state() private selectedProjectIndex = 0
  private _historyList: string[] = [];
  @state() pauseTimeS = 60;
  private _timeout?: NodeJS.Timeout;
  @state() currentWord?: string;

  @query('textarea') textarea!: HTMLTextAreaElement;
  @query('mwc-slider') slider!: Slider;
  @query('mwc-dialog') dialog!: Dialog;
  @query('mwc-select') select!: Select;

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
  textarea {
    display: block;
    border: none;
    width: 100vw;
    box-sizing: border-box;
    resize: vertical;
    font-size: 2em;
    background-color: #222;
    color: white;
  }

  mwc-dialog mwc-button {
    --mdc-theme-primary: black;
  }
  mwc-select {
    --mdc-theme-primary: black;
  }
  #word {
    background-color:#222;color:white;border-radius:25px;display: flex;align-items: center;padding: 0 19px;
  }
  #word > mwc-icon-button {
  }
  `

  render () {
    return html`
    <div style="display:flex;align-items:center">
      <mwc-select style="--mdc-theme-surface: white;--mdc-select-fill-color:#222;--mdc-select-ink-color:white"
        @selected=${e=>{this.onProjectSelectChange(e)}}>
        ${this.projects.map(p => {
          return html`<mwc-list-item value=${p.name}>${p.name}</mwc-list-item>`
        })}
      </mwc-select>
      <mwc-icon-button icon=add @click=${()=>{this.addNewProject()}}></mwc-icon-button>
    </div>

    <textarea rows=12
      @keyup=${(e) => {this.onTextAreaKeyup(e)}}></textarea><div id=controls>
      <mwc-button id=startButton raised
        @click=${()=>{this.toggleStart()}}>${this.running ? 'stop' : 'start'}</mwc-button>
      <mwc-button outlined @click=${()=>{this.onFetchRemoteButtonClick()}}>remote data</mwc-button>
      <mwc-button outlined @click=${()=>{this.onCopyListButtonClick()}}>copy app data</mwc-button>
      <mwc-button outlined @click=${() => { window.open('https://github.com/vdegenne/periodic-speech-synthesis/blob/master/docs/data.json', '_blank')}}>github</mwc-button>
    </div>
    ${this.currentWord ? html`
      <div id="word">
        <span style="margin-right:12px;font-size:2em">${this.currentWord}</span>
        <mwc-icon-button icon=volume_up @click=${()=>{playJapaneseAudio(this.currentWord!)}}></mwc-icon-button>
        <mwc-icon-button icon=image @click=${()=>{googleImageSearch(this.currentWord!)}}></mwc-icon-button>
        <!-- <mwc-button oultined
            @click=${()=>{playJapaneseAudio(this.currentWord!);this.textarea.focus()}}>${this.currentWord}</mwc-button> -->
      </div>`
    : nothing}


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

  protected async firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
    this.getData().then(async data => {
      this.projects = data
      await this.select.updateComplete
      this.select.select(0)
      // this.textarea.value  = this._wordsList.join('\n')
    })

    // await this.textarea.updateComplete
    // this.textarea.shadowRoot?.querySelector('textarea')?.style.backgroundColor = 'black'

    window.addEventListener('keydown', (e) => {
      if (e.code == 'KeyA') {
        if (this.currentWord) {
          googleImageSearch(this.currentWord)
        }
      }
      if (e.code == 'KeyG') {
        if (this.currentWord) {
          jisho(this.currentWord)
        }
      }
      if (e.code == 'KeyS') {
        if (this.currentWord) {
          playJapaneseAudio(this.currentWord)
        }
      }
    })
  }

  onProjectSelectChange (e) {
    if (this.running) {
      this.toggleStart()
    }
    this.selectedProjectIndex = e.detail.index;
    this.textarea.value = this.projects[this.selectedProjectIndex].wordsList.join('\n')
  }

  onCopyListButtonClick () {
    copyToClipBoard(JSON.stringify(this.projects))
  }

  async addNewProject () {
    const name = prompt('name of the new list')
    if (name) {
      if (this.projects.some(p=>p.name==name)) {
        window.toast('this name already exists')
        return
      }
      else {
        this.projects.push({
          name,
          wordsList: []
        })
        this.requestUpdate()
        await this.select.updateComplete
        this.select.select(this.projects.length - 1)
        this.saveData()
      }
    }
  }

  onTextAreaKeyup(e: KeyboardEvent) {
    if (this.running && this.textarea.value.length == 0) {
      this.toggleStart()
    }

    this.buildWordsListFromTextArea()
    this.saveData()
  }

  toggleStart() {
    if (this.running) {
      this.clearTimeout()
      this.running = false
    }
    else {
      if (this.dialog.open) {
        this.running = true
        this.dialog.close()
        this.playOneWord()
        this.runTimeout()
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
      // this._wordsList = value.split('\n')
      this.projects[this.selectedProjectIndex].wordsList = value.split('\n')
    }
  }

  async getData () {
    let projects: Project[] = [{ name: 'default', wordsList: [] }] // default
    if (localStorage.getItem('periodic-speech-synthesis:data')) {
      projects = JSON.parse(localStorage.getItem('periodic-speech-synthesis:data')!)
    }

    if (!projects || (projects.length == 1 && projects[0].wordsList.length == 0)) {
      try {
        projects = await this.getDataFromRemote()
      } catch (e) {
        // something went wrong during the fetch
        // ignore
      }
    }

    return projects
  }

  saveData () {
    localStorage.setItem('periodic-speech-synthesis:data', JSON.stringify(this.projects))
  }

  async getDataFromRemote () {
    const response = await fetch('./data.json')
    if (response.status !== 200) { throw new Error }
    return await response.json()
  }

  async onFetchRemoteButtonClick () {
    try {
      this.projects = await this.getDataFromRemote()
      // await this.select.updateComplete
      // setTimeout(()=>this.select.select(0), 1000)
      this.select.select(0)
      // this.textarea.value = this._wordsList.join('\n')
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
    let candidates = this.projects[this.selectedProjectIndex].wordsList.filter(w=>!this._historyList.includes(w))
    if (candidates.length == 0) {
      this._historyList = []
      candidates = this.projects[this.selectedProjectIndex].wordsList
    }
    const word = candidates[~~(Math.random() * candidates.length)]
    this.currentWord = word
    if (word && isFullJapanese(word)) {
      document.title = word
      await playJapaneseAudio(word)
    }
    this._historyList.push(word)

    await this.updateComplete
    // this.selectLineFromWord(word)
  }

  selectLineFromWord (word: string) {
    const lines = this.textarea.value.split('\n')
    const wordLineIndex = lines.indexOf(word)
    const linesBefore = lines.slice(0, wordLineIndex)
    let selectionStart = linesBefore.join(' ').length
    if (selectionStart > 0) { selectionStart++; }
    const selectionEnd = selectionStart + word.length
    // this.textarea.focus()
    this.textarea.setSelectionRange(selectionStart, selectionStart)
    this.textarea.blur()
    this.textarea.focus()
    this.textarea.setSelectionRange(selectionStart, selectionEnd)
  }
}
