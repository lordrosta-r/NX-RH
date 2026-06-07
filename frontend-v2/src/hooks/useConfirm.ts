import { useState, useCallback } from 'react'

export interface ConfirmOptions {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning'
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean
  resolve: ((value: boolean) => void) | null
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    description: '',
    resolve: null,
  })

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setState({ ...opts, isOpen: true, resolve })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    state.resolve?.(true)
    setState(s => ({ ...s, isOpen: false, resolve: null }))
  }, [state])

  const handleCancel = useCallback(() => {
    state.resolve?.(false)
    setState(s => ({ ...s, isOpen: false, resolve: null }))
  }, [state])

  return {
    confirm,
    confirmState: state,
    handleConfirm,
    handleCancel,
  }
}
