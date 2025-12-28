# Product Attributes Reference

A comprehensive guide to creating and managing product attributes in the e-commerce admin system.

---

## ⚠️ IMPORTANT: Attributes vs Variants

**Before creating attributes, understand this critical difference:**

| Use Case | Solution |
|----------|----------|
| Customer must **SELECT** before buying (Color, Size) | → Use **VARIANTS** |
| Need **separate stock** per option | → Use **VARIANTS** |
| Just for **display/specs/filtering** | → Use **ATTRIBUTES** |

### ❌ WRONG: Color/Size as Attributes for Clothing

If you have a T-Shirt with Color and Size as attributes:
- You can't track stock per Color/Size combo
- Customer can't select "Blue - Large" before checkout
- Inventory management breaks

### ✅ CORRECT: When to Use Color/Size as Attributes

**Only use Color as an attribute when:**
- Product comes in ONE color only (e.g., "Matte Black" headphones)
- Color is just for display/filtering, not purchasing

**Example:**
- ✅ Headphones (one color only) → Color = "Matte Black" as attribute
- ❌ T-Shirt (multiple colors to choose) → Color should be a VARIANT option

> 📖 See `PRODUCTS-REFERENCE.md` for detailed examples.

---

## Attribute Types

| Type | Description | Best For |
|------|-------------|----------|
| **TEXT** | Free-form text input | Brand, Care Instructions, Model Number |
| **NUMBER** | Numeric values with unit | Weight, Battery Life, Screen Size |
| **SELECT** | Dropdown with options | Material, Finish, Warranty Period |
| **BOOLEAN** | Yes/No toggle | Waterproof, Eco-Friendly, Has Bluetooth |

---

## ✅ Recommended Attributes

These are attributes that should ALWAYS be attributes (never variants):

### ⚖️ WEIGHT (NUMBER Type)

| Field | Value |
|-------|-------|
| **Name** | Weight |
| **Type** | NUMBER |
| **Description** | Product weight for shipping |
| **Required** | Yes |
| **Filterable** | Yes |
| **Min Value** | 0.01 |
| **Max Value** | 1000 |
| **Step** | 0.01 |
| **Unit** | kg |
| **Categories** | All Products |

---

### 📐 DIMENSIONS (TEXT Type)

| Field | Value |
|-------|-------|
| **Name** | Dimensions |
| **Type** | TEXT |
| **Description** | Product dimensions (L x W x H) |
| **Required** | No |
| **Filterable** | No |
| **Placeholder** | e.g., 30 x 20 x 10 cm |
| **Min Length** | 5 |
| **Max Length** | 50 |
| **Categories** | Electronics, Furniture |

---

### 🔋 BATTERY LIFE (NUMBER Type)

| Field | Value |
|-------|-------|
| **Name** | Battery Life |
| **Type** | NUMBER |
| **Description** | Battery duration in hours |
| **Required** | No |
| **Filterable** | Yes |
| **Min Value** | 1 |
| **Max Value** | 100 |
| **Step** | 0.5 |
| **Unit** | hours |
| **Categories** | Electronics, Phones, Laptops |

---

### 🏭 BRAND (TEXT Type)

| Field | Value |
|-------|-------|
| **Name** | Brand |
| **Type** | TEXT |
| **Description** | Product brand/manufacturer |
| **Required** | Yes |
| **Filterable** | Yes |
| **Placeholder** | Enter brand name |
| **Min Length** | 2 |
| **Max Length** | 100 |
| **Categories** | All Products |

---

### 💎 MATERIAL (SELECT Type)

| Field | Value |
|-------|-------|
| **Name** | Material |
| **Type** | SELECT |
| **Description** | Primary material composition |
| **Required** | No |
| **Filterable** | Yes |
| **Options** | Cotton, Polyester, Leather, Silk, Wool, Denim, Nylon, Metal, Plastic, Wood, Glass |
| **Categories** | Clothing, Furniture, Accessories |

---

### 🌊 WATERPROOF (BOOLEAN Type)

| Field | Value |
|-------|-------|
| **Name** | Waterproof |
| **Type** | BOOLEAN |
| **Description** | Is the product waterproof? |
| **Required** | No |
| **Filterable** | Yes |
| **True Label** | Waterproof |
| **False Label** | Not Waterproof |
| **Categories** | Electronics, Outdoor, Watches |

---

### ♻️ ECO-FRIENDLY (BOOLEAN Type)

| Field | Value |
|-------|-------|
| **Name** | Eco-Friendly |
| **Type** | BOOLEAN |
| **Description** | Environmentally sustainable product |
| **Required** | No |
| **Filterable** | Yes |
| **True Label** | Yes, Eco-Friendly |
| **False Label** | Standard |
| **Categories** | All Products |

---

### 📱 SCREEN SIZE (NUMBER Type)

| Field | Value |
|-------|-------|
| **Name** | Screen Size |
| **Type** | NUMBER |
| **Description** | Display diagonal measurement |
| **Required** | Yes |
| **Filterable** | Yes |
| **Min Value** | 1 |
| **Max Value** | 100 |
| **Step** | 0.1 |
| **Unit** | inches |
| **Categories** | Phones, Tablets, Laptops, TVs |

---

### 💾 STORAGE CAPACITY (SELECT Type) ⚠️ CAUTION

> **⚠️ WARNING:** For phones/tablets with different storage options at different prices, use VARIANTS instead!

| Field | Value |
|-------|-------|
| **Name** | Storage Capacity |
| **Type** | SELECT |
| **Description** | Internal storage space |
| **Required** | Yes |
| **Filterable** | Yes |
| **Options** | 16GB, 32GB, 64GB, 128GB, 256GB, 512GB, 1TB, 2TB |
| **Categories** | USB Drives, SD Cards (single-option items only) |

**When to use as ATTRIBUTE:**
- USB Drive that only comes in one size (e.g., 64GB only)
- SD Card with fixed capacity

**When to use as VARIANT:**
- iPhone with 128GB, 256GB, 512GB options (different prices!)
- Laptop with configurable storage

---

### 🔌 WARRANTY (SELECT Type)

| Field | Value |
|-------|-------|
| **Name** | Warranty Period |
| **Type** | SELECT |
| **Description** | Manufacturer warranty duration |
| **Required** | No |
| **Filterable** | Yes |
| **Options** | No Warranty, 6 Months, 1 Year, 2 Years, 3 Years, 5 Years, Lifetime |
| **Categories** | Electronics, Appliances |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/attributes` | Create new attribute |
| `GET` | `/attributes` | List all attributes |
| `GET` | `/attributes/{id}` | Get single attribute |
| `PATCH` | `/attributes/{id}` | Update attribute |
| `DELETE` | `/attributes/{id}` | Delete attribute |
| `GET` | `/attributes/filterable/all` | Get filterable attributes |
| `GET` | `/attributes/category/{id}` | Get attributes by category |
| `PATCH` | `/attributes/{id}/toggle-status` | Toggle active status |
| `POST` | `/attributes/{id}/duplicate` | Clone attribute |
| `POST` | `/attributes/{id}/assign-categories` | Add to categories |
| `POST` | `/attributes/{id}/remove-categories` | Remove from categories |
| `POST` | `/attributes/bulk/reorder` | Bulk update order |
| `POST` | `/attributes/bulk/delete` | Bulk delete |

---

## API Payload Examples

### Creating "Material" Attribute (SELECT) ✅ CORRECT

> Material is a great attribute - same material applies to ALL variants of a product.

```json
{
  "name": "Material",
  "type": "SELECT",
  "description": "Primary material composition",
  "is_required": true,
  "is_filterable": true,
  "display_order": 1,
  "is_active": true,
  "options": ["Cotton", "Polyester", "Wool", "Silk", "Denim", "Leather", "Nylon"],
  "category_ids": ["uuid-clothing", "uuid-accessories"]
}
```

### Creating "Weight" Attribute (NUMBER) ✅ CORRECT

```json
{
  "name": "Weight",
  "type": "NUMBER",
  "description": "Product weight for shipping",
  "is_required": true,
  "is_filterable": true,
  "display_order": 5,
  "is_active": true,
  "min_value": 0.01,
  "max_value": 1000,
  "step": 0.01,
  "unit": "kg",
  "category_ids": []
}
```

### Creating "Brand" Attribute (TEXT)

```json
{
  "name": "Brand",
  "type": "TEXT",
  "description": "Product brand/manufacturer",
  "is_required": true,
  "is_filterable": true,
  "display_order": 2,
  "is_active": true,
  "placeholder": "Enter brand name",
  "min_length": 2,
  "max_length": 100,
  "category_ids": []
}
```

### Creating "Waterproof" Attribute (BOOLEAN)

```json
{
  "name": "Waterproof",
  "type": "BOOLEAN",
  "description": "Is the product waterproof?",
  "is_required": false,
  "is_filterable": true,
  "display_order": 10,
  "is_active": true,
  "true_label": "Waterproof",
  "false_label": "Not Waterproof",
  "category_ids": ["uuid-electronics", "uuid-outdoor"]
}
```

---

## Response Format

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Material",
  "type": "SELECT",
  "description": "Primary material composition",
  "is_required": true,
  "is_filterable": true,
  "display_order": 1,
  "is_active": true,
  "validation_rules": null,
  "options": ["Cotton", "Polyester", "Wool", "Silk", "Denim"],
  "min_length": null,
  "max_length": null,
  "placeholder": null,
  "default_value": null,
  "min_value": null,
  "max_value": null,
  "step": null,
  "unit": null,
  "true_label": null,
  "false_label": null,
  "category_ids": ["uuid-clothing", "uuid-accessories"],
  "created_at": "2024-12-24T10:30:00.000Z",
  "updated_at": "2024-12-24T10:30:00.000Z"
}
```

---

## Best Practices

1. **Naming**: Use clear, descriptive names (e.g., "Screen Size" not "SS")
2. **Filterable**: Mark customer-facing attributes as filterable for search
3. **Required**: Only mark truly essential attributes as required
4. **Categories**: Assign attributes to specific categories, not globally
5. **Options**: For SELECT type, provide comprehensive but not excessive options
6. **Units**: Always specify units for NUMBER type (kg, cm, hours, etc.)
7. **Display Order**: Use logical ordering (0-10 for primary, 10-50 for secondary)
8. **Avoid Variant Confusion**: Don't create Color/Size attributes for products with variants!

---

## ✅ Attribute vs Variant Quick Reference

### Good Attributes (Always use as attributes)

| Attribute | Type | Why? |
|-----------|------|------|
| Material | SELECT | Same for all variants (Cotton shirt is cotton in all sizes) |
| Weight | NUMBER | Shipping spec |
| Battery Life | NUMBER | Technical spec for filtering |
| Waterproof | BOOLEAN | Feature for filtering |
| Eco-Friendly | BOOLEAN | Feature for filtering |
| Brand | TEXT | Same for all variants |
| Warranty | SELECT | Same for all variants |
| Screen Size | NUMBER | Fixed spec (not a purchasing option) |

### ⚠️ Dangerous Attributes (Often should be VARIANTS instead)

| Attribute | When it's OK | When to use VARIANT instead |
|-----------|--------------|----------------------------|
| Color | Single-color products only | Multi-color products (T-shirts, shoes) |
| Size | Single-size products only | Clothing, shoes, anything sized |
| Storage | Fixed storage products | Phones, laptops with storage options |

### Decision Rule

```
┌─────────────────────────────────────────────────────────────┐
│  Does changing this option affect STOCK or PRICE?           │
│                                                             │
│  YES → Use VARIANT (in product, not attribute)              │
│  NO  → Use ATTRIBUTE                                        │
└─────────────────────────────────────────────────────────────┘
```

**Examples:**
- Changing material from Cotton to Polyester = same stock, same price → **ATTRIBUTE**
- Changing size from M to L = different stock → **VARIANT**
- Changing storage from 128GB to 256GB = different price → **VARIANT**

---

## Category Inheritance

When an attribute is assigned to a **parent category**, products in all **child categories** can also use that attribute.

```
📂 Electronics (Weight, Brand, Warranty)
   └── 📁 Audio (Bluetooth Version, Noise Cancellation)
       └── 📁 Headphones (inherits: Weight, Brand, Warranty, Bluetooth Version, Noise Cancellation)
```

---

## Attributes by Category (Recommended)

### 👕 Clothing Category
| Attribute | Type | Notes |
|-----------|------|-------|
| Material | SELECT | Cotton, Polyester, Wool, etc. |
| Care Instructions | TEXT | "Machine wash cold" |
| Eco-Friendly | BOOLEAN | Sustainable materials |
| Gender | SELECT | Men, Women, Unisex |

> ⚠️ Do NOT add Color/Size as attributes for clothing - use VARIANTS!

### 📱 Electronics Category
| Attribute | Type | Notes |
|-----------|------|-------|
| Brand | TEXT | Samsung, Apple, Sony |
| Warranty | SELECT | 1 Year, 2 Years, etc. |
| Weight | NUMBER | In kg or grams |

### 🎧 Audio Category (under Electronics)
| Attribute | Type | Notes |
|-----------|------|-------|
| Battery Life | NUMBER | Hours |
| Bluetooth Version | SELECT | 5.0, 5.2, 5.3 |
| Noise Cancellation | BOOLEAN | ANC support |
| Driver Size | NUMBER | mm |
| Wireless | BOOLEAN | True/False |

### ⌚ Wearables Category (under Electronics)
| Attribute | Type | Notes |
|-----------|------|-------|
| Water Resistant | BOOLEAN | IPX rating |
| GPS | BOOLEAN | Built-in GPS |
| Heart Rate Monitor | BOOLEAN | Health tracking |
| Display Type | SELECT | AMOLED, LCD, etc. |

---

**Last Updated:** December 2024
**Version:** 2.0.0

> Major update: Clarified Attributes vs Variants distinction. Removed misleading Color/Size examples.

