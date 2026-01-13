from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


# Banner/Slide item structure
class BannerItem(BaseModel):
    id: str
    image_url: str
    title: Optional[str] = None
    subtitle: Optional[str] = None
    button_text: Optional[str] = None
    button_link: Optional[str] = None
    is_active: bool = True
    order: int = 0


# Hero banners content structure
class HeroBannersContent(BaseModel):
    banners: List[BannerItem] = []
    autoplay: bool = True
    autoplay_interval: int = 5000  # milliseconds


# Announcement bar content structure
class AnnouncementContent(BaseModel):
    text: str
    link: Optional[str] = None
    background_color: str = "#000000"
    text_color: str = "#ffffff"


# Featured categories content
class FeaturedCategoryItem(BaseModel):
    id: str
    category_id: str
    image_url: Optional[str] = None
    custom_title: Optional[str] = None
    order: int = 0


class FeaturedCategoriesContent(BaseModel):
    categories: List[FeaturedCategoryItem] = []
    title: str = "Shop by Category"


# Response model for site content
class SiteContentResponse(BaseModel):
    id: str
    key: str
    title: Optional[str]
    content: Any  # JSON content
    is_active: bool
    created_at: datetime
    updated_at: datetime
    updated_by: Optional[str]

    class Config:
        from_attributes = True


# Create/Update models
class SiteContentCreate(BaseModel):
    key: str
    title: Optional[str] = None
    content: Any
    is_active: bool = True


class SiteContentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[Any] = None
    is_active: Optional[bool] = None


# List response
class SiteContentListResponse(BaseModel):
    items: List[SiteContentResponse]
    total: int
