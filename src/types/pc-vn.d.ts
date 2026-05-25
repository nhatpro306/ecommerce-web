declare module "@do-kevin/pc-vn" {
  export interface ProvinceItem {
    code: string;
    name: string;
    unit: string;
  }

  export interface DistrictItem {
    code: string;
    name: string;
    unit: string;
    province_code: string;
    province_name: string;
    full_name: string;
  }

  export interface WardItem {
    code: string;
    name: string;
    unit: string;
    district_code: string;
    district_name: string;
    province_code: string;
    province_name: string;
    full_name: string;
  }

  export function getProvinces(): ProvinceItem[];
  export function getDistrictsByProvinceCode(provinceCode: string): DistrictItem[];
  export function getWardsByDistrictCode(districtCode: string): WardItem[];
}
