import { getExactSearch } from 'japanese-data-module'
import { speakJapanese } from './speech'

/**
 * AUDIO
 **********/
const audioMap: { [word: string]: Blob | Promise<Response> } = {}

export async function playJapanese(word, volume = 1) {
  let audio: HTMLAudioElement
  if (word in audioMap) {
    if (audioMap[word] instanceof Promise) {
      // wait for the blob
      const response = await audioMap[word]
      await new Promise((resolve, reject) => { setTimeout(resolve, 100) })
    }

    audio = createAudioElementFromBlob(audioMap[word] as Blob)
  }
  else {
    const responsePromise = fetch(`https://assiets.vdegenne.com/data/japanese/audio/${encodeURIComponent(word)}`)
    audioMap[word] = responsePromise
    const response = await responsePromise
    const blob = audioMap[word] = await response.blob()
    audio = createAudioElementFromBlob(blob)
  }

  return new Promise((resolve, reject) => {
    audio.volume = volume
    audio.onerror = () => reject()
    audio.onended = () => {
      resolve(audio)
    }
    audio.play()
  })
}

export function createAudioElementFromBlob(blob: Blob) {
  return new Audio(URL.createObjectURL(blob))
}


export async function playJapaneseAudio(word: string) {
  try {
    if (word.length > 6 || getExactSearch(word) == null) { throw new Error; }
    await playJapanese(word)
  } catch (e) {
    await speakJapanese(word)
  }
}