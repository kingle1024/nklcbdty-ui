// LikesResponse.ts
export interface Product_mst {
  id: number;
  title: string;
  url: string;
  regionTitle: string; 
}

export interface LikesResponse {
  product: Product_mst[];
}