import { Request, Response } from 'express';
export declare const getAllProductItems: (req: Request, res: Response) => Promise<void>;
export declare const getProductItemsByProductId: (req: Request, res: Response) => Promise<void>;
export declare const getProductStock: (req: Request, res: Response) => Promise<void>;
export declare const getAllProductsWithStock: (req: Request, res: Response) => Promise<void>;
export declare const addStock: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateStock: (req: Request, res: Response) => Promise<void>;
export declare const deleteProductItem: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=InventoryController.d.ts.map