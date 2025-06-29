"use client"

import { Label } from "@/components/ui/label"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Edit, Trash2, Loader2, Upload, Star } from "lucide-react"
import { ProductModal } from "@/components/product-modal"
import { useApi } from "@/hooks/use-api"

interface Product {
  id: string
  slug: string
  name: string
  description: string
  category: string[] // Array of categories
  tags: string[]
  brand: string
  price: number
  discount: {
    percent: number
    priceAfterDiscount: number
  }
  stock: number
  features: string[]
  specs: Array<{
    key: string
    value: string
  }>
  variants: Array<{
    name: string
    options: string[]
  }>
  images: string[]
  rating: {
    average: number
    count: number
  }
  status: 'active' | 'inactive'
  isFeatured: boolean
  warehouseLocation: string
  createdAt: {
    _seconds: number
    _nanoseconds: number
  }
  updatedAt: {
    _seconds: number
    _nanoseconds: number
  }
}

interface ApiResponse {
  success: boolean
  data: Product[]
}

export function ProductsSection() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedBrand, setSelectedBrand] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [sortField, setSortField] = useState<keyof Product | "">("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)

  const { apiCall } = useApi()

        const apiBaseUrl =
        process.env.NODE_ENV === "development"
          ? "http://localhost:3001"
          : "https://chatbot-rag-9yyy.onrender.com"

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fileType = file.name.split(".").pop()?.toLowerCase()
    if (!["json", "csv"].includes(fileType || "")) {
      setError("Please select a JSON or CSV file")
      return
    }

    setImportFile(file)
  }

  const processImportFile = async () => {
    if (!importFile) return

    setImporting(true)
    try {
      const fileType = importFile.name.split(".").pop()?.toLowerCase()
      const fileContent = await importFile.text()

      let products: any[] = []

      if (fileType === "json") {
        products = JSON.parse(fileContent)
      } else if (fileType === "csv") {
        // Enhanced CSV parser
        const lines = fileContent.split("\n")
        const headers = lines[0].split(",").map((h) => h.trim())

        products = lines
          .slice(1)
          .filter((line) => line.trim())
          .map((line) => {
            const values = line.split(",").map((v) => v.trim())
            const product: any = {}

            headers.forEach((header, index) => {
              if (header === "features" || header === "images" || header === "category" || header === "tags") {
                product[header] = values[index] ? values[index].split(";").map((item) => item.trim()) : []
              } else if (header === "stock" || header === "price") {
                product[header] = Number.parseInt(values[index]) || 0
              } else if (header === "isFeatured") {
                product[header] = values[index]?.toLowerCase() === "true"
              } else {
                product[header] = values[index] || ""
              }
            })

            return product
          })
      }

      // Validate and import products
      for (const productData of products) {
        if (!productData.name || !productData.description || !productData.brand) {
          continue // Skip invalid products
        }

        // Transform data to match backend structure
        const transformedProduct = {
          name: productData.name,
          description: productData.description,
          category: Array.isArray(productData.category) ? productData.category : [productData.category || ''],
          tags: Array.isArray(productData.tags) ? productData.tags : [],
          brand: productData.brand,
          price: Number(productData.price) || 0,
          discount: {
            percent: Number(productData.discountPercent) || 0,
            priceAfterDiscount: Number(productData.priceAfterDiscount) || Number(productData.price) || 0
          },
          stock: Number(productData.stock) || 0,
          features: Array.isArray(productData.features) ? productData.features : [],
          specs: productData.specs || [],
          variants: productData.variants || [],
          images: Array.isArray(productData.images) ? productData.images : [],
          rating: {
            average: Number(productData.ratingAverage) || 0,
            count: Number(productData.ratingCount) || 0
          },
          status: productData.status || 'active',
          isFeatured: Boolean(productData.isFeatured),
          warehouseLocation: productData.warehouseLocation || ''
        }

        await apiCall(`${apiBaseUrl}/api/products`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(transformedProduct),
        })
      }

      await fetchProducts() // Refresh the list
      setShowImportModal(false)
      setImportFile(null)
      setError(null)
    } catch (err) {
      setError("Error importing products. Please check file format.")
      console.error("Error importing products:", err)
    } finally {
      setImporting(false)
    }
  }

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${apiBaseUrl}/api/products`)
      const data: ApiResponse = await response.json()

      if (data.success) {
        setProducts(data.data)
        setError(null)
      } else {
        setError("Failed to fetch products")
      }
    } catch (err) {
      setError("Error connecting to API")
      console.error("Error fetching products:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  // Get unique categories and brands
  const categories = Array.from(new Set(products.flatMap(p => p.category || [])))
  const brands = Array.from(new Set(products.map(p => p.brand)))

  // Sort and filter products
  const sortedAndFilteredProducts = (() => {
    const filtered = products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = !selectedCategory || product.category.includes(selectedCategory)
      const matchesBrand = !selectedBrand || product.brand === selectedBrand
      return matchesSearch && matchesCategory && matchesBrand
    })

    // Apply sorting
    if (sortField) {
      filtered.sort((a, b) => {
        let aValue: any = a[sortField]
        let bValue: any = b[sortField]

        // Handle price sorting
        if (sortField === "price") {
          aValue = Number(aValue)
          bValue = Number(bValue)
        }

        // Handle category sorting (join array)
        if (sortField === "category") {
          aValue = Array.isArray(aValue) ? aValue.join(", ") : aValue
          bValue = Array.isArray(bValue) ? bValue.join(", ") : bValue
        }

        // Handle string sorting
        if (typeof aValue === "string" && typeof bValue === "string") {
          aValue = aValue.toLowerCase()
          bValue = bValue.toLowerCase()
        }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
        return 0
      })
    }

    return filtered
  })()

  // Calculate pagination
  const totalPages = Math.ceil(sortedAndFilteredProducts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedProducts = sortedAndFilteredProducts.slice(startIndex, startIndex + itemsPerPage)

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedCategory, selectedBrand])

  const handleAddProduct = async (formData: FormData) => {
    try {
      setLoading(true)

      console.log("Sending FormData to API...")
      // Log FormData contents for debugging
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`${key}: File(${value.name}, ${value.size} bytes)`)
        } else {
          console.log(`${key}:`, value)
        }
      }

      const response = await apiCall(`${apiBaseUrl}/api/products`, {
        method: "POST",
        body: formData, // Send FormData directly
      })

      console.log("Response status:", response.status)
      const result = await response.json()
      console.log("Response data:", result)

      if (response.ok && result.success) {
        await fetchProducts() // Refresh the list
        setError(null)
      } else {
        setError(result.message || "Failed to add product")
      }
    } catch (err) {
      console.error("Error adding product:", err)
      setError("Error adding product. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  const handleEditProduct = async (formData: FormData) => {
    if (!editingProduct) return

    try {
      setLoading(true)

      console.log("Updating product with FormData...")
      // Log FormData contents for debugging
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`${key}: File(${value.name}, ${value.size} bytes)`)
        } else {
          console.log(`${key}:`, value)
        }
      }

      const response = await apiCall(`${apiBaseUrl}/api/products/${editingProduct.id}`, {
        method: "PUT",
        body: formData, // Send FormData directly
      })

      console.log("Response status:", response.status)
      const result = await response.json()
      console.log("Response data:", result)

      if (response.ok && result.success) {
        await fetchProducts() // Refresh the list
        setError(null)
      } else {
        setError(result.message || "Failed to update product")
      }
    } catch (err) {
      console.error("Error updating product:", err)
      setError("Error updating product. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product? This action cannot be undone.")) return

    try {
      setLoading(true)
      const response = await apiCall(`${apiBaseUrl}/api/products/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()

      if (response.ok && result.success) {
        await fetchProducts() // Refresh the list
        setError(null)

        // If we're on the last page and it becomes empty, go to previous page
        const newTotalPages = Math.ceil((sortedAndFilteredProducts.length - 1) / itemsPerPage)
        if (currentPage > newTotalPages && newTotalPages > 0) {
          setCurrentPage(newTotalPages)
        }
      } else {
        setError(result.message || "Failed to delete product")
      }
    } catch (err) {
      setError("Error deleting product. Please check your connection.")
      console.error("Error deleting product:", err)
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingProduct(null)
  }

  const formatDate = (timestamp: { _seconds: number; _nanoseconds: number }) => {
    return new Date(timestamp._seconds * 1000).toLocaleDateString()
  }

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { variant: "destructive" as const, text: "Out of Stock" }
    if (stock < 10) return { variant: "secondary" as const, text: "Low Stock" }
    return { variant: "default" as const, text: "In Stock" }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price)
  }

  const handleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
    setCurrentPage(1) // Reset to first page when sorting
  }

  const getSortIcon = (field: keyof Product) => {
    if (sortField !== field) return "≡"
    return sortDirection === "asc" ? "↑" : "↓"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading products...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Products</h2>
          <p className="text-muted-foreground">Manage your product catalog</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
            <Button variant="outline" onClick={fetchProducts} className="mt-2">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Product Management</CardTitle>
          <CardDescription>
            View and manage all products in your catalog ({sortedAndFilteredProducts.length} of {products.length}{" "}
            products)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products, brands, or descriptions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border rounded-md min-w-[120px]"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="px-3 py-2 border rounded-md min-w-[120px]"
            >
              <option value="">All Brands</option>
              {brands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSort("name")}>
                  <div className="flex items-center gap-1">Product {getSortIcon("name")}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSort("brand")}>
                  <div className="flex items-center gap-1">Brand {getSortIcon("brand")}</div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort("category")}
                >
                  <div className="flex items-center gap-1">Category {getSortIcon("category")}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSort("price")}>
                  <div className="flex items-center gap-1">Price {getSortIcon("price")}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50 select-none" onClick={() => handleSort("stock")}>
                  <div className="flex items-center gap-1">Stock {getSortIcon("stock")}</div>
                </TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProducts.map((product) => {
                const stockStatus = getStockStatus(product.stock)
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0] || "/placeholder.svg"}
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded border"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder.svg?height=48&width=48"
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                            <span className="text-gray-400 text-xs">No Image</span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {product.name}
                            {product.isFeatured && <Badge variant="secondary">Featured</Badge>}
                          </div>
                          <div className="text-sm text-muted-foreground truncate max-w-xs">{product.description}</div>
                          {product.discount && product.discount.percent > 0 && (
                            <div className="text-xs text-green-600">
                              {product.discount.percent}% OFF
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{product.brand}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {product.category.slice(0, 2).map((cat, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {cat}
                          </Badge>
                        ))}
                        {product.category.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{product.category.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>
                        {product.discount && product.discount.percent > 0 ? (
                          <>
                            <div className="line-through text-sm text-gray-500">
                              {formatPrice(product.price)}
                            </div>
                            <div className="text-green-600">
                              {formatPrice(product.discount.priceAfterDiscount)}
                            </div>
                          </>
                        ) : (
                          formatPrice(product.price)
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{product.stock}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-sm">
                          {product.rating.average.toFixed(1)} ({product.rating.count})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={stockStatus.variant}>{stockStatus.text}</Badge>
                        <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                          {product.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditModal(product)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteProduct(product.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedAndFilteredProducts.length)} of{" "}
                {sortedAndFilteredProducts.length} products
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {paginatedProducts.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || selectedCategory || selectedBrand ? "No products match your filters" : "No products found"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Import Products</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="import-file">Select File</Label>
                <Input
                  id="import-file"
                  type="file"
                  accept=".json,.csv"
                  onChange={handleFileImport}
                  disabled={importing}
                />
                <p className="text-sm text-muted-foreground mt-1">Supported formats: JSON, CSV</p>
              </div>

              {importFile && (
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-sm">
                    <strong>Selected:</strong> {importFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    CSV format: name,description,category,brand,price,stock,features,images,tags,isFeatured,warehouseLocation
                    <br />
                    Use semicolon (;) to separate multiple values for arrays
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowImportModal(false)
                  setImportFile(null)
                }}
                disabled={importing}
              >
                Cancel
              </Button>
              <Button onClick={processImportFile} disabled={!importFile || importing}>
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  "Import"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ProductModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={editingProduct ? handleEditProduct : handleAddProduct}
        product={editingProduct}
      />
    </div>
  )
}