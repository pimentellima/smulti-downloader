import type { Dictionary as DictionaryType } from './en-US'
import type { Locale } from '../locale'

const dictionaries = {
    'en-US': () => import('./en-US').then((module) => module.dictionary),
    'pt-BR': () => import('./pt-BR').then((module) => module.dictionary),
}

export const loadDictionary = async (
    locale?: Locale
): Promise<DictionaryType> => {
    if (!locale || !dictionaries[locale]) {
        return dictionaries['pt-BR']()
    }
    return dictionaries[locale]()
}
