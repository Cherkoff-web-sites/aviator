import LegalDocumentBody from '../components/LegalDocumentBody'
import LegalDocumentLayout from '../components/LegalDocumentLayout'
import { usePublicDocument } from '../hooks/usePublicDocument'

function AgreementPage() {
  const { data: doc, loading } = usePublicDocument('agreement')
  const title = doc?.title || 'Договор об оказании развлекательных услуг (публичная оферта)'

  return (
    <LegalDocumentLayout title={title}>
      {loading && !doc ? <p className="text-white/60">Загрузка…</p> : null}
      {doc?.content ? <LegalDocumentBody content={doc.content} /> : null}
    </LegalDocumentLayout>
  )
}

export default AgreementPage
