import { getInitialData } from "@/lib/initial-data"
import { HomePageClient } from "@/components/home/HomePageClient"

export default async function HomePage() {
  const initialData = await getInitialData()
  return <HomePageClient initialData={initialData} />
}
