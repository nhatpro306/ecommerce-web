"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Check, Minus, Plus, RotateCcw, Shield, ShoppingCart, Truck } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";
import { ProductType } from "@/types";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatCurrency";
import { getProductImage } from "@/utils/productImages";
import { useProducts } from "@/hooks/queries";
import { ProductCard } from "@/components/ProductCard";

type ProductDetailsClientProps = {
  product: ProductType;
};

export default function ProductDetailsClient({
  product,
}: ProductDetailsClientProps) {
  const { addToCart } = useCart();
  const { data: allProducts = [] } = useProducts();
  const [quantity, setQuantity] = useState(1);
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");

  const availableSizes = product.sizes?.length
    ? product.sizes
    : ["S", "M", "L", "XL"];
  const availableColors = product.colors?.length
    ? product.colors
    : ["Black", "White", "Gray"];
  const productImage = getProductImage(product);

  const relatedProducts = useMemo(
    () =>
      allProducts
        .filter((item) => item.product_id !== product.product_id)
        .slice(0, 4),
    [allProducts, product.product_id],
  );

  const handleAddToCart = async () => {
    if (!selectedSize || !selectedColor) {
      toast.error("Vui lòng chọn size và màu trước khi thêm vào giỏ hàng.");
      return;
    }

    if (quantity > product.stock) {
      toast.error("Số lượng vượt quá tồn kho hiện tại.");
      return;
    }

    for (let index = 0; index < quantity; index += 1) {
      addToCart(product, { size: selectedSize, color: selectedColor });
    }

    setIsAddedToCart(true);
    window.setTimeout(() => setIsAddedToCart(false), 2000);
    toast.success("Đã thêm vào giỏ hàng.");
  };

  return (
    <div className="bg-white text-zinc-950">
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-10 lg:grid-cols-2">
        <div className="relative aspect-[3/4] overflow-hidden bg-zinc-100">
          <Image
            src={productImage}
            alt={product.title}
            fill
            priority
            className="object-cover"
          />
        </div>

        <div className="flex flex-col justify-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-zinc-500">
            RESEY
          </p>
          <h1 className="text-4xl font-black uppercase leading-none md:text-5xl">
            {product.title}
          </h1>
          <p className="mt-5 text-2xl font-bold">{formatCurrency(product.price)}</p>
          <p className="mt-5 leading-7 text-zinc-600">{product.description}</p>

          <div className="mt-6 border-y border-zinc-200 py-5 text-sm">
            <div className="flex justify-between py-2">
              <span className="font-bold uppercase tracking-[0.14em]">Chất liệu</span>
              <span>{product.material || "Cotton blend"}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="font-bold uppercase tracking-[0.14em]">Tồn kho</span>
              <span>{product.stock > 0 ? `Còn ${product.stock}` : "Hết hàng"}</span>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em]">
                Chọn size
              </h2>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-12 border px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] ${
                      selectedSize === size
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-300 bg-white text-zinc-950 hover:border-zinc-950"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em]">
                Chọn màu
              </h2>
              <div className="flex flex-wrap gap-2">
                {availableColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`border px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] ${
                      selectedColor === color
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-300 bg-white text-zinc-950 hover:border-zinc-950"
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em]">
                Số lượng
              </h2>
              <div className="inline-flex border border-zinc-300">
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  className="flex h-12 w-12 items-center justify-center"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="flex h-12 w-14 items-center justify-center border-x border-zinc-300 text-sm font-bold">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((value) => Math.min(product.stock, value + 1))
                  }
                  className="flex h-12 w-12 items-center justify-center"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <Button
              size="lg"
              className="h-14 w-full cursor-pointer rounded-none bg-zinc-950 text-xs font-bold uppercase tracking-[0.18em] text-white hover:bg-zinc-800"
              disabled={product.stock <= 0}
              onClick={handleAddToCart}
            >
              {isAddedToCart ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Đã thêm vào giỏ
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Thêm vào giỏ - {formatCurrency(product.price * quantity)}
                </>
              )}
            </Button>
          </div>

          <div className="mt-8 grid gap-3 text-sm sm:grid-cols-3">
            {[
              [Truck, "Giao nhanh", "Nội thành 1-2 ngày"],
              [Shield, "Thanh toán", "COD / chuyển khoản"],
              [RotateCcw, "Đổi trả", "Trong vòng 7 ngày"],
            ].map(([Icon, title, description]) => (
              <div key={String(title)} className="border border-zinc-200 p-4">
                <Icon className="mb-3 h-5 w-5" />
                <p className="font-bold uppercase tracking-[0.12em]">{String(title)}</p>
                <p className="mt-1 text-xs text-zinc-500">{String(description)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-6 border-y border-zinc-200 py-8 md:grid-cols-2">
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em]">
              Mô tả sản phẩm
            </h2>
            <p className="mt-4 leading-7 text-zinc-600">{product.description}</p>
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em]">
              Bảng size
            </h2>
            <div className="mt-4 grid grid-cols-4 gap-2 text-sm">
              <div className="font-bold">Size</div>
              <div className="font-bold">Ngực</div>
              <div className="font-bold">Dài áo</div>
              <div className="font-bold">Vai</div>
              <div>S</div>
              <div>52</div>
              <div>68</div>
              <div>48</div>
              <div>M</div>
              <div>54</div>
              <div>70</div>
              <div>50</div>
              <div>L</div>
              <div>56</div>
              <div>72</div>
              <div>52</div>
              <div>XL</div>
              <div>58</div>
              <div>74</div>
              <div>54</div>
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              Đơn vị: cm, sai số 1-2cm.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6 border-b border-zinc-200 pb-4">
          <h2 className="text-2xl font-black uppercase">Sản phẩm liên quan</h2>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
          {relatedProducts.map((item) => (
            <ProductCard key={item.product_id} product={item} />
          ))}
        </div>
      </section>
    </div>
  );
}
