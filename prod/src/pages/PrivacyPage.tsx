import LegalDocumentBody from '../components/LegalDocumentBody'
import LegalDocumentLayout from '../components/LegalDocumentLayout'
import { usePublicDocument } from '../hooks/usePublicDocument'

function PrivacyPage() {
  const { data: doc, loading } = usePublicDocument('privacy')
  const title = doc?.title || 'Политика конфиденциальности'

  return (
    <LegalDocumentLayout title={title}>
      {loading && !doc ? <p className="text-white/60">Загрузка…</p> : null}
      {doc?.content ? <LegalDocumentBody content={doc.content} /> : null}
    </LegalDocumentLayout>
  )
}

export default PrivacyPage
