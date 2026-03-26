"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle01Icon,
  InformationCircleIcon,
  Loading03Icon,
  Cancel01Icon,
  Alert01Icon,
} from "@hugeicons/core-free-icons"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const VALID_THEMES = new Set(["light", "dark", "system"] as const)
type SonnerTheme = "light" | "dark" | "system"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()
  const resolvedTheme: SonnerTheme =
    theme !== undefined && VALID_THEMES.has(theme as SonnerTheme)
      ? (theme as SonnerTheme)
      : "system"

  return (
    <Sonner
      theme={resolvedTheme}
      className="toaster group"
      icons={{
        success: <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} />,
        info: <HugeiconsIcon icon={InformationCircleIcon} size={16} />,
        warning: <HugeiconsIcon icon={Alert01Icon} size={16} />,
        error: <HugeiconsIcon icon={Cancel01Icon} size={16} />,
        loading: <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
