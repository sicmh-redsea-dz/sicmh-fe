export const formatApiError = (err: any): string => {
  const fallback = 'Ocurrió un error inesperado.'
  const message = err?.error?.message ?? err?.message ?? err

  if (Array.isArray(message)) {
    const parts = message
      .map((item) => {
        if (typeof item === 'string') return item
        if (item?.msg) return item.msg
        return ''
      })
      .filter(Boolean)
    return parts.length > 0 ? parts.join('\n') : fallback
  }

  if (typeof message === 'object' && message?.msg) return message.msg
  if (typeof message === 'string') return message

  return fallback
}
