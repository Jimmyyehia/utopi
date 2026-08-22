"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Camera, Sparkles, X, Check, Upload, Link as LinkIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

export const PRESET_AVATARS = [
  { id: "avatar-purple", name: "Cosmic Purple", style: "linear-gradient(to top right, #9333ea, #6366f1)" },
  { id: "avatar-emerald", name: "Emerald Mint", style: "linear-gradient(to top right, #059669, #2dd4bf)" },
  { id: "avatar-amber", name: "Solar Amber", style: "linear-gradient(to top right, #f59e0b, #f43f5e)" },
  { id: "avatar-blue", name: "Cyber Blue", style: "linear-gradient(to top right, #2563eb, #22d3ee)" },
  { id: "avatar-rose", name: "Neon Rose", style: "linear-gradient(to top right, #db2777, #fb7185)" },
  { id: "avatar-dark", name: "Dark Platinum", style: "linear-gradient(to top right, #3f3f46, #0f172a)" },
]

export function getVisualStyle(val?: string | null, fallback: string = ""): React.CSSProperties {
  if (!val) {
    if (fallback.startsWith("linear-gradient")) return { background: fallback }
    return {}
  }
  if (val.startsWith("http") || val.startsWith("data:")) {
    return { backgroundImage: `url(${val})`, backgroundSize: "cover", backgroundPosition: "center" }
  }
  if (val.startsWith("linear-gradient")) {
    return { background: val }
  }
  return {}
}

interface ProfileVisualCustomizerModalProps {
  isOpen: boolean
  onClose: () => void
  currentImage?: string | null
  userName?: string | null
  onSave: (newImage: string) => Promise<void>
}

export function ProfileVisualCustomizerModal({
  isOpen,
  onClose,
  currentImage = "",
  userName = "User",
  onSave,
}: ProfileVisualCustomizerModalProps) {
  const displayName = userName || "User"
  const [selectedImage, setSelectedImage] = useState(currentImage || PRESET_AVATARS[0].style)
  const [customImageInput, setCustomImageInput] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setSelectedImage(currentImage || PRESET_AVATARS[0].style)
    }
  }, [isOpen, currentImage])

  if (!isOpen) return null

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      setSelectedImage(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(selectedImage)
      onClose()
    } catch (err) {
      console.error("Save error:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-md rounded-3xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Camera className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-foreground">Change Profile Picture</h3>
                <p className="text-xs text-muted-foreground">Select a preset style or upload your custom photo</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground rounded-full p-1.5 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Live Preview Card */}
          <div className="p-5 border-b border-border bg-muted/10">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 block">
              Live Preview
            </Label>
            <div className="p-4 rounded-2xl border border-border bg-card shadow-xs flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl font-black text-xl flex items-center justify-center border-2 border-primary/20 shadow-md overflow-hidden transition-all text-white flex-shrink-0"
                style={getVisualStyle(selectedImage, PRESET_AVATARS[0].style)}
              >
                {selectedImage.startsWith("http") || selectedImage.startsWith("data:") ? (
                  <img src={selectedImage} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  getInitials(displayName)
                )}
              </div>
              <div>
                <span className="font-extrabold text-base text-foreground block leading-tight">{displayName}</span>
                <Badge variant="outline" className="text-[10px] py-0 px-2 font-bold bg-primary/10 text-primary border-primary/20 mt-1">
                  Profile Avatar Active
                </Badge>
              </div>
            </div>
          </div>

          {/* Customizer Body */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1">
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-bold text-foreground mb-2.5 block">Preset Avatar Styles</Label>
                <div className="grid grid-cols-3 gap-2.5">
                  {PRESET_AVATARS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setSelectedImage(preset.style)}
                      className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                        selectedImage === preset.style
                          ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                          : "border-border hover:border-primary/50 bg-card"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 text-white" style={getVisualStyle(preset.style)}>
                        {getInitials(displayName)}
                      </div>
                      <span className="text-[11px] font-bold text-foreground truncate">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 space-y-3 border-t border-border/80">
                <Label className="text-xs font-bold text-foreground block">Upload Custom Photo or Image URL</Label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button variant="outline" size="sm" type="button" className="text-xs font-semibold gap-1.5 rounded-xl pointer-events-none">
                      <Upload className="h-3.5 w-3.5" />
                      Choose File
                    </Button>
                  </label>
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="https://example.com/avatar.jpg"
                      value={customImageInput}
                      onChange={(e) => {
                        setCustomImageInput(e.target.value)
                        if (e.target.value.trim()) setSelectedImage(e.target.value.trim())
                      }}
                      className="pl-8 h-9 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-border bg-card flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving} className="text-xs font-semibold rounded-xl">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-5 gap-1.5 shadow-xs"
            >
              <Check className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Profile Picture"}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
