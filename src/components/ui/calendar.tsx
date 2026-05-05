"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons"
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { useLocale } from "@/lib/messages"
import { dateFnsLocaleFor } from "@/lib/i18n/dateFnsLocale"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()
  const { locale } = useLocale()

  return (
    <DayPicker
      locale={dateFnsLocaleFor(locale)}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(locale, { month: "short" }),
        formatWeekdayName: (date) =>
          date.toLocaleString(locale, { weekday: "narrow" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit text-foreground", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 md:flex-row",
          defaultClassNames.months
        ),
        month: cn(
          "flex w-full flex-col gap-3",
          defaultClassNames.month
        ),
        month_caption: cn(
          "flex h-8 items-center justify-center",
          defaultClassNames.month_caption
        ),
        nav: "absolute inset-x-2 top-0 flex h-8 items-center justify-between",
        button_previous: cn(
          buttonVariants({ variant: buttonVariant, size: "icon" }),
          "size-7 cursor-pointer rounded-md text-muted-foreground hover:bg-accent hover:text-foreground aria-disabled:cursor-not-allowed aria-disabled:opacity-40 [&_svg]:size-4"
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant, size: "icon" }),
          "size-7 cursor-pointer rounded-md text-muted-foreground hover:bg-accent hover:text-foreground aria-disabled:cursor-not-allowed aria-disabled:opacity-40 [&_svg]:size-4"
        ),
        dropdowns: cn(
          "flex h-8 items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "relative inline-flex items-center rounded-md border border-input bg-background px-2 has-focus:ring-2 has-focus:ring-ring has-focus:ring-offset-1",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "absolute inset-0 cursor-pointer opacity-0",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "select-none text-sm font-semibold",
          captionLayout === "label"
            ? ""
            : "[&>svg]:size-3.5 [&>svg]:text-muted-foreground inline-flex items-center gap-1",
          defaultClassNames.caption_label
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex h-8 w-9 select-none items-center justify-center text-[0.75rem] font-medium uppercase tracking-wide text-muted-foreground",
          defaultClassNames.weekday
        ),
        week: cn("mt-1 flex w-full", defaultClassNames.week),
        week_number_header: cn(
          "flex h-9 w-9 select-none items-center justify-center",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "flex h-9 w-9 select-none items-center justify-center text-xs text-muted-foreground",
          defaultClassNames.week_number
        ),
        day: cn(
          "group/day relative h-9 w-9 select-none p-0 text-center",
          defaultClassNames.day
        ),
        range_start: cn(
          "rounded-l-md bg-accent",
          defaultClassNames.range_start
        ),
        range_middle: cn(
          "rounded-none bg-accent",
          defaultClassNames.range_middle
        ),
        range_end: cn("rounded-r-md bg-accent", defaultClassNames.range_end),
        today: defaultClassNames.today,
        outside: cn(
          "text-muted-foreground/50 aria-selected:text-muted-foreground",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-muted-foreground/40 opacity-50",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className: rootClassName, rootRef, ...rootProps }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(rootClassName)}
              {...rootProps}
            />
          )
        },
        Chevron: ({ className: chevronClassName, orientation }) => {
          if (orientation === "left") {
            return (
              <HugeiconsIcon
                icon={ArrowLeft01Icon}
                className={cn("size-4", chevronClassName)}
              />
            )
          }

          if (orientation === "right") {
            return (
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                className={cn("size-4", chevronClassName)}
              />
            )
          }

          return (
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              className={cn("size-4", chevronClassName)}
            />
          )
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...weekProps }) => {
          return (
            <td {...weekProps}>
              <div className="flex h-9 w-9 items-center justify-center text-xs text-muted-foreground">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const { locale } = useLocale()
  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) {
      ref.current?.focus()
    }
  }, [modifiers.focused])

  return (
    <button
      ref={ref}
      type="button"
      data-day={day.date.toLocaleDateString(locale)}
      data-today={modifiers.today}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-sm font-normal text-foreground transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        "data-[today=true]:text-primary data-[today=true]:font-semibold data-[today=true]:ring-1 data-[today=true]:ring-primary/60 data-[today=true]:ring-inset",
        "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[selected-single=true]:ring-0 data-[selected-single=true]:hover:bg-primary",
        "data-[today=true]:data-[selected-single=true]:text-primary-foreground data-[today=true]:data-[selected-single=true]:ring-0",
        "data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground",
        "data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground",
        "data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground",
        "disabled:pointer-events-none disabled:opacity-40",
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
