import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import AdminSiteImagesEditor from '@/components/admin/AdminSiteImagesEditor'
import { Button } from '@/components/ui/button'

export default function AdminSiteMediaPage() {
  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="sm" asChild>
          <Link to="/admin/settings" className="gap-2">
            <ArrowLeft className="size-4" aria-hidden />
            К настройкам
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          Картинки сайта: герой, слайдеры, блоки цен, фон комбо и галереи.
        </p>
      </div>
      <AdminSiteImagesEditor />
    </div>
  )
}
