import api from "@/api/client";
import { parseApiResponse } from "@/lib/api-response";

export interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  precision: number;
}

export const currenciesApi = {
  async list(): Promise<Currency[]> {
    const res = await api.get("currencies");
    const body = await parseApiResponse<Currency[]>(res);
    return (body.data as Currency[]) ?? [];
  },
};
