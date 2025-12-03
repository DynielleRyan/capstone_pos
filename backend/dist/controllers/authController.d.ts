import { Request, Response } from 'express';
export declare const register: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getProfile: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateProfile: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const changePassword: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deactivateAccount: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const confirmUserEmail: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=authController.d.ts.map