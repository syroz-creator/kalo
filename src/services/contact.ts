import { apiUrl } from './serverConnection';
import { withRequestDeadline } from './requestDeadline';
import { UserFacingError } from '../utils/userFacingError';

export type ContactCategory = 'complaint' | 'suggestion';

export async function sendContactMessage(input: { category: ContactCategory; message: string; replyEmail: string; requestId: string }, signal?: AbortSignal) {
  try {
    return await withRequestDeadline(async requestSignal => {
      const response = await fetch(apiUrl('/api/contact'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input), signal: requestSignal,
      });
      if (response.status === 400 || response.status === 413) throw new UserFacingError('Check your message and email address, then try again.');
      if (response.status === 429) throw new UserFacingError('Too many messages right now. Wait a minute and try again.');
      if (response.status === 503 || response.status === 404) throw new UserFacingError('Message sending is not set up yet. Your message has not been sent.');
      if (!response.ok) throw new UserFacingError('We could not confirm your message was sent. Your message is still here; try again.');
      const result = await response.json();
      if (result.success !== true || typeof result.id !== 'string' || !result.id.trim()) throw new Error('Missing email receipt');
      return result.id as string;
    }, 20000, signal);
  } catch (error) {
    if (signal?.aborted || error instanceof UserFacingError) throw error;
    throw new UserFacingError('We could not confirm your message was sent. Your message is still here; try again.');
  }
}
