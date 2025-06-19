import 'dotenv/config'
import { app } from './app'
import { API_PORT } from '@utils/constants'

console.log('Starting API development server')

app.listen(API_PORT, () => {
    console.log(`API server is running on http://localhost:${API_PORT}`)
})
