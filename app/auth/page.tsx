"use client"

import { useActionState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { checkMagicWord } from "../actions"

export default function AuthPage() {
  const [state, formAction, pending] = useActionState(checkMagicWord, null)

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="w-full max-w-sm px-4">
        <form action={formAction} className="flex flex-col items-center gap-4">
          <h1 className="text-xl font-medium text-foreground">
            Enter the magic word
          </h1>
          <Input
            name="magic-word"
            type="text"
            placeholder="Magic word"
            className="text-center"
            required
          />
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Checking..." : "Submit"}
          </Button>
        </form>
      </div>
    </div>
  )
}
