import { getInitialData } from "@/lib/initial-data"
import { SchedulePageClient } from "@/components/schedule/SchedulePageClient"

export default async function SchedulePage() {
  const initialData = await getInitialData()
  return <SchedulePageClient initialData={initialData} />
}
