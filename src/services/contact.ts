export type ContactCategory = 'complaint' | 'suggestion';

export const contactEmail = import.meta.env?.VITE_CONTACT_EMAIL?.trim() || '';

export function contactEmailLink(recipient: string, category: ContactCategory, message: string, replyEmail: string) {
  const subject = `Kalo ${category === 'complaint' ? 'complaint' : 'suggestion'}`;
  const body = [message.trim(), replyEmail.trim() ? `Reply to: ${replyEmail.trim()}` : ''].filter(Boolean).join('\n\n');
  return `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
