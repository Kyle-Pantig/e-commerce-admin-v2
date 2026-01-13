"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HeroBannersEditor } from "@/components/site-content"
import {
  IconPhoto,
  IconSpeakerphone,
  IconCategory,
} from "@tabler/icons-react"

export function SiteSettingsContent() {
  const [activeTab, setActiveTab] = useState("banners")

  return (
    <div className="px-4 lg:px-6 py-6 w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="banners" className="flex items-center gap-2">
              <IconPhoto className="h-4 w-4" />
              <span className="hidden sm:inline">Banners</span>
            </TabsTrigger>
            <TabsTrigger value="announcement" className="flex items-center gap-2">
              <IconSpeakerphone className="h-4 w-4" />
              <span className="hidden sm:inline">Announcement</span>
            </TabsTrigger>
            <TabsTrigger value="featured" className="flex items-center gap-2">
              <IconCategory className="h-4 w-4" />
              <span className="hidden sm:inline">Featured</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="banners" className="space-y-6">
            <HeroBannersEditor />
          </TabsContent>

          <TabsContent value="announcement" className="space-y-6">
            <AnnouncementEditor />
          </TabsContent>

          <TabsContent value="featured" className="space-y-6">
            <FeaturedCategoriesEditor />
          </TabsContent>
        </Tabs>
      </div>
  )
}

// Placeholder components - will be expanded later
function AnnouncementEditor() {
  return (
    <div className="border-2 border-dashed rounded-lg p-12 text-center">
      <IconSpeakerphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="font-medium text-lg mb-2">Announcement Bar</h3>
      <p className="text-muted-foreground">
        Coming soon - Configure the announcement bar that appears at the top of your store
      </p>
    </div>
  )
}

function FeaturedCategoriesEditor() {
  return (
    <div className="border-2 border-dashed rounded-lg p-12 text-center">
      <IconCategory className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="font-medium text-lg mb-2">Featured Categories</h3>
      <p className="text-muted-foreground">
        Coming soon - Showcase specific categories on your landing page
      </p>
    </div>
  )
}
