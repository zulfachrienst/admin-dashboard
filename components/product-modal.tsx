"use client"

import React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"


interface Spec {
  key: string
  value: string
}

interface Discount {
  percent?: number
  priceAfterDiscount?: number
}

interface VariantOption {
  value: string
  images: string[]
  price?: number
  stock?: number
  sku?: string
  discount?: Discount
  specs: Spec[]
  useDefault?: {
    price?: boolean
    stock?: boolean
    sku?: boolean
    discount?: boolean
    specs?: boolean
    // tambahkan field lain jika perlu
  }
}

interface Variant {
  name: string
  options: VariantOption[]
}

interface Product {
  id?: string
  name: string
  description: string
  category: string[]
  price: number
  stock: number
  brand: string
  features: string[]
  images: string[]
  discount?: Discount
  specs?: Spec[]
  variants?: Variant[]
  tags?: string[]
  rating?: { average: number; count: number }
  status?: string
  isFeatured?: boolean
  warehouseLocation?: string
  sku?: string
  createdAt?: any
  updatedAt?: any
}

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: FormData) => Promise<void>
  product?: Product | null
}

export function ProductModal({ isOpen, onClose, onSubmit, product }: ProductModalProps) {
  const [formData, setFormData] = useState<Product>({
    name: "",
    description: "",
    category: [],
    price: 0,
    stock: 0,
    brand: "",
    features: [],
    images: [],
    discount: { percent: 0, priceAfterDiscount: 0 },
    specs: [],
    variants: [],
    tags: [],
    rating: { average: 0, count: 0 },
    status: "active",
    isFeatured: false,
    warehouseLocation: "",
  })
  const [categoryText, setCategoryText] = useState("")
  const [featuresText, setFeaturesText] = useState("")
  const [tagsText, setTagsText] = useState("")
  const [specs, setSpecs] = useState<Spec[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [variantName, setVariantName] = useState("")
  const [variantOptions, setVariantOptions] = useState("")
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const mainImageInputRef = useRef<HTMLInputElement | null>(null)
  const [variantImageInputRefs, setVariantImageInputRefs] = useState<{ [key: string]: React.RefObject<HTMLInputElement> }>({})

  // Discount & rating
  const [discountPercent, setDiscountPercent] = useState(0)
  const [priceAfterDiscount, setPriceAfterDiscount] = useState(0)
  const [ratingAverage, setRatingAverage] = useState(0)
  const [ratingCount, setRatingCount] = useState(0)

  // State untuk gambar per variant option
  const [variantOptionImages, setVariantOptionImages] = useState<{ [key: string]: File[] }>({})
  const [variantOptionPreviews, setVariantOptionPreviews] = useState<{ [key: string]: string[] }>({})

  const MAX_MAIN_IMAGES = 8
  const MAX_VARIANT_IMAGES = 3
  const MAX_TOTAL_IMAGES = 40

  // Helper untuk hitung total semua gambar (utama + varian, baik existing, upload baru, maupun dari backend variant)
  const getTotalImagesCount = () => {
    let count = existingImages.length + selectedImages.length
    Object.values(variantOptionPreviews).forEach(urls => {
      count += urls.length
    })
    return count
  }

  // Helper untuk hitung gambar utama (existing + upload baru)
  const getMainImagesCount = () => existingImages.length + selectedImages.length

  // Helper untuk hitung gambar per varian option
  const getVariantOptionImagesCount = (key: string) => (variantOptionPreviews[key]?.length || 0) + (variantOptionImages[key]?.length || 0)


  useEffect(() => {
    if (product) {
      setFormData({
        ...product,
        category: Array.isArray(product.category) ? product.category : [product.category],
        features: product.features || [],
        tags: product.tags || [],
        specs: product.specs || [],
        variants: product.variants || [],
        images: product.images || [],
        discount: product.discount || { percent: 0, priceAfterDiscount: product.price },
        rating: product.rating || { average: 0, count: 0 },
        status: product.status || "active",
        isFeatured: !!product.isFeatured,
        warehouseLocation: product.warehouseLocation || "",
      })
      setCategoryText((product.category || []).join(", "))
      setFeaturesText((product.features || []).join(", "))
      setTagsText((product.tags || []).join(", "))
      setSpecs(product.specs || [])
      setVariants(
        (product.variants || []).map(variant => ({
          ...variant,
          options: (variant.options || []).map(opt => ({
            ...opt,
            useDefault: {
              price: opt.useDefault?.price ?? true,
              stock: opt.useDefault?.stock ?? true,
              sku: opt.useDefault?.sku ?? true,
              discount: opt.useDefault?.discount ?? true,
              specs: opt.useDefault?.specs ?? true,
            }
          }))
        }))
      )
      setDiscountPercent(product.discount?.percent || 0)
      setPriceAfterDiscount(product.discount?.priceAfterDiscount || product.price)
      setRatingAverage(product.rating?.average || 0)
      setRatingCount(product.rating?.count || 0)
      setExistingImages(product.images || [])
      setSelectedImages([])
      setNewImagePreviews([])
      // Mapping images dari backend ke preview variant
      const previews: { [key: string]: string[] } = {}
      if (product.variants) {
        product.variants.forEach((variant, vIdx) => {
          if (Array.isArray(variant.options)) {
            variant.options.forEach((option, oIdx) => {
              const key = `${vIdx}_${oIdx}`
              if (typeof option === "object" && Array.isArray(option.images)) {
                previews[key] = option.images
              }
            })
          }
        })
      }
      setVariantOptionImages({})
      setVariantOptionPreviews(previews)
    } else {
      setFormData({
        name: "",
        description: "",
        category: [],
        price: 0,
        stock: 0,
        brand: "",
        features: [],
        images: [],
        discount: { percent: 0, priceAfterDiscount: 0 },
        specs: [],
        variants: [],
        tags: [],
        rating: { average: 0, count: 0 },
        status: "active",
        isFeatured: false,
        warehouseLocation: "",
      })
      setCategoryText("")
      setFeaturesText("")
      setTagsText("")
      setSpecs([])
      setVariants([])
      setDiscountPercent(0)
      setPriceAfterDiscount(0)
      setRatingAverage(0)
      setRatingCount(0)
      setExistingImages([])
      setSelectedImages([])
      setNewImagePreviews([])
      setVariantOptionImages({})
      setVariantOptionPreviews({})
    }
  }, [product, isOpen])

  useEffect(() => {
    // Buat ref untuk setiap variant option key
    const refs: { [key: string]: React.RefObject<HTMLInputElement> } = {}
    variants.forEach((variant, vIdx) => {
      if (Array.isArray(variant.options)) {
        variant.options.forEach((_, oIdx) => {
          const key = `${vIdx}_${oIdx}`
          refs[key] = variantImageInputRefs[key] || React.createRef<HTMLInputElement>()
        })
      }
    })
    setVariantImageInputRefs(refs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variants])

  // Image handlers (utama)
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (getMainImagesCount() + files.length > MAX_MAIN_IMAGES) {
      alert(`Maximum ${MAX_MAIN_IMAGES} main images allowed`)
      return
    }
    if (getTotalImagesCount() + files.length > MAX_TOTAL_IMAGES) {
      alert(`Maximum ${MAX_TOTAL_IMAGES} images allowed (main + all variants)`)
      return
    }
    const compressedFiles: File[] = []
    const previewUrls: string[] = []
    for (const file of files) {
      try {
        const Compressor = (await import("compressorjs")).default
        const compressedFile = await new Promise<File>((resolve, reject) => {
          new Compressor(file, {
            quality: 0.8,
            maxWidth: 1200,
            maxHeight: 1200,
            success: (result: File | Blob) => {
              if (result instanceof File) {
                resolve(result)
              } else {
                // Convert Blob to File
                resolve(new File([result], file.name, { type: result.type }))
              }
            },
            error: reject,
          })
        })
        compressedFiles.push(compressedFile)
        previewUrls.push(URL.createObjectURL(compressedFile))
      } catch (error) {
        alert(`Error compressing ${file.name}`)
      }
    }
    setSelectedImages((prev) => [...prev, ...compressedFiles])
    setNewImagePreviews((prev) => [...prev, ...previewUrls])
  }
  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index))
  }
  const removeNewImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index)) // Hapus dari selectedImages
    setNewImagePreviews((prev) => {
      const url = prev[index]
      if (url?.startsWith("blob:")) {
        URL.revokeObjectURL(url)
      }
      return prev.filter((_, i) => i !== index)
    })
    // Reset input file agar bisa pilih file yang sama lagi
    if (mainImageInputRef.current) {
      mainImageInputRef.current.value = ""
    }
  }


  // Ensure removed images are not uploaded
  useEffect(() => {
    // Sync selectedImages and newImagePreviews length
    if (selectedImages.length !== newImagePreviews.length) {
      // If mismatch, trim selectedImages to match newImagePreviews
      setSelectedImages((prev) => prev.slice(0, newImagePreviews.length))
    }
  }, [newImagePreviews])

  // Cleanup function for object URLs
  useEffect(() => {
    return () => {
      newImagePreviews.forEach((url) => {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url)
        }
      })
      Object.values(variantOptionPreviews).forEach(urls => {
        urls.forEach(url => {
          if (url.startsWith("blob:")) {
            URL.revokeObjectURL(url)
          }
        })
      })
    }
  }, [newImagePreviews, variantOptionPreviews])

  // Image handlers (per variant option)
  const handleVariantOptionImageSelect = async (
    vIdx: number,
    oIdx: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || [])
    const key = `${vIdx}_${oIdx}`
    if (getVariantOptionImagesCount(key) + files.length > MAX_VARIANT_IMAGES) {
      alert(`Maximum ${MAX_VARIANT_IMAGES} images allowed for this variant option`)
      return
    }
    if (getTotalImagesCount() + files.length > MAX_TOTAL_IMAGES) {
      alert(`Maximum ${MAX_TOTAL_IMAGES} images allowed (main + all variants)`)
      return
    }
    const compressedFiles: File[] = []
    const previewUrls: string[] = []
    for (const file of files) {
      try {
        const Compressor = (await import("compressorjs")).default
        const compressedFile = await new Promise<File>((resolve, reject) => {
          new Compressor(file, {
            quality: 0.8,
            maxWidth: 1200,
            maxHeight: 1200,
            success: (result: File | Blob) => {
              if (result instanceof File) {
                resolve(result)
              } else {
                // Convert Blob to File
                resolve(new File([result], file.name, { type: result.type }))
              }
            },
            error: reject,
          })
        })
        compressedFiles.push(compressedFile)
        previewUrls.push(URL.createObjectURL(compressedFile))
      } catch (error) {
        alert(`Error compressing ${file.name}`)
      }
    }
    setVariantOptionImages((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), ...compressedFiles],
    }))
    setVariantOptionPreviews((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), ...previewUrls],
    }))
  }

  const removeVariantOptionImage = (vIdx: number, oIdx: number, imgIdx: number) => {
    const key = `${vIdx}_${oIdx}`;
    setVariantOptionPreviews((prev) => {
      const urls = prev[key] || [];
      const url = urls[imgIdx];
      if (url?.startsWith("blob:")) {
        // Hapus file pada index yang sama di variantOptionImages
        setVariantOptionImages((prevFiles) => {
          const files = prevFiles[key] || [];
          // Hapus file pada posisi imgIdx, hanya jika jumlah files sama dengan jumlah blob di previews
          // Hitung index file yang sesuai dengan imgIdx pada previews yang blob
          let blobIdx = -1;
          for (let i = 0, b = 0; i < urls.length; i++) {
            if (urls[i].startsWith("blob:")) {
              if (i === imgIdx) {
                blobIdx = b;
                break;
              }
              b++;
            }
          }
          if (blobIdx !== -1) {
            return {
              ...prevFiles,
              [key]: files.filter((_, i) => i !== blobIdx),
            };
          }
          return prevFiles;
        });
        URL.revokeObjectURL(url);
      }
      return {
        ...prev,
        [key]: urls.filter((_, i) => i !== imgIdx),
      };
    });
    // Reset input file agar bisa pilih file yang sama lagi
    if (variantImageInputRefs[key]?.current) {
      variantImageInputRefs[key].current.value = "";
    }
  };



  // Remove backend variant image (for preview only)
  const removeBackendVariantImage = (vIdx: number, oIdx: number, url: string) => {
    const key = `${vIdx}_${oIdx}`
    // Hapus dari preview
    setVariantOptionPreviews(prev => ({
      ...prev,
      [key]: (prev[key] || []).filter(u => u !== url)
    }))
    // Hapus dari variants state (biar tidak dikirim ke backend)
    setVariants(prevVariants =>
      prevVariants.map((variant, vi) =>
        vi !== vIdx
          ? variant
          : {
            ...variant,
            options: variant.options.map((option, oi) => {
              if (oi !== oIdx) return option
              if (typeof option === "object" && Array.isArray(option.images)) {
                return {
                  ...option,
                  images: option.images.filter(img => img !== url)
                }
              }
              return option
            })
          }
      )
    )
  }

  // Specs
  const addSpec = () => setSpecs([...specs, { key: "", value: "" }])
  const updateSpec = (idx: number, key: string, value: string) => {
    setSpecs(specs.map((s, i) => (i === idx ? { key, value } : s)))
  }
  const removeSpec = (idx: number) => setSpecs(specs.filter((_, i) => i !== idx))

  // Variants
  const addVariant = () => {
    if (!variantName) return
    const optionValues = variantOptions
      .split(",")
      .map(o => o.trim())
      .filter(Boolean)
    setVariants([
      ...variants,
      {
        name: variantName,
        options: optionValues.map(optionValue => ({
          value: optionValue,
          images: [],
          price: undefined,
          stock: undefined,
          sku: "",
          discount: { percent: undefined, priceAfterDiscount: undefined },
          specs: [],
          useDefault: {
            price: true,
            stock: true,
            sku: false,
            discount: true,
            specs: true,
          }
        })),
      }
    ])
    setVariantName("")
    setVariantOptions("")
  }
  const removeVariant = (idx: number) => setVariants(variants.filter((_, i) => i !== idx))

  // Tambahkan fungsi untuk menambah option pada variant
  const addVariantOption = (vIdx: number, value: string) => {
    setVariants(variants =>
      variants.map((variant, i) =>
        i === vIdx
          ? {
            ...variant,
            options: [
              ...variant.options,
              {
                value,
                images: [],
                price: undefined,
                stock: undefined,
                sku: "",
                discount: { percent: undefined, priceAfterDiscount: undefined },
                specs: [],
                useDefault: {
                  price: true,
                  stock: true,
                  sku: true,
                  discount: true,
                  specs: true,
                }
              },
            ],
          }
          : variant
      )
    )
  }

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const categoryArr = categoryText.split(",").map(c => c.trim()).filter(Boolean)
      const featuresArr = featuresText.split(",").map(f => f.trim()).filter(Boolean)
      const tagsArr = tagsText.split(",").map(t => t.trim()).filter(Boolean)

      // Siapkan variants tanpa blob url di images
      const variantsFinal = variants.map((variant, vIdx) => ({
        ...variant,
        options: variant.options.map((option, oIdx) => {
          // Filter images: hanya url backend (bukan blob)
          const backendImages = (option.images || []).filter(url => !url.startsWith("blob:"))
          return {
            ...option,
            images: backendImages,
            price: option.useDefault?.price ? formData.price : option.price,
            stock: option.useDefault?.stock ? formData.stock : option.stock,
            sku: option.useDefault?.sku ? (formData as any).sku : option.sku,
            discount: option.useDefault?.discount ? { ...formData.discount } : option.discount,
            specs: option.useDefault?.specs ? specs : option.specs,
          }
        })
      }))


      const productData: Product = {
        ...formData,
        category: categoryArr,
        features: featuresArr,
        tags: tagsArr,
        specs,
        variants: variantsFinal,
        discount: { percent: discountPercent, priceAfterDiscount: priceAfterDiscount },
        rating: { average: ratingAverage, count: ratingCount },
        // Penting: Jangan sertakan newImagePreviews di sini, karena ini akan dikirim sebagai File terpisah
        // images: [...existingImages, ...newImagePreviews], // Hapus baris ini
        images: existingImages, // Hanya sertakan existing images dari backend
        price: Number(formData.price),
        stock: Number(formData.stock),
        isFeatured: !!formData.isFeatured,
      }
      if (!productData.name || !productData.description || !productData.brand || !productData.category.length) {
        alert("Name, Description, Brand, and Category are required.")
        setIsSubmitting(false)
        return
      }
      const formDataToSend = new FormData()
      console.log(productData.variants)
      formDataToSend.append("data", JSON.stringify(productData))
      // Main images
      selectedImages.forEach((file) => {
        formDataToSend.append("images", file, file.name)
      })
      // Variant images: masukkan ke FormData dengan fieldname variant_{vIdx}_{oIdx}_images
      Object.entries(variantOptionImages).forEach(([key, files]) => {
        files.forEach((file) => {
          formDataToSend.append(`variant_${key}_images`, file, file.name)
        })
      })

      // --- PENTING: Revoke Object URLs sebelum submit ---
      newImagePreviews.forEach(url => {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
      Object.values(variantOptionPreviews).forEach(urls => {
        urls.forEach(url => {
          if (url.startsWith("blob:")) {
            URL.revokeObjectURL(url);
          }
        });
      });
      // Setelah revoke, kosongkan state preview agar tidak ada referensi lagi
      setNewImagePreviews([]);
      setVariantOptionPreviews({});
      // -------------------------------------------------

      await onSubmit(formDataToSend)
      onClose()
    } catch (error) {
      alert("Error submitting product.")
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    setVariants(variants =>
      variants.map(variant => ({
        ...variant,
        options: (variant.options || []).map(opt => {
          const base = typeof opt === "string"
            ? {
              value: opt,
              images: [],
              price: undefined,
              stock: undefined,
              sku: "",
              discount: { percent: undefined, priceAfterDiscount: undefined },
              specs: [],
            }
            : {
              value: opt.value,
              images: opt.images || [],
              price: opt.price,
              stock: opt.stock,
              sku: opt.sku || "",
              discount: opt.discount || { percent: undefined, priceAfterDiscount: undefined },
              specs: opt.specs || [],
            }
          return {
            ...base,
            useDefault: {
              price: opt.useDefault?.price ?? true,
              stock: opt.useDefault?.stock ?? true,
              sku: opt.useDefault?.sku ?? true,
              discount: opt.useDefault?.discount ?? true,
              specs: opt.useDefault?.specs ?? true,
            }
          }
        }),
      }))
    )
    // eslint-disable-next-line
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Add New Product"}</DialogTitle>
          <DialogDescription>
            {product ? "Update the product information below." : "Enter the details for the new product."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name *</Label>
              <Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="col-span-3" required disabled={isSubmitting} />
            </div>
            {/* Description */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">Description *</Label>
              <Textarea id="description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="col-span-3" rows={3} required disabled={isSubmitting} />
            </div>
            {/* Brand */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="brand" className="text-right">Brand *</Label>
              <Input id="brand" value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} className="col-span-3" required disabled={isSubmitting} />
            </div>
            {/* Category */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">Category *</Label>
              <Input id="category" value={categoryText} onChange={e => setCategoryText(e.target.value)} className="col-span-3" required disabled={isSubmitting} placeholder="e.g. Smartphone, Elektronik" />
            </div>
            {/* Price */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">Price *</Label>
              <Input id="price" type="number" min="0" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} className="col-span-3" required disabled={isSubmitting} />
            </div>
            {/* Discount */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="discount" className="text-right">Discount (%)</Label>
              <Input id="discount" type="number" min="0" max="100" value={discountPercent} onChange={e => {
                const val = Number(e.target.value)
                setDiscountPercent(val)
                setPriceAfterDiscount(formData.price - (formData.price * val / 100))
              }} className="col-span-1" disabled={isSubmitting} />
              <Label htmlFor="priceAfterDiscount" className="text-right">Price After Discount</Label>
              <Input id="priceAfterDiscount" type="number" min="0" value={priceAfterDiscount} onChange={e => setPriceAfterDiscount(Number(e.target.value))} className="col-span-1" disabled={isSubmitting} />
            </div>
            {/* Stock */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stock" className="text-right">Stock *</Label>
              <Input id="stock" type="number" min="0" value={formData.stock} onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })} className="col-span-3" required disabled={isSubmitting} />
            </div>
            {/* Features */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="features" className="text-right pt-2">Features</Label>
              <Textarea id="features" value={featuresText} onChange={e => setFeaturesText(e.target.value)} placeholder="Enter features separated by commas" rows={2} className="col-span-3" disabled={isSubmitting} />
            </div>
            {/* Tags */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="tags" className="text-right pt-2">Tags</Label>
              <Textarea id="tags" value={tagsText} onChange={e => setTagsText(e.target.value)} placeholder="Enter tags separated by commas" rows={2} className="col-span-3" disabled={isSubmitting} />
            </div>
            {/* Warehouse Location */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="warehouseLocation" className="text-right">Warehouse Location</Label>
              <Input id="warehouseLocation" value={formData.warehouseLocation} onChange={e => setFormData({ ...formData, warehouseLocation: e.target.value })} className="col-span-3" disabled={isSubmitting} />
            </div>
            {/* Status & isFeatured */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">Status</Label>
              <select id="status" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="col-span-1" disabled={isSubmitting}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <Label htmlFor="isFeatured" className="text-right">Featured</Label>
              <input id="isFeatured" type="checkbox" checked={!!formData.isFeatured} onChange={e => setFormData({ ...formData, isFeatured: e.target.checked })} className="col-span-1" disabled={isSubmitting} />
            </div>
            {/* Rating */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ratingAverage" className="text-right">Rating Avg</Label>
              <Input id="ratingAverage" type="number" min="0" max="5" step="0.1" value={ratingAverage} onChange={e => setRatingAverage(Number(e.target.value))} className="col-span-1" disabled={isSubmitting} />
              <Label htmlFor="ratingCount" className="text-right">Rating Count</Label>
              <Input id="ratingCount" type="number" min="0" value={ratingCount} onChange={e => setRatingCount(Number(e.target.value))} className="col-span-1" disabled={isSubmitting} />
            </div>
            {/* Specs */}
            <div>
              <Label>Specs</Label>
              {specs.map((spec, idx) => (
                <div key={idx} className="flex gap-2 mb-1">
                  <Input placeholder="Key" value={spec.key} onChange={e => updateSpec(idx, e.target.value, spec.value)} className="w-1/3" disabled={isSubmitting} />
                  <Input placeholder="Value" value={spec.value} onChange={e => updateSpec(idx, spec.key, e.target.value)} className="w-1/2" disabled={isSubmitting} />
                  <Button type="button" variant="outline" onClick={() => removeSpec(idx)} disabled={isSubmitting}>Remove</Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addSpec} disabled={isSubmitting}>Add Spec</Button>
            </div>
            {/* Variants */}
            <div>
              <Label>Variants</Label>
              {variants.map((variant, vIdx) => (
                <div key={vIdx} className="mb-2 border rounded p-2">
                  <div className="flex gap-2 mb-1">
                    <Input placeholder="Name" value={variant.name} onChange={e => setVariants(variants.map((v, i) => i === vIdx ? { ...v, name: e.target.value } : v))} className="w-1/3" disabled={isSubmitting} />
                    <Input
                      placeholder="Options (comma separated)"
                      value={variant.options.map(opt => typeof opt === "string" ? opt : opt.value).join(", ")}
                      onChange={e =>
                        setVariants(variants.map((v, i) =>
                          i === vIdx
                            ? {
                              ...v,
                              options: e.target.value
                                .split(",")
                                .map(o => o.trim())
                                .filter(Boolean)
                                .map(optionValue => ({
                                  value: optionValue,
                                  images: [],
                                  price: undefined,
                                  stock: undefined,
                                  sku: "",
                                  discount: { percent: undefined, priceAfterDiscount: undefined },
                                  specs: [],
                                })),
                            }
                            : v
                        ))
                      }
                      className="w-1/2"
                      disabled={isSubmitting}
                    />
                    <Button type="button" variant="outline" onClick={() => removeVariant(vIdx)} disabled={isSubmitting}>Remove</Button>
                  </div>
                  {/* Untuk setiap option, tampilkan input file & preview */}
                  {variant.options.map((option, oIdx) => {
                    const labelText = typeof option === "string" ? option : option.value
                    const key = `${vIdx}_${oIdx}`
                    const backendImages = typeof option === "object" && Array.isArray(option.images) ? option.images : []
                    const allPreviews = [
                      ...(variantOptionPreviews[key] || []),
                      ...backendImages.filter(img => !(variantOptionPreviews[key] || []).includes(img))
                    ]
                    return (
                      <div key={oIdx} className="mb-4 ml-4 border rounded p-2 bg-gray-50">
                        <div className="flex items-center gap-2 mb-2">
                          <Label className="w-24">Value</Label>
                          <Input
                            value={option.value}
                            onChange={e =>
                              setVariants(variants =>
                                variants.map((v, vi) =>
                                  vi === vIdx
                                    ? {
                                      ...v,
                                      options: v.options.map((opt, oi) =>
                                        oi === oIdx ? { ...opt, value: e.target.value } : opt
                                      ),
                                    }
                                    : v
                                )
                              )
                            }
                            className="w-1/2"
                            disabled={isSubmitting}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              setVariants(variants =>
                                variants.map((v, vi) =>
                                  vi === vIdx
                                    ? { ...v, options: v.options.filter((_, oi) => oi !== oIdx) }
                                    : v
                                )
                              )
                            }
                            disabled={isSubmitting}
                          >
                            Remove Option
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <Label>Price</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={
                                  option.useDefault?.price
                                    ? (formData.price !== undefined ? formData.price : "") // fallback ke "" jika undefined
                                    : (option.price !== undefined ? option.price : "")
                                }
                                onChange={e =>
                                  setVariants(variants =>
                                    variants.map((v, vi) =>
                                      vi === vIdx
                                        ? {
                                          ...v,
                                          options: v.options.map((opt, oi) =>
                                            oi === oIdx
                                              ? { ...opt, price: e.target.value ? Number(e.target.value) : undefined }
                                              : opt
                                          ),
                                        }
                                        : v
                                    )
                                  )
                                }
                                disabled={isSubmitting || option.useDefault?.price}
                              />
                              <label className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={option.useDefault?.price ?? true}
                                  onChange={e =>
                                    setVariants(variants =>
                                      variants.map((v, vi) =>
                                        vi === vIdx
                                          ? {
                                            ...v,
                                            options: v.options.map((opt, oi) =>
                                              oi === oIdx
                                                ? { ...opt, useDefault: { ...opt.useDefault, price: e.target.checked } }
                                                : opt
                                            ),
                                          }
                                          : v
                                      )
                                    )
                                  }
                                  disabled={isSubmitting}
                                />
                                <span className="text-xs">Samakan dengan data produk</span>
                              </label>
                            </div>
                          </div>
                          <div>
                            <Label>Stock</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={
                                  option.useDefault?.stock
                                    ? (formData.stock !== undefined ? formData.stock : "") // fallback ke "" jika undefined
                                    : (option.stock !== undefined ? option.stock : "")
                                }
                                onChange={e =>
                                  setVariants(variants =>
                                    variants.map((v, vi) =>
                                      vi === vIdx
                                        ? {
                                          ...v,
                                          options: v.options.map((opt, oi) =>
                                            oi === oIdx
                                              ? { ...opt, stock: e.target.value ? Number(e.target.value) : undefined }
                                              : opt
                                          ),
                                        }
                                        : v
                                    )
                                  )
                                }
                                disabled={isSubmitting || option.useDefault?.stock}
                              />
                              <label className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={option.useDefault?.stock ?? true}
                                  onChange={e =>
                                    setVariants(variants =>
                                      variants.map((v, vi) =>
                                        vi === vIdx
                                          ? {
                                            ...v,
                                            options: v.options.map((opt, oi) =>
                                              oi === oIdx
                                                ? { ...opt, useDefault: { ...opt.useDefault, stock: e.target.checked } }
                                                : opt
                                            ),
                                          }
                                          : v
                                      )
                                    )
                                  }
                                  disabled={isSubmitting}
                                />
                                <span className="text-xs">Samakan dengan data produk</span>
                              </label>
                            </div>
                          </div>
                          <div>
                            <Label>SKU</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                value={
                                  option.useDefault?.sku
                                    ? formData.sku || "" // ambil dari produk utama
                                    : option.sku || ""
                                }
                                onChange={e =>
                                  setVariants(variants =>
                                    variants.map((v, vi) =>
                                      vi === vIdx
                                        ? {
                                          ...v,
                                          options: v.options.map((opt, oi) =>
                                            oi === oIdx
                                              ? { ...opt, sku: e.target.value }
                                              : opt
                                          ),
                                        }
                                        : v
                                    )
                                  )
                                }
                                disabled={isSubmitting || option.useDefault?.sku}
                              />
                              <label className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={option.useDefault?.sku ?? true}
                                  onChange={e =>
                                    setVariants(variants =>
                                      variants.map((v, vi) =>
                                        vi === vIdx
                                          ? {
                                            ...v,
                                            options: v.options.map((opt, oi) =>
                                              oi === oIdx
                                                ? { ...opt, useDefault: { ...opt.useDefault, sku: e.target.checked } }
                                                : opt
                                            ),
                                          }
                                          : v
                                      )
                                    )
                                  }
                                  disabled={isSubmitting}
                                />
                                <span className="text-xs">Samakan dengan data produk</span>
                              </label>
                            </div>
                          </div>
                          <div>
                            <Label>Discount (%)</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={
                                  option.useDefault?.discount
                                    ? (formData.discount?.percent !== undefined ? formData.discount.percent : "")
                                    : (option.discount?.percent !== undefined ? option.discount.percent : "")
                                }
                                onChange={e =>
                                  setVariants(variants =>
                                    variants.map((v, vi) =>
                                      vi === vIdx
                                        ? {
                                          ...v,
                                          options: v.options.map((opt, oi) =>
                                            oi === oIdx
                                              ? {
                                                ...opt,
                                                discount: {
                                                  ...opt.discount,
                                                  percent: e.target.value ? Number(e.target.value) : undefined,
                                                  priceAfterDiscount:
                                                    (opt.price ?? formData.price) && e.target.value
                                                      ? (opt.price ?? formData.price) - ((opt.price ?? formData.price) * Number(e.target.value)) / 100
                                                      : undefined,
                                                },
                                              }
                                              : opt
                                          ),
                                        }
                                        : v
                                    )
                                  )
                                }
                                disabled={isSubmitting || option.useDefault?.discount}
                              />
                              <label className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={option.useDefault?.discount ?? true}
                                  onChange={e =>
                                    setVariants(variants =>
                                      variants.map((v, vi) =>
                                        vi === vIdx
                                          ? {
                                            ...v,
                                            options: v.options.map((opt, oi) =>
                                              oi === oIdx
                                                ? { ...opt, useDefault: { ...opt.useDefault, discount: e.target.checked } }
                                                : opt
                                            ),
                                          }
                                          : v
                                      )
                                    )
                                  }
                                  disabled={isSubmitting}
                                />
                                <span className="text-xs">Samakan dengan data produk</span>
                              </label>
                            </div>
                          </div>
                          <div>
                            <Label>Price After Discount</Label>
                            <Input
                              type="number"
                              value={
                                option.useDefault?.discount
                                  ? (formData.discount?.priceAfterDiscount ?? "")
                                  : (option.discount?.priceAfterDiscount ?? "")
                              }
                              onChange={e =>
                                setVariants(variants =>
                                  variants.map((v, vi) =>
                                    vi === vIdx
                                      ? {
                                        ...v,
                                        options: v.options.map((opt, oi) =>
                                          oi === oIdx
                                            ? {
                                              ...opt,
                                              discount: {
                                                ...opt.discount,
                                                priceAfterDiscount: e.target.value ? Number(e.target.value) : undefined,
                                              },
                                            }
                                            : opt
                                        ),
                                      }
                                      : v
                                  )
                                )
                              }
                              disabled={isSubmitting || option.useDefault?.discount}
                            />
                          </div>
                        </div>
                        {/* Specs */}
                        <div className="mb-2">
                          <Label>Specs</Label>
                          <div className="flex items-center gap-2 mb-2">
                            <label className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={option.useDefault?.specs ?? true}
                                onChange={e =>
                                  setVariants(variants =>
                                    variants.map((v, vi) =>
                                      vi === vIdx
                                        ? {
                                          ...v,
                                          options: v.options.map((opt, oi) =>
                                            oi === oIdx
                                              ? { ...opt, useDefault: { ...opt.useDefault, specs: e.target.checked } }
                                              : opt
                                          ),
                                        }
                                        : v
                                    )
                                  )
                                }
                                disabled={isSubmitting}
                              />
                              <span className="text-xs">Samakan dengan data produk</span>
                            </label>
                          </div>
                          {(option.useDefault?.specs ? (specs ?? []) : (option.specs ?? [])).map((spec, sIdx) => (
                            <div key={sIdx} className="flex gap-2 mb-1">
                              <Input
                                placeholder="Key"
                                value={spec.key}
                                onChange={e =>
                                  setVariants(variants =>
                                    variants.map((v, vi) =>
                                      vi === vIdx
                                        ? {
                                          ...v,
                                          options: v.options.map((opt, oi) =>
                                            oi === oIdx
                                              ? {
                                                ...opt,
                                                specs: opt.specs.map((sp, spi) =>
                                                  spi === sIdx ? { ...sp, key: e.target.value } : sp
                                                ),
                                              }
                                              : opt
                                          ),
                                        }
                                        : v
                                    )
                                  )
                                }
                                className="w-1/3"
                                disabled={isSubmitting || option.useDefault?.specs}
                              />
                              <Input
                                placeholder="Value"
                                value={spec.value}
                                onChange={e =>
                                  setVariants(variants =>
                                    variants.map((v, vi) =>
                                      vi === vIdx
                                        ? {
                                          ...v,
                                          options: v.options.map((opt, oi) =>
                                            oi === oIdx
                                              ? {
                                                ...opt,
                                                specs: opt.specs.map((sp, spi) =>
                                                  spi === sIdx ? { ...sp, value: e.target.value } : sp
                                                ),
                                              }
                                              : opt
                                          ),
                                        }
                                        : v
                                    )
                                  )
                                }
                                className="w-1/2"
                                disabled={isSubmitting || option.useDefault?.specs}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                  setVariants(variants =>
                                    variants.map((v, vi) =>
                                      vi === vIdx
                                        ? {
                                          ...v,
                                          options: v.options.map((opt, oi) =>
                                            oi === oIdx
                                              ? {
                                                ...opt,
                                                specs: opt.specs.filter((_, spi) => spi !== sIdx),
                                              }
                                              : opt
                                          ),
                                        }
                                        : v
                                    )
                                  )
                                }
                                disabled={isSubmitting || option.useDefault?.specs}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              setVariants(variants =>
                                variants.map((v, vi) =>
                                  vi === vIdx
                                    ? {
                                      ...v,
                                      options: v.options.map((opt, oi) =>
                                        oi === oIdx
                                          ? {
                                            ...opt,
                                            specs: [...(opt.specs || []), { key: "", value: "" }],
                                          }
                                          : opt
                                      ),
                                    }
                                    : v
                                )
                              )
                            }
                            disabled={isSubmitting || option.useDefault?.specs}
                          >
                            Add Spec
                          </Button>
                        </div>
                        <div className="flex gap-2 items-center flex-wrap">
                          {/* Preview gambar */}
                          {allPreviews.map((url, imgIdx) => {
                            const isUploaded = url.startsWith("blob:")
                            const isBackend = !isUploaded
                            return (
                              <div key={imgIdx} className="relative group w-24 h-24">
                                {/* Label overlay */}
                                <span className="absolute bottom-1 left-1 z-10 bg-black/70 text-white text-xs px-2 py-0.5 rounded shadow">
                                  {variant.name} - {labelText}
                                </span>
                                <img
                                  src={url}
                                  alt={`Variant ${variant.name} ${labelText} ${imgIdx + 1}`}
                                  className="w-full h-full object-cover rounded border border-gray-300 shadow-sm"
                                  style={{ background: "#f3f4f6" }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isUploaded) {
                                      removeVariantOptionImage(vIdx, oIdx, imgIdx)
                                    } else {
                                      removeBackendVariantImage(vIdx, oIdx, url)
                                    }
                                  }}
                                  className={`absolute top-1 right-1 opacity-80 group-hover:opacity-100 transition bg-white border ${isBackend ? "border-red-500 text-red-600 hover:bg-red-500 hover:text-white" : "border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white"} rounded-full w-6 h-6 flex items-center justify-center text-base font-bold shadow`}
                                  disabled={isSubmitting}
                                  title="Remove image"
                                >×</button>
                              </div>
                            )
                          })}
                          {/* Tombol Add Images selalu tampil, di awal jika belum ada gambar */}
                          {(allPreviews.length < MAX_VARIANT_IMAGES) && (
                            <label className="cursor-pointer flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed rounded bg-gray-50 hover:bg-gray-100">
                              <span className="text-3xl text-gray-400">+</span>
                              <span className="text-xs text-gray-500">Add Images</span>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={e => handleVariantOptionImageSelect(vIdx, oIdx, e)}
                                disabled={isSubmitting}
                                ref={variantImageInputRefs[key]}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  <div className="flex justify-end mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setVariants(variants =>
                          variants.map((v, vi) =>
                            vi === vIdx
                              ? {
                                ...v,
                                options: [
                                  ...v.options,
                                  {
                                    value: "",
                                    images: [],
                                    price: undefined,
                                    stock: undefined,
                                    sku: "",
                                    discount: { percent: undefined, priceAfterDiscount: undefined },
                                    specs: [],
                                    useDefault: {
                                      price: true,
                                      stock: true,
                                      sku: true,
                                      discount: true,
                                      specs: true,
                                    }
                                  }
                                ]
                              }
                              : v
                          )
                        )
                      }
                      disabled={isSubmitting}
                    >
                      Tambah Opsi
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 mt-1">
                <Input placeholder="Variant Name" value={variantName} onChange={e => setVariantName(e.target.value)} className="w-1/3" disabled={isSubmitting} />
                <Input placeholder="Options (comma separated)" value={variantOptions} onChange={e => setVariantOptions(e.target.value)} className="w-1/2" disabled={isSubmitting} />
                <Button type="button" variant="outline" onClick={addVariant} disabled={isSubmitting}>Add Variant</Button>
              </div>
            </div>
            {/* Images */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="images" className="text-right pt-2">Images</Label>
              <div className="col-span-3">
                <Input
                  id="images"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageSelect}
                  disabled={isSubmitting}
                  className="mb-2"
                  ref={mainImageInputRef}
                />
                <p className="text-sm text-muted-foreground mb-2">Maximum 40 images total (including variant images). Images will be compressed automatically.</p>
                {existingImages.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Existing Images:</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {existingImages.map((url, index) => (
                        <div key={`existing-${index}`} className="relative">
                          <img src={url || "/placeholder.svg"} alt={`Existing ${index + 1}`} className="w-full h-24 object-cover rounded border border-gray-300 shadow-sm" onError={e => { e.currentTarget.src = "/placeholder.svg?height=80&width=80" }} />
                          <button type="button" onClick={() => removeExistingImage(index)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600" disabled={isSubmitting} title="Remove existing image">×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {newImagePreviews.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">New Images:</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {newImagePreviews.map((url, index) => (
                        <div key={`new-${index}`} className="relative">
                          <img src={url || "/placeholder.svg"} alt={`New ${index + 1}`} className="w-full h-24 object-cover rounded border border-gray-300 shadow-sm" />
                          <button type="button" onClick={() => removeNewImage(index)} className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-blue-600" disabled={isSubmitting} title="Remove new image">×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Preview semua variant images */}
                {Object.keys(variantOptionPreviews).length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Variant Images:</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {Object.entries(variantOptionPreviews).flatMap(([key, urls]) =>
                        urls.map((url, idx) => {
                          // Ambil nama varian dan label option
                          const [vIdx, oIdx] = key.split("_").map(Number)
                          const variant = variants[vIdx]
                          let variantName = variant?.name || ""
                          let optionLabel = ""
                          if (variant && Array.isArray(variant.options)) {
                            const option = variant.options[oIdx]
                            optionLabel = typeof option === "string" ? option : option?.value || ""
                          }
                          return (
                            <div key={`${key}-${idx}`} className="relative group">
                              {/* Label overlay */}
                              <span className="absolute bottom-1 left-1 z-10 bg-black/70 text-white text-xs px-2 py-0.5 rounded shadow">
                                {variantName} - {optionLabel}
                              </span>
                              <img
                                src={url}
                                alt={`Variant ${variantName} ${optionLabel} ${idx + 1}`}
                                className="w-full h-24 object-cover rounded border border-gray-300 shadow-sm"
                                style={{ background: "#f3f4f6" }}
                              />
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Main images: {getMainImagesCount()} / {MAX_MAIN_IMAGES} &nbsp;|&nbsp;
                  Total images: {getTotalImagesCount()} / {MAX_TOTAL_IMAGES}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {product ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>{product ? "Update" : "Create"} Product</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
