"use client";

import { useMemo, useState } from "react";
import { useCart } from "@/context/CartContext";
import { ProductType } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShoppingCart,
  Heart,
  Share2,
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  Truck,
  Shield,
  RotateCcw,
  Check,
} from "lucide-react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { formatCurrency } from "@/utils/formatCurrency";
import { toast } from "sonner";
import { ReviewTab } from "./_components/review-tab";
import { useProducts } from "@/hooks/queries";
import { ProductCard } from "@/components/ProductCard";

type ProductDetailsClientProps = {
  product: ProductType;
};

export default function ProductDetailsClient({ product }: ProductDetailsClientProps) {
  const { addToCart } = useCart();
  const { data: allProducts = [] } = useProducts();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");

  const productImages = product.image
    ? [product.image, product.image, product.image, product.image]
    : ["/placeholder-product.jpg"];

  const relatedProducts = useMemo(
    () =>
      allProducts
        .filter((item) => item.product_id !== product.product_id)
        .slice(0, 4),
    [allProducts, product.product_id],
  );

  const handleAddToCart = async () => {
    if (!selectedSize || !selectedColor) {
      toast.error("Vui long ch?n size va mau tr??c khi them vao gi? hang.");
      return;
    }

    try {
      for (let i = 0; i < quantity; i++) {
        addToCart(product, { size: selectedSize, color: selectedColor });
      }
      setIsAddedToCart(true);
      setTimeout(() => setIsAddedToCart(false), 2000);
    } catch (err) {
      console.error("Error adding to cart:", err);
    }
  };

  const incrementQuantity = () => {
    if (quantity < product.stock) setQuantity(quantity + 1);
  };

  const decrementQuantity = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="bg-muted relative aspect-square overflow-hidden rounded-lg">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedImageIndex}
                  className="relative h-full w-full"
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  {product.image ? (
                    <Image
                      src={productImages[selectedImageIndex]}
                      alt={product.title}
                      fill
                      className="object-contain p-4"
                      loading="eager"
                    />
                  ) : (
                    <div className="bg-muted flex h-full w-full items-center justify-center">
                      <span className="text-muted-foreground text-sm">No image available</span>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {productImages.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-background/80 absolute top-1/2 left-4 -translate-y-1/2 backdrop-blur-sm"
                    onClick={() =>
                      setSelectedImageIndex((prev) => (prev - 1 + productImages.length) % productImages.length)
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-background/80 absolute top-1/2 right-4 -translate-y-1/2 backdrop-blur-sm"
                    onClick={() => setSelectedImageIndex((prev) => (prev + 1) % productImages.length)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}

              <div className="absolute top-4 right-4 flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-background/80 cursor-pointer backdrop-blur-sm"
                  onClick={() => setIsFavorited(!isFavorited)}
                >
                  <Heart className={`h-4 w-4 ${isFavorited ? "fill-red-500 text-red-500" : ""}`} />
                </Button>
                <Button variant="outline" size="icon" className="bg-background/80 cursor-pointer backdrop-blur-sm">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-foreground mb-2 text-3xl font-bold">{product.title}</h1>
              <div className="mb-6 flex items-center gap-3">
                <span className="text-foreground text-3xl font-bold">{formatCurrency(product.price)}</span>
                {product.stock > 0 ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Con hang ({product.stock})
                  </Badge>
                ) : (
                  <Badge variant="destructive">H?t hang</Badge>
                )}
              </div>
            </div>

            <p className="text-muted-foreground leading-relaxed">{product.description}</p>
            <p className="text-sm"><strong>Ch?t li?u:</strong> Cotton Heavyweight 280GSM</p>

            <div className="space-y-4">
              <div>
                <h3 className="mb-3 font-medium">Size</h3>
                <div className="flex flex-wrap gap-2">
                  {["S", "M", "L", "XL"].map((size) => (
                    <Button
                      key={size}
                      type="button"
                      variant={selectedSize === size ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setSelectedSize(size)}
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-medium">Mau</h3>
                <div className="flex flex-wrap gap-2">
                  {["Black", "White", "Gray"].map((color) => (
                    <Button
                      key={color}
                      type="button"
                      variant={selectedColor === color ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setSelectedColor(color)}
                    >
                      {color}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-medium">S? l??ng</h3>
                <div className="flex items-center gap-3">
                  <div className="border-border flex items-center rounded-lg border">
                    <Button variant="ghost" size="icon" onClick={decrementQuantity} disabled={quantity <= 1} className="cursor-pointer">
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="min-w-[60px] px-4 py-2 text-center">{quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={incrementQuantity}
                      disabled={quantity >= product.stock}
                      className="cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <Button size="lg" className="w-full cursor-pointer" disabled={!product.stock || product.stock === 0} onClick={handleAddToCart}>
                {isAddedToCart ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    ?a them vao gi?
                  </>
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Them vao gi? - {formatCurrency(product.price * quantity)}
                  </>
                )}
              </Button>
            </div>

            <div className="border-border grid grid-cols-1 gap-4 border-t pt-6 sm:grid-cols-3">
              <div className="flex items-center gap-3">
                <Truck className="text-primary h-5 w-5" />
                <div>
                  <p className="text-sm font-medium">Giao nhanh</p>
                  <p className="text-muted-foreground text-xs">N?i thanh 1-2 ngay</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="text-primary h-5 w-5" />
                <div>
                  <p className="text-sm font-medium">Thanh toan an toan</p>
                  <p className="text-muted-foreground text-xs">COD / Chuy?n kho?n</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <RotateCcw className="text-primary h-5 w-5" />
                <div>
                  <p className="text-sm font-medium">??i tr? 7 ngay</p>
                  <p className="text-muted-foreground text-xs">Theo chinh sach shop</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="description" className="mb-12">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="description">Mo t?</TabsTrigger>
            <TabsTrigger value="sizechart">B?ng size</TabsTrigger>
            <TabsTrigger value="reviews">?anh gia</TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground mb-4 leading-relaxed">{product.description}</p>
                <p className="text-sm"><strong>Ch?t li?u:</strong> Cotton Heavyweight 280GSM</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sizechart" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div className="font-semibold">Size</div><div className="font-semibold">Ng?c</div><div className="font-semibold">Dai ao</div><div className="font-semibold">Vai</div>
                  <div>S</div><div>52</div><div>68</div><div>48</div>
                  <div>M</div><div>54</div><div>70</div><div>50</div>
                  <div>L</div><div>56</div><div>72</div><div>52</div>
                  <div>XL</div><div>58</div><div>74</div><div>54</div>
                </div>
                <p className="text-muted-foreground mt-3 text-xs">??n v?: cm, sai s? 1-2cm.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <ReviewTab product={product} />
          </TabsContent>
        </Tabs>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">S?n ph?m lien quan</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((item) => (
              <ProductCard key={item.product_id} product={item} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
