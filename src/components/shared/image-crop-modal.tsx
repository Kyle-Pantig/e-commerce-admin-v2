"use client"

import { useState, useRef, useCallback } from "react"
import ReactCrop, {
  type Crop,
  type PixelCrop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import {
  IconCrop,
  IconZoomIn,
  IconRotate,
  IconAspectRatio,
  IconLoader2,
  IconCheck,
  IconX,
} from "@tabler/icons-react"

interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

interface ImageCropModalProps {
  open: boolean
  onClose: () => void
  imageSrc: string
  previewSrc?: string // Current cropped preview (for display in UI if needed)
  onCropComplete: (croppedImageBlob: Blob, aspectRatio?: number, cropArea?: CropArea) => Promise<void>
  aspectRatio?: number
  initialCrop?: CropArea // Restore previous crop position/size
  title?: string
}

export type { ImageCropModalProps }

type AspectRatioOption = {
  label: string
  value: number // 0 = Free (no fixed aspect ratio)
  icon?: string
}

// Use 0 to represent "Free" mode (no fixed aspect ratio)
const FREE_ASPECT_RATIO = 0

const ASPECT_RATIOS: AspectRatioOption[] = [
  { label: "1:1", value: 1, icon: "□" },
  { label: "4:3", value: 4 / 3, icon: "▭" },
  { label: "16:9", value: 16 / 9, icon: "▬" },
  { label: "3:4", value: 3 / 4, icon: "▯" },
  { label: "Free", value: FREE_ASPECT_RATIO, icon: "✱" },
]

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  )
}

async function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop,
  rotation = 0
): Promise<Blob> {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")

  if (!ctx) {
    throw new Error("No 2d context")
  }

  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height

  const pixelCrop = {
    x: crop.x * scaleX,
    y: crop.y * scaleY,
    width: crop.width * scaleX,
    height: crop.height * scaleY,
  }

  // Calculate rotated bounding box
  const rotRad = (rotation * Math.PI) / 180
  const cos = Math.abs(Math.cos(rotRad))
  const sin = Math.abs(Math.sin(rotRad))

  // For rotation, we need to handle it differently
  if (rotation !== 0) {
    const rotatedWidth = pixelCrop.width * cos + pixelCrop.height * sin
    const rotatedHeight = pixelCrop.width * sin + pixelCrop.height * cos

    canvas.width = rotatedWidth
    canvas.height = rotatedHeight

    ctx.translate(rotatedWidth / 2, rotatedHeight / 2)
    ctx.rotate(rotRad)
    ctx.translate(-pixelCrop.width / 2, -pixelCrop.height / 2)

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    )
  } else {
    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    )
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error("Canvas is empty"))
        }
      },
      "image/jpeg",
      0.95
    )
  })
}

export function ImageCropModal({
  open,
  onClose,
  imageSrc,
  previewSrc,
  onCropComplete,
  aspectRatio: initialAspectRatio,
  initialCrop: savedCropArea,
  title = "Crop Image",
}: ImageCropModalProps) {
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  // Store as number: 0 = Free mode, > 0 = fixed aspect ratio
  // If initialAspectRatio is undefined (first time), default to 1 (1:1)
  // If initialAspectRatio is 0, it means Free was previously used
  const [aspectRatioValue, setAspectRatioValue] = useState<number>(
    initialAspectRatio !== undefined ? initialAspectRatio : 1
  )
  // Convert to the format ReactCrop expects: undefined for free, number for fixed
  const aspectRatio = aspectRatioValue === FREE_ASPECT_RATIO ? undefined : aspectRatioValue
  const [rotation, setRotation] = useState(0)
  const [scale, setScale] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget
      
      // If we have a saved crop area, restore it
      if (savedCropArea) {
        setCrop({
          unit: "%",
          x: savedCropArea.x,
          y: savedCropArea.y,
          width: savedCropArea.width,
          height: savedCropArea.height,
        })
        return
      }
      
      // Otherwise create a default centered crop
      const defaultCrop = aspectRatio
        ? centerAspectCrop(width, height, aspectRatio)
        : {
            unit: "%" as const,
            x: 10,
            y: 10,
            width: 80,
            height: 80,
          }
      setCrop(defaultCrop)
    },
    [aspectRatio, savedCropArea]
  )

  const handleAspectRatioChange = (value: number) => {
    setAspectRatioValue(value)
    if (value !== FREE_ASPECT_RATIO && imgRef.current) {
      const { width, height } = imgRef.current
      setCrop(centerAspectCrop(width, height, value))
    }
  }

  const handleSave = async () => {
    if (!completedCrop || !imgRef.current || !crop) return

    setIsSaving(true)
    try {
      const croppedImage = await getCroppedImg(
        imgRef.current,
        completedCrop,
        rotation
      )
      
      // Save the crop area as percentages so it can be restored
      const cropArea: CropArea = {
        x: crop.unit === "%" ? crop.x : (crop.x / imgRef.current.width) * 100,
        y: crop.unit === "%" ? crop.y : (crop.y / imgRef.current.height) * 100,
        width: crop.unit === "%" ? crop.width : (crop.width / imgRef.current.width) * 100,
        height: crop.unit === "%" ? crop.height : (crop.height / imgRef.current.height) * 100,
      }
      
      // Pass the aspect ratio value (0 = Free, > 0 = fixed ratio) and crop area
      await onCropComplete(croppedImage, aspectRatioValue, cropArea)
      handleClose()
    } catch (error) {
      console.error("Error cropping image:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    setCrop(undefined)
    setCompletedCrop(undefined)
    setAspectRatioValue(initialAspectRatio !== undefined ? initialAspectRatio : 1)
    setRotation(0)
    setScale(1)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-4xl w-[95vw] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-2">
            <IconCrop className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Drag the white corners to resize. Drag inside to move the crop area.
          </DialogDescription>
        </DialogHeader>

        {/* Crop Area */}
        <div className="relative bg-neutral-950 flex items-center justify-center p-4 min-h-[400px] max-h-[60vh] overflow-auto">
          <style>{`
            .ReactCrop {
              max-height: 100%;
            }
            .ReactCrop__crop-selection {
              border: 2px solid white !important;
              box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
            }
            .ReactCrop__drag-handle {
              width: 12px !important;
              height: 12px !important;
              background-color: white !important;
              border: 2px solid #333 !important;
            }
            .ReactCrop__drag-handle::after {
              display: none !important;
            }
            .ReactCrop__drag-bar {
              background-color: transparent !important;
            }
            /* Corner handles - make them more visible */
            .ReactCrop__drag-handle.ord-nw,
            .ReactCrop__drag-handle.ord-ne,
            .ReactCrop__drag-handle.ord-sw,
            .ReactCrop__drag-handle.ord-se {
              width: 16px !important;
              height: 16px !important;
              background-color: white !important;
              border-radius: 2px !important;
            }
            /* Edge handles */
            .ReactCrop__drag-handle.ord-n,
            .ReactCrop__drag-handle.ord-s {
              width: 24px !important;
              height: 8px !important;
              margin-left: -12px !important;
            }
            .ReactCrop__drag-handle.ord-e,
            .ReactCrop__drag-handle.ord-w {
              width: 8px !important;
              height: 24px !important;
              margin-top: -12px !important;
            }
          `}</style>
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspectRatio}
            className="max-h-full"
          >
            <img
              ref={imgRef}
              alt="Crop preview"
              src={imageSrc}
              crossOrigin="anonymous"
              style={{
                transform: `scale(${scale}) rotate(${rotation}deg)`,
                maxHeight: "55vh",
                maxWidth: "100%",
                objectFit: "contain",
              }}
              onLoad={onImageLoad}
            />
          </ReactCrop>
        </div>

        {/* Controls */}
        <div className="px-6 py-4 space-y-4 bg-muted/30 border-t">
          {/* Aspect Ratio Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <IconAspectRatio className="h-3.5 w-3.5" />
              Aspect Ratio
            </Label>
            <div className="flex gap-2 flex-wrap">
              {ASPECT_RATIOS.map((ratio) => (
                <Button
                  key={ratio.label}
                  type="button"
                  variant={aspectRatioValue === ratio.value ? "default" : "outline"}
                  size="sm"
                  className="min-w-[60px]"
                  onClick={() => handleAspectRatioChange(ratio.value)}
                >
                  <span className="mr-1.5 text-xs opacity-60">{ratio.icon}</span>
                  {ratio.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Scale/Zoom Control */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <IconZoomIn className="h-3.5 w-3.5" />
              Scale: {Math.round(scale * 100)}%
            </Label>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground w-8">50%</span>
              <Slider
                value={[scale]}
                min={0.5}
                max={2}
                step={0.01}
                onValueChange={([value]) => setScale(value)}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-8">200%</span>
            </div>
          </div>

          {/* Rotation Control */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <IconRotate className="h-3.5 w-3.5" />
              Rotation: {rotation}°
            </Label>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground w-8">-180°</span>
              <Slider
                value={[rotation]}
                min={-180}
                max={180}
                step={1}
                onValueChange={([value]) => setRotation(value)}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-8">180°</span>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRotation((r) => r - 90)}
              >
                <IconRotate className="h-4 w-4 mr-1 scale-x-[-1]" />
                -90°
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRotation(0)}
              >
                Reset
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRotation((r) => r + 90)}
              >
                <IconRotate className="h-4 w-4 mr-1" />
                +90°
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSaving}
          >
            <IconX className="h-4 w-4 mr-1.5" />
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !completedCrop}
          >
            {isSaving ? (
              <>
                <IconLoader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <IconCheck className="h-4 w-4 mr-1.5" />
                Apply Crop
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
