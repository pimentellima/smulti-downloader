import {
    redirect,
    type LoaderFunctionArgs
} from 'react-router-dom'
import type { Route } from './+types/_index'

export function meta({}: Route.MetaArgs) {
    return [
        { title: 'Smulti Downloader' },
        { name: 'description', content: 'Download your links' },
    ]
}

export async function loader({ request }: LoaderFunctionArgs) {
    return redirect('/pt-BR')
}
