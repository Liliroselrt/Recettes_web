// Libellés partagés par les pages de signalements (membre, modération, administration)
export const REASON_LABELS = {
  spam: 'Spam or advertising',
  harassment: 'Harassment or hate',
  inappropriate_content: 'Inappropriate content',
  copyright: 'Copyright',
  other: 'Something else'
}
export const TARGET_LABELS = { recipe: 'Recipe', review: 'Review', user: 'Profile', chat_message: 'Chat message' }
export const TARGET_ICONS = { recipe: 'fa-utensils', review: 'fa-comment', user: 'fa-user', chat_message: 'fa-message' }
export const ACTION_LABELS = {
  none: 'No action needed',
  warning: 'Warning',
  recipe_hidden: 'Recipe hidden',
  recipe_deleted: 'Recipe deleted',
  review_deleted: 'Review deleted',
  user_banned: 'Account suspended'
}

// Étiquette d'état d'un signalement (vue du membre et de la modération)
export function statusInfo(report) {
  if (report.status === 'pending') return { label: 'Under review', warn: true }
  if (report.status === 'dismissed') return { label: 'No action', warn: false }
  if (report.status === 'action_taken') return { label: ACTION_LABELS[report.action] || 'Action taken', warn: true }
  return { label: 'Reviewed', warn: false }
}

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
export const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
