import downloadRoute from '@/api/routes/download/route'
import jobsRoute from '@/api/routes/jobs/route'
import { Router } from 'express'

const apiRouter = Router()

apiRouter.use('/jobs', jobsRoute)
apiRouter.use('/downloads', downloadRoute)

export default apiRouter
