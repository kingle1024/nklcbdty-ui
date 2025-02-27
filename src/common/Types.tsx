export interface ProductDetail {
  id: number;
  title: string;
  url: string;
}

export interface RegionDetail {
  regionCd: string;
  lat: number;
  lng: number;
  title: string;
  rank: number;
}

export interface CommentDetail {
  id: number;
  author: string;
  content: string;
  insertDts: string;
}
export interface CommentFormProps {
  productCd: string;
  addComment: (comment: CommentDetail) => void;
}
export interface CommentProps {
  comments: CommentDetail[];
}
export interface KakaoMapProps {
  regions: RegionDetail[];
}
