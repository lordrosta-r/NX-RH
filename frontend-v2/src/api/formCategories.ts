import client from "./client";
import type { FormCategory } from "../types";

export const formCategoriesApi = {
  getCategories: () =>
    client.get<{ categories: FormCategory[] }>("/api/form-categories"),

  addCategory: (label: string) =>
    client.post<{ categories: FormCategory[] }>("/api/form-categories", {
      label,
    }),

  setCategories: (categories: FormCategory[]) =>
    client.put<{ categories: FormCategory[] }>("/api/form-categories", {
      categories,
    }),
};
