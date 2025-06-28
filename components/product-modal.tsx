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
  discount?: { percent: number; priceAfterDiscount: number }
  specs?: { key: string; value: string }[]
  variants?: { name: string; options: (string | { value: string; images?: string[] })[] }[]
  tags?: string[]
  rating?: { average: number; count: number }
  status?: string
  isFeatured?: boolean
  warehouseLocation?: string
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
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>([])
  const [variants, setVariants] = useState<{ name: string; options: (string | { value: string; images?: string[] })[] }[]>([])
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
      setVariants(product.variants || [])
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
            success: resolve,
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
    setSelectedImages((prev) => prev.filter((_, i) => i !== index))
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
            success: resolve,
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
    const key = `${vIdx}_${oIdx}`
    setVariantOptionImages((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((_, i) => i !== imgIdx),
    }))
    setVariantOptionPreviews((prev) => {
      const urls = prev[key] || []
      if (urls[imgIdx]?.startsWith("blob:")) {
        URL.revokeObjectURL(urls[imgIdx])
      }
      return {
        ...prev,
        [key]: urls.filter((_, i) => i !== imgIdx),
      }
    })
    // Reset input file agar bisa pilih file yang sama lagi
    if (variantImageInputRefs[key]?.current) {
      variantImageInputRefs[key].current.value = ""
    }
  }

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
    if (!variantName || !variantOptions) return
    setVariants([
      ...variants,
      {
        name: variantName,
        options: variantOptions.split(",").map(o => o.trim()).filter(Boolean)
      }
    ])
    setVariantName("")
    setVariantOptions("")
  }
  const removeVariant = (idx: number) => setVariants(variants.filter((_, i) => i !== idx))

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const categoryArr = categoryText.split(",").map(c => c.trim()).filter(Boolean)
      const featuresArr = featuresText.split(",").map(f => f.trim()).filter(Boolean)
      const tagsArr = tagsText.split(",").map(t => t.trim()).filter(Boolean)

      // Siapkan variants tanpa blob url di images
      const variantsWithImages = variants.map((variant, vIdx) => ({
        ...variant,
        options: variant.options.map((option, oIdx) => {
          // Hanya masukkan URL backend (bukan blob) ke images, atau kosongkan jika upload baru
          let backendImages: string[] = []
          if (typeof option === "object" && Array.isArray(option.images)) {
            backendImages = option.images.filter(url => !url.startsWith("blob:"))
          }
          return typeof option === "string"
            ? { value: option, images: backendImages }
            : { ...option, images: backendImages }
        })
      }))

      const productData: Product = {
        ...formData,
        category: categoryArr,
        features: featuresArr,
        tags: tagsArr,
        specs,
        variants: variantsWithImages,
        discount: { percent: discountPercent, priceAfterDiscount: priceAfterDiscount },
        rating: { average: ratingAverage, count: ratingCount },
        images: [...existingImages, ...newImagePreviews],
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
      await onSubmit(formDataToSend)
      onClose()
    } catch (error) {
      alert("Error submitting product.")
    } finally {
      setIsSubmitting(false)
    }
  }

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
                    <Input placeholder="Options (comma separated)" value={variant.options.map(opt => typeof opt === "string" ? opt : opt.value).join(", ")} onChange={e => setVariants(variants.map((v, i) => i === vIdx ? { ...v, options: e.target.value.split(",").map(o => o.trim()).filter(Boolean) } : v))} className="w-1/2" disabled={isSubmitting} />
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
                      <div key={oIdx} className="mb-2 ml-4 w-full h-full">
                        <div className="flex items-center gap-2 mb-1">
                          <Label className="w-24">{labelText}</Label>
                          <Input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={e => handleVariantOptionImageSelect(vIdx, oIdx, e)}
                            disabled={isSubmitting}
                            className="w-1/2"
                            ref={variantImageInputRefs[key]}
                          />
                        </div>
                        {allPreviews.length > 0 && (
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                            {allPreviews.map((url, imgIdx) => {
                              const isUploaded = url.startsWith("blob:")
                              const isBackend = !isUploaded
                              return (
                                <div key={imgIdx} className="relative group">
                                  {/* Label overlay */}
                                  <span className="absolute bottom-1 left-1 z-10 bg-black/70 text-white text-xs px-2 py-0.5 rounded shadow">
                                    {variant.name} - {labelText}
                                  </span>
                                  <img
                                    src={url}
                                    alt={`Variant ${variant.name} ${labelText} ${imgIdx + 1}`}
                                    className="w-full h-24 object-cover rounded border border-gray-300 shadow-sm"
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
                          </div>
                        )}
                      </div>
                    )
                  })}
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