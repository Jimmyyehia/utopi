"use client"

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Copy, Check } from "lucide-react"

export type ContextMenuType = "booking"

export interface ContextMenuData {
  type: ContextMenuType
  title?: string
  subtitle?: string
  id?: string
  details?: Record<string, any>
  targetElement?: HTMLElement
}

interface ContextMenuState {
  isOpen: boolean
  x: number
  y: number
  data: ContextMenuData | null
}

interface ContextMenuContextType {
  openContextMenu: (e: React.MouseEvent | MouseEvent, type: ContextMenuType, data?: Partial<ContextMenuData>) => void
  closeContextMenu: () => void
}

const ContextMenuContext = createContext<ContextMenuContextType | undefined>(undefined)

export function useUtopiContextMenu() {
  const context = useContext(ContextMenuContext)
  if (!context) {
    throw new Error("useUtopiContextMenu must be used within UtopiContextMenuProvider")
  }
  return context
}

export function UtopiContextMenuProvider({ children }: { children: ReactNode }) {
  const [menuState, setMenuState] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    data: null,
  })

  const [copiedText, setCopiedText] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close context menu on click outside, scroll, or escape key
  useEffect(() => {
    const handleClickOutside = (e: Event) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuState((prev) => ({ ...prev, isOpen: false }))
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuState((prev) => ({ ...prev, isOpen: false }))
      }
    }

    if (menuState.isOpen) {
      window.addEventListener("mousedown", handleClickOutside)
      window.addEventListener("keydown", handleKeyDown)
      window.addEventListener("scroll", handleClickOutside, true)
    }

    return () => {
      window.removeEventListener("mousedown", handleClickOutside)
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("scroll", handleClickOutside, true)
    }
  }, [menuState.isOpen])

  // Area-Dependent Context Menu Interceptor:
  // Blocks browser native right-click everywhere.
  // ONLY opens Context Menu when right-clicking designated booking cards.
  useEffect(() => {
    const handleGlobalContextMenu = (e: MouseEvent) => {
      e.preventDefault() // Block browser native right-click everywhere

      let el = e.target as HTMLElement | null
      let targetType: ContextMenuType | null = null
      let customData: Partial<ContextMenuData> = {}

      while (el && el !== document.body) {
        if (el.dataset.contextMenuType) {
          const rawType = el.dataset.contextMenuType
          if (rawType === "booking") {
            targetType = "booking"
            customData = {
              id: el.dataset.contextId || el.dataset.bookingId,
              title: el.dataset.contextTitle,
              subtitle: el.dataset.contextSubtitle,
            }
            break
          }
        }
        el = el.parentElement
      }

      // If clicked on a designated booking item, open Context Menu
      if (targetType) {
        const menuWidth = 200
        const menuHeight = 110
        let posX = e.clientX
        let posY = e.clientY

        if (posX + menuWidth > window.innerWidth) {
          posX = window.innerWidth - menuWidth - 12
        }
        if (posY + menuHeight > window.innerHeight) {
          posY = window.innerHeight - menuHeight - 12
        }

        setMenuState({
          isOpen: true,
          x: Math.max(12, posX),
          y: Math.max(12, posY),
          data: {
            type: targetType,
            ...customData,
            targetElement: el || (e.target as HTMLElement),
          },
        })
      } else {
        // Rooms & other non-booking areas: native browser menu suppressed, NO popup
        setMenuState((prev) => ({ ...prev, isOpen: false }))
      }
    }

    window.addEventListener("contextmenu", handleGlobalContextMenu)
    return () => window.removeEventListener("contextmenu", handleGlobalContextMenu)
  }, [])

  const openContextMenu = (
    e: React.MouseEvent | MouseEvent,
    type: ContextMenuType,
    data?: Partial<ContextMenuData>
  ) => {
    e.preventDefault()
    e.stopPropagation()

    const menuWidth = 200
    const menuHeight = 110
    let posX = e.clientX
    let posY = e.clientY

    if (posX + menuWidth > window.innerWidth) {
      posX = window.innerWidth - menuWidth - 12
    }
    if (posY + menuHeight > window.innerHeight) {
      posY = window.innerHeight - menuHeight - 12
    }

    setMenuState({
      isOpen: true,
      x: Math.max(12, posX),
      y: Math.max(12, posY),
      data: {
        type,
        ...data,
      },
    })
  }

  const closeContextMenu = () => {
    setMenuState((prev) => ({ ...prev, isOpen: false }))
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(label)
    setTimeout(() => setCopiedText(null), 2000)
    closeContextMenu()
  }

  return (
    <ContextMenuContext.Provider
      value={{
        openContextMenu,
        closeContextMenu,
      }}
    >
      {children}

      {/* Ultra-Clean Utopi Context Menu (Booking Reference Action) */}
      <AnimatePresence>
        {menuState.isOpen && menuState.data && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95, y: 3 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 3 }}
            transition={{ duration: 0.1, ease: "easeOut" }}
            style={{
              position: "fixed",
              left: menuState.x,
              top: menuState.y,
              zIndex: 9999,
            }}
            className="w-52 bg-card/95 text-foreground border border-border shadow-2xl backdrop-blur-xl rounded-2xl p-1.5 font-sans text-xs select-none overflow-hidden"
          >
            {/* Header */}
            <div className="px-3 py-1.5 border-b border-border/70 mb-1 bg-muted/40 rounded-xl">
              <p className="font-extrabold text-foreground truncate text-[11px] leading-tight">
                {menuState.data.title || "Reservation"}
              </p>
              {menuState.data.subtitle && (
                <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5 font-mono">
                  {menuState.data.subtitle}
                </p>
              )}
            </div>

            {/* Item */}
            <div className="space-y-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const refId = menuState.data?.id ? `UTP-${menuState.data.id.slice(-8).toUpperCase()}` : "UTP-BOOKING"
                  copyToClipboard(refId, "Ref ID Copied")
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-foreground hover:bg-muted font-bold transition-all text-left cursor-pointer"
              >
                {copiedText === "Ref ID Copied" ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <Copy className="h-4 w-4 text-primary" />
                )}
                <span>Copy Reference ID</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ContextMenuContext.Provider>
  )
}
