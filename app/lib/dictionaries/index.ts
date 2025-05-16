import type { Dictionary as DictionaryType } from './en-US'

export type Locale = 'en-US' | 'pt-BR'

const dictionaries = {
    'en-US': () => import('./en-US').then((module) => module.dictionary),
    'pt-BR': () => import('./pt-BR').then((module) => module.dictionary),
}

export const loadDictionary = async (
    locale?: Locale
): Promise<DictionaryType> => {
    if (!locale || !dictionaries[locale]) {
        return dictionaries['en-US']()
    }
    return dictionaries[locale]()
}
