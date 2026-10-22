import { httpsCallable } from 'firebase/functions'
import { emailFunctions } from './firebase'

export async function getActivityStatistics(filters) {
  if (!emailFunctions) throw new Error('Statistics service is unavailable.')
  const response = await httpsCallable(emailFunctions, 'getActivityStatistics', { timeout: 70000 })(filters)
  return response.data
}
