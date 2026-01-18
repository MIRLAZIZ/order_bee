// DTO yarating response uchun
export class SaleResponseDto {
  id: number;
  quantity: number;
  selling_price: number;
  // purchase_price: number;
  discount: number;
  total: number;
  paymentType: string;
  createdAt: Date;
  updatedAt: Date;
  product: {
    id: number;
    name: string;
  };
}




export class SaleResponseGetDto {
  id: number;
  quantity: number;
  selling_price: number;
  purchase_price: number;
  discount: number;
  total: number;
  paymentType: string;
  createdAt: Date;
  updatedAt: Date;
  product: {
    id: number;
    name: string;
  };
  user: {
    id: number;
    name: string;
  };
}