import { Loader } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center">
      <Loader className="size-8 animate-spin text-primary" />
    </div>
  )
}
