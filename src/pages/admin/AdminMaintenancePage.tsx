import { Button } from '@/components/ui/button'

export default function AdminMaintenancePage() {
  return (
    <div className="flex min-h-[min(70vh,560px)] flex-1 flex-col items-center justify-center gap-8 px-4 py-12 text-center">
      <h2 className="max-w-xl text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
        Запланировать техническое обслуживание?
      </h2>
      <Button
        type="button"
        size="lg"
        className="h-11 min-w-[200px] rounded-lg px-10 text-base font-medium"
      >
        Запланировать
      </Button>
    </div>
  )
}
