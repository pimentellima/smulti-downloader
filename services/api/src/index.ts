import 'dotenv/config'
import { app } from './app'

const PORT = Number.parseInt(process.env.PORT || '5173')

console.log('Starting API development server')

app.listen(PORT, () => {
    console.log(`API server is running on http://localhost:${PORT}`)
})
