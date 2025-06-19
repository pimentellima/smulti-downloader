import { localeValidation, type Locale } from '@shared/locale'
import { useParams } from 'react-router'
import { z } from 'zod'

export function useLocale() {
    const params = useParams()
    const locale = localeValidation.safeParse(params.language)
    return (locale.success ? locale.data : 'pt-BR') as Locale
}
