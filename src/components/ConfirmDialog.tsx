import { Modal } from './Modal'
import { Button } from './Button'
import { useSave } from '../hooks/useSave'
import { useSpace } from '../hooks/useSpace'

export function ConfirmDialog({ title, onClose, onConfirm }: { title: string; onClose: () => void; onConfirm: () => void | Promise<void> }) {
  const { isDemo } = useSpace()
  const { pending, error, save } = useSave()
  return <Modal title={title} onClose={onClose} busy={pending}><p className="confirm-copy">{isDemo ? '删除后，这条记录会从本次演示会话中移除。' : '删除后，这条记录会从你们的空间中永久移除。'}</p>{error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions"><Button variant="secondary" disabled={pending} onClick={onClose}>再想想</Button><Button variant="danger" disabled={pending} onClick={() => { void save(onConfirm, '记录已删除', onClose) }}>{pending ? '正在删除…' : '确认删除'}</Button></div></Modal>
}
