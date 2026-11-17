import LegalDocumentBody from '../components/LegalDocumentBody'
import LegalDocumentLayout from '../components/LegalDocumentLayout'
import { usePublicDocument } from '../hooks/usePublicDocument'

function RulesPage() {
  const { data: doc, loading } = usePublicDocument('rules')
  const title = doc?.title || 'Правила посещения авиатренажера'

  return (
    <LegalDocumentLayout title={title}>
      {loading && !doc ? <p className="text-white/60">Загрузка…</p> : null}
      {doc?.content ? <LegalDocumentBody content={doc.content} /> : null}
    </LegalDocumentLayout>
  )
}

export default RulesPage
