import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'

export function NotFoundPage() {
  return <EmptyState title="这条小路，还没有故事" description="回到首页，继续看看我们的小世界吧。" action={<Link to="/" className="btn btn-primary">回到首页</Link>} />
}
