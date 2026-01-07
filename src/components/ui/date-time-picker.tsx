"use client"

import * as React from "react"
import { CalendarIcon, ChevronDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

function formatDate(date: Date | undefined) {
  if (!date) return ""
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

interface DateTimePickerProps {
  value?: Date | null
  onChange?: (date: Date | null) => void
  label?: string
  dateLabel?: string
  timeLabel?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  showTime?: boolean
  minDate?: Date
}

export function DateTimePicker({
  value,
  onChange,
  label,
  dateLabel = "Date",
  timeLabel = "Time",
  placeholder = "Select date",
  disabled = false,
  className,
  showTime = true,
  minDate,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)
  
  // Parse the date value
  const dateValue = value ? new Date(value) : undefined
  const [month, setMonth] = React.useState<Date | undefined>(dateValue || new Date())
  
  // Update month when value prop changes
  React.useEffect(() => {
    if (value) {
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        setMonth(date)
      }
    }
  }, [value])
  
  // Get time string from date (with seconds)
  const timeValue = dateValue
    ? `${String(dateValue.getHours()).padStart(2, "0")}:${String(dateValue.getMinutes()).padStart(2, "0")}:${String(dateValue.getSeconds()).padStart(2, "0")}`
    : "10:30:00"

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) {
      onChange?.(null)
      setOpen(false)
      return
    }
    
    // Preserve time if we already have a date
    if (dateValue) {
      selectedDate.setHours(dateValue.getHours(), dateValue.getMinutes(), dateValue.getSeconds(), 0)
    } else {
      selectedDate.setHours(10, 30, 0, 0)
    }
    
    onChange?.(selectedDate)
    setOpen(false)
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parts = e.target.value.split(":").map(Number)
    const hours = parts[0] || 0
    const minutes = parts[1] || 0
    const seconds = parts[2] || 0
    
    const newDate = dateValue ? new Date(dateValue) : new Date()
    newDate.setHours(hours, minutes, seconds, 0)
    
    onChange?.(newDate)
  }

  const handleClear = () => {
    onChange?.(null)
    setOpen(false)
  }

  const handleToday = () => {
    const today = new Date()
    if (dateValue) {
      today.setHours(dateValue.getHours(), dateValue.getMinutes(), dateValue.getSeconds(), 0)
    } else {
      today.setHours(10, 30, 0, 0)
    }
    onChange?.(today)
    setMonth(today)
    setOpen(false)
  }

  return (
    <div className={cn("flex gap-4", className)}>
      <div className="flex flex-col gap-3">
        <Label className="px-1 text-sm">
          {label || dateLabel}
        </Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-full justify-start text-left font-normal min-w-[140px]",
                !dateValue && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateValue ? formatDate(dateValue) : placeholder}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0"
            align="start"
            sideOffset={4}
          >
            <Calendar
              mode="single"
              selected={dateValue}
              captionLayout="dropdown"
              month={month}
              onMonthChange={setMonth}
              onSelect={handleDateSelect}
              disabled={minDate ? { before: minDate } : undefined}
              onClear={handleClear}
              onToday={handleToday}
            />
          </PopoverContent>
        </Popover>
      </div>
      
      {showTime && (
        <div className="flex flex-col gap-3">
          <Label className="px-1 text-sm">
            {timeLabel}
          </Label>
          <Input
            type="time"
            step="1"
            disabled={disabled}
            value={timeValue}
            onChange={handleTimeChange}
            className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          />
        </div>
      )}
    </div>
  )
}

// Simple date-only picker variant
export function DatePicker({
  value,
  onChange,
  label,
  placeholder = "Select date",
  disabled = false,
  className,
  minDate,
}: Omit<DateTimePickerProps, "showTime" | "dateLabel" | "timeLabel">) {
  return (
    <DateTimePicker
      value={value}
      onChange={onChange}
      label={label}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      showTime={false}
      minDate={minDate}
    />
  )
}

