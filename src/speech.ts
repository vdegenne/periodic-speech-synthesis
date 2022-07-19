/* speech system */
const spchsys = speechSynthesis
/* available voices */
let voices: SpeechSynthesisVoice[] = [];

let _utterance: SpeechSynthesisUtterance|undefined = undefined;

function getCandidates (langs: string[], preferredNames: string[]) {
  const candidates = spchsys.getVoices().filter(v=>langs.includes(v.lang))
  candidates.sort((v1, v2) => {
    const v1index = preferredNames.indexOf(v1.voiceURI)
    const v2index = preferredNames.indexOf(v2.voiceURI)
    return (v1index >= 0 ?  v1index : 99) - (v2index >= 0 ? v2index : 99)
  })
  return candidates
}

export function speak (voice: SpeechSynthesisVoice, text: string, volume = .5, rate = .7): Promise<void> {
  return new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance();
    Object.assign(utterance, { voice, text, volume, rate })
    utterance.lang = voice.lang.replace(/_/, '-')
    utterance.onend = () => {
      resolve()
    }
    // utterance.voice = voice
    // utterance.text = text
    spchsys.speak(utterance)
    _utterance = utterance
  })
}

export function speakEnglish (text: string, volume = .9, rate = .9) {
  const candidates = getCandidates(['en-US', 'en_US', 'en-GB', 'en_GB'], [
    // pc
    'Microsoft Mark - English (United States)',
    'Microsoft David - English (United States)',
    'Google US English',
    'Microsoft Zira - English (United States)',
    'Google UK English Female',
    'Google UK English Male',
    // mobile
    'English United States',
    'English United Kingdom',
  ])
  // console.log(candidates)
  return speak(candidates[0], text, volume, rate)
}

export function speakJapanese (text: string, volume = 1, rate = .9) {
  const candidates = getCandidates(['ja-JP', 'ja_JP'], [
    // pc
    'Google 日本語',
    'Microsoft Sayaka - Japanese (Japan)',
    'Microsoft Ayumi - Japanese (Japan)',
    'Microsoft Haruka - Japanese (Japan)',
    'Microsoft Ichiro - Japanese (Japan)',
    // mobile
    'Japanese Japan'
  ])
  // console.log(candidates)
  return speak(candidates[0], text, volume, rate)
}

window.speechSynthesis.addEventListener('voiceschanged', ()=> {
  // console.log(spchsys.getVoices())
})

// For some weird badly designed reasons
// `voiceschanged` will only trigger if `getVoices` is called anywhre on mobile devices...
// Maybe because it tells the device that the application is trying to use the speechSynthesis module
// do not know.
speechSynthesis.getVoices()


export function cancelSpeech () {
  spchsys.cancel()
}
