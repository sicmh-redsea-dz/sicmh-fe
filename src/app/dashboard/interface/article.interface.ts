export interface Article {
    id: string
    prodDesc: string,
    prodName: string,
    prodQuantity: number,
    prodUnitPrice: number,
    prodPurchasePrice?: number | string | null,
    prodExpirationDate?: string | null,
    prodMinStock: number
}